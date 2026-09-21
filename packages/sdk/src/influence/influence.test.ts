import {describe, expect, test} from 'bun:test'
import {Checksum256, UInt8, UInt16, UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {ITEM_ORE_T1, ITEM_PLATE, ITEM_CRYSTAL_T1} from '../data/item-ids'
import {categoryIndex} from './categories'
import {
    CHARTER_WORKSHOP_COST,
    DEMAND_TRIPLE_SEED,
    INFLUENCE_ATOMIC_PER_POINT,
    INFLUENCE_D1_SEED,
    NEED_FP_SCALE,
} from './constants'
import {decayActive, normalizeActive} from './decay'
import {
    buildDemand,
    deriveDemand,
    lackingMaskFrom,
    needForCategory,
    pickAcuteCategory,
    popcount5,
} from './demand'
import {findDecomp, DECOMP_REGISTRY} from './decomp'
import {civicDropoffDuration, depotTransferDuration, contributeDuration} from './duration'
import {getStatCount, statsSumSq} from './quality'
import {explainCargoItem, pricingFromWeights, valueCargoItem, valueContribution} from './valuation'
import {getItems} from '../data/catalog'
import {citizenryName, citizenryPatternCount} from './citizenry'
import citizenryAdjectives from '../data/citizenry-adjectives.json'
import citizenryNouns from '../data/citizenry-nouns.json'

const PAR = 213
const WORLD = {x: 56, y: 0}
const packStats = (a: number, b = a, c = a): bigint =>
    BigInt(a) | (BigInt(b) << 10n) | (BigInt(c) << 20n)

const SEED_WEIGHTS_FP = [10000, 10510, 14289, 21964, 32326, 42658, 52913, 61128, 68570, 75380]

const pricing = pricingFromWeights(
    INFLUENCE_D1_SEED,
    Array.from({length: 5}, (_, category) =>
        SEED_WEIGHTS_FP.map((weightFp, i) => ({category, tier: i + 1, weightFp}))
    ).flat()
)

const baseDemand = buildDemand(0, 255, DEMAND_TRIPLE_SEED)

describe('decay', () => {
    test('zero epochs is the identity', () => {
        expect(decayActive(1_000_000n, 0)).toBe(1_000_000n)
    })

    test('one epoch retains 19/20 with a floor', () => {
        expect(decayActive(1_000_000n, 1)).toBe(950_000n)
        expect(decayActive(19n, 1)).toBe(18n)
    })

    test('is path independent', () => {
        const direct = decayActive(123_456_789n, 7)
        const staged = decayActive(decayActive(123_456_789n, 3), 4)
        expect(staged).toBe(direct)
    })

    test('early-exits at zero and clamps the iteration count', () => {
        expect(decayActive(0n, 5_000)).toBe(0n)
        expect(decayActive(1_000_000n, 100_000)).toBe(decayActive(1_000_000n, 1_024))
    })

    test('normalizeActive never decays backwards', () => {
        expect(normalizeActive({active: 1_000n, lastUpdateEpoch: 9}, 4)).toBe(1_000n)
    })
})

describe('quality', () => {
    test('par stats give exactly the quality divisor', () => {
        expect(statsSumSq(packStats(PAR), 3)).toBe(3 * INFLUENCE_D1_SEED)
    })

    test('the retired Workshop falls back to three stats', () => {
        expect(getStatCount(10208)).toBe(3)
    })

    test('a crafted component reports its recipe slot count', () => {
        expect(getStatCount(ITEM_PLATE)).toBe(3)
    })
})

describe('demand', () => {
    test('the lacking mask is the complement over five categories', () => {
        expect(lackingMaskFrom(0b00101)).toBe(0b11010)
        expect(popcount5(0b11010)).toBe(3)
    })

    test('the acute pick indexes the lacking set only', () => {
        const lacking = 0b10010
        expect(pickAcuteCategory(lacking, 0)).toBe(1)
        expect(pickAcuteCategory(lacking, 1)).toBe(4)
        expect(pickAcuteCategory(lacking, 2)).toBe(1)
    })

    test('the triple assigns peak, base and floor', () => {
        const view = buildDemand(0b00001, 1, DEMAND_TRIPLE_SEED)
        expect(needForCategory(view, 0)).toBe(DEMAND_TRIPLE_SEED.floor)
        expect(needForCategory(view, 1)).toBe(DEMAND_TRIPLE_SEED.peak)
        expect(needForCategory(view, 2)).toBe(DEMAND_TRIPLE_SEED.base)
    })

    test('the acute pick rotates with the epoch seed, not the game seed', () => {
        const gameSeed = Checksum256.hash(Buffer.from('game'))
        const coordinates = WORLD
        const picks = new Set<number>()
        for (let i = 0; i < 24; i++) {
            const epochSeed = Checksum256.hash(Buffer.from(`epoch-${i}`))
            picks.add(
                deriveDemand({gameSeed, epochSeed, coordinates, triple: DEMAND_TRIPLE_SEED}).acute
            )
        }
        expect(picks.size).toBeGreaterThan(1)
    })

    test('the composition partition is stable across epochs', () => {
        const gameSeed = Checksum256.hash(Buffer.from('game'))
        const coordinates = WORLD
        const masks = new Set<number>()
        for (let i = 0; i < 8; i++) {
            const epochSeed = Checksum256.hash(Buffer.from(`epoch-${i}`))
            masks.add(
                deriveDemand({gameSeed, epochSeed, coordinates, triple: DEMAND_TRIPLE_SEED})
                    .abundantMask
            )
        }
        expect(masks.size).toBe(1)
    })
})

describe('decomposition', () => {
    test('the registry is sorted by item id and covers every recipe', () => {
        for (let i = 1; i < DECOMP_REGISTRY.length; i++) {
            expect(DECOMP_REGISTRY[i].itemId).toBeGreaterThan(DECOMP_REGISTRY[i - 1].itemId)
        }
        expect(DECOMP_REGISTRY.length).toBe(57)
    })

    test('the retired Workshop has no decomposition entry', () => {
        expect(findDecomp(10208)).toBeUndefined()
    })

    test('buckets are sorted and hold only raw resources', () => {
        const entry = findDecomp(ITEM_PLATE)
        if (!entry) throw new Error('Plate has no decomposition entry')
        expect(entry.processedMass).toBeGreaterThan(0)
        for (let i = 1; i < entry.buckets.length; i++) {
            const prev = entry.buckets[i - 1]
            const cur = entry.buckets[i]
            expect(prev.category < cur.category || prev.tier < cur.tier).toBe(true)
        }
    })
})

describe('explainCargoItem', () => {
    test('factors reproduce valueCargoItem for every valuable catalog item', () => {
        const acute = buildDemand(0, categoryIndex('regolith'), DEMAND_TRIPLE_SEED)
        for (const def of getItems()) {
            if (def.type !== 'resource' && def.type !== 'component') continue
            const item = {itemId: Number(def.id), quantity: 7, stats: packStats(363, 535, 246)}
            const explained = explainCargoItem(item, acute, pricing)
            expect(explained.totalAtomic).toBe(valueCargoItem(item, acute, pricing))
        }
    })

    test('a resource explains mass, weight, quality and need', () => {
        const acute = buildDemand(0, categoryIndex('crystal'), DEMAND_TRIPLE_SEED)
        const explained = explainCargoItem(
            {itemId: ITEM_CRYSTAL_T1, quantity: 5000, stats: packStats(PAR)},
            acute,
            pricing
        )
        if (explained.kind !== 'resource') throw new Error('expected resource')
        expect(explained.mass).toBe(BigInt(getItems().find((i) => Number(i.id) === ITEM_CRYSTAL_T1)!.mass) * 5000n)
        expect(explained.weight).toBe(1)
        expect(explained.quality).toBeCloseTo(1, 6)
        expect(explained.need).toBe(2)
        expect(explained.points).toBeCloseTo(
            Number(explained.mass) / 10 * explained.weight * explained.quality * explained.need,
            3
        )
    })

    test('a component explains raw mass, material weight, quality and effort', () => {
        const explained = explainCargoItem(
            {itemId: ITEM_PLATE, quantity: 3, stats: packStats(PAR)},
            baseDemand,
            pricing
        )
        if (explained.kind !== 'component') throw new Error('expected component')
        const entry = findDecomp(ITEM_PLATE)!
        const raw = entry.buckets.reduce((sum, b) => sum + b.rawMass, 0)
        expect(explained.rawMass).toBe(raw * 3)
        expect(explained.processedMass).toBe(entry.processedMass * 3)
        expect(explained.weight).toBeGreaterThanOrEqual(1)
        expect(explained.baseAtomic + explained.effortAtomic).toBe(explained.totalAtomic)
    })
})

describe('valuation', () => {
    test('a tonne of par T1 ore at base demand is worth exactly one point', () => {
        const value = valueCargoItem(
            {itemId: ITEM_ORE_T1, quantity: 1, stats: packStats(PAR)},
            baseDemand,
            pricing
        )
        expect(value).toBe(BigInt(INFLUENCE_ATOMIC_PER_POINT))
    })

    test('the acute multiplier doubles a resource', () => {
        const acute = buildDemand(0, categoryIndex('crystal'), DEMAND_TRIPLE_SEED)
        const item = {itemId: ITEM_CRYSTAL_T1, quantity: 3, stats: packStats(PAR)}
        expect(valueCargoItem(item, acute, pricing)).toBe(
            valueCargoItem(item, baseDemand, pricing) * 2n
        )
    })

    test('resource valuation is split invariant', () => {
        const one = valueCargoItem(
            {itemId: ITEM_ORE_T1, quantity: 1, stats: packStats(97)},
            baseDemand,
            pricing
        )
        const many = valueCargoItem(
            {itemId: ITEM_ORE_T1, quantity: 137, stats: packStats(97)},
            baseDemand,
            pricing
        )
        expect(many).toBe(one * 137n)
    })

    test('component valuation is split invariant', () => {
        const one = valueCargoItem(
            {itemId: ITEM_PLATE, quantity: 1, stats: packStats(PAR)},
            baseDemand,
            pricing
        )
        const many = valueCargoItem(
            {itemId: ITEM_PLATE, quantity: 40, stats: packStats(PAR)},
            baseDemand,
            pricing
        )
        expect(many).toBe(one * 40n)
    })

    test('components ignore demand entirely', () => {
        const acute = buildDemand(0, categoryIndex('ore'), DEMAND_TRIPLE_SEED)
        const item = {itemId: ITEM_PLATE, quantity: 5, stats: packStats(PAR)}
        expect(valueCargoItem(item, acute, pricing)).toBe(valueCargoItem(item, baseDemand, pricing))
    })

    test('quality scales quadratically within the per-unit floor tolerance', () => {
        const single = valueCargoItem(
            {itemId: ITEM_ORE_T1, quantity: 100, stats: packStats(100)},
            baseDemand,
            pricing
        )
        const doubled = valueCargoItem(
            {itemId: ITEM_ORE_T1, quantity: 100, stats: packStats(200)},
            baseDemand,
            pricing
        )
        const delta = doubled - single * 4n
        expect(delta >= -105n && delta <= 105n).toBe(true)
    })

    test('a bundle totals its rows', () => {
        const bundle = [
            {itemId: ITEM_ORE_T1, quantity: 10, stats: packStats(PAR)},
            {itemId: ITEM_PLATE, quantity: 2, stats: packStats(PAR)},
        ]
        expect(valueContribution(bundle, baseDemand, pricing)).toBe(
            valueCargoItem(bundle[0], baseDemand, pricing) +
                valueCargoItem(bundle[1], baseDemand, pricing)
        )
    })

    test('a packed entity cannot be valued', () => {
        expect(() =>
            valueCargoItem({itemId: 10208, quantity: 1, stats: packStats(PAR)}, baseDemand, pricing)
        ).toThrow()
    })

    test('the Workshop charter costs 200,000 points of hauled par T1 material', () => {
        const perTonne = valueCargoItem(
            {itemId: ITEM_ORE_T1, quantity: 200_000, stats: packStats(PAR)},
            baseDemand,
            pricing
        )
        expect(perTonne).toBe(CHARTER_WORKSHOP_COST)
    })
})

describe('contribution duration', () => {
    test('grows with mass and never falls below a single tick', () => {
        expect(contributeDuration(10)).toBeGreaterThan(0)
        expect(contributeDuration(10_000)).toBeGreaterThan(contributeDuration(10))
    })

    test('splitting a haul costs more than one trip', () => {
        const single = contributeDuration(1_000_000)
        const hundred = contributeDuration(10_000) * 100
        expect(hundred).toBeGreaterThan(single)
    })

    test('ground level is floored at the base orbital climb', () => {
        expect(contributeDuration(10, 0)).toBe(contributeDuration(10, 800))
    })
})

describe('citizenry names', () => {
    const gameSeed = Checksum256.hash(Buffer.from('game'))

    test('is deterministic for a coordinate', () => {
        const a = citizenryName(gameSeed, WORLD)
        const b = citizenryName(gameSeed, WORLD)
        expect(a).toBeDefined()
        expect(a).toBe(b as string)
    })

    test('composes the world name with a known noun', () => {
        const name = citizenryName(gameSeed, WORLD) ?? ''
        expect(name.length).toBeGreaterThan(0)
        expect(citizenryNouns.some((noun) => name.includes(noun))).toBe(true)
    })

    test('spreads across nouns and forms', () => {
        const names: string[] = []
        for (let x = 0; x < 160 && names.length < 200; x++) {
            for (let y = 0; y < 160 && names.length < 200; y++) {
                const name = citizenryName(gameSeed, {x, y})
                if (name) names.push(name)
            }
        }
        expect(names.length).toBeGreaterThan(100)

        const nouns = new Set(names.map((n) => citizenryNouns.find((noun) => n.includes(noun))))
        expect(nouns.size).toBeGreaterThan(20)

        const ofForm = names.filter((n) => n.includes(' of ')).length
        expect(ofForm).toBeGreaterThan(0)
        expect(ofForm).toBeLessThan(names.length * 0.6)
    })

    test('counts every noun and adjective combination', () => {
        expect(citizenryPatternCount()).toBe(
            citizenryNouns.length * (1 + 2 * citizenryAdjectives.length)
        )
    })

    test('is undefined away from a world', () => {
        expect(citizenryName(gameSeed, {x: 7, y: 11})).toBeUndefined()
    })
})

describe('scales', () => {
    test('the need scale divides out against the atomic unit', () => {
        expect(NEED_FP_SCALE % INFLUENCE_ATOMIC_PER_POINT).toBe(0)
    })
})

describe('depot transfer duration', () => {
    type ModuleEntry = ServerContract.Types.module_entry
    const DEPOT_ITEM = 10219
    const LOADER_T1 = 10103

    function makeModuleEntry(itemId: number, stats: bigint): ModuleEntry {
        return {
            type: UInt8.from(0),
            installed: {item_id: UInt16.from(itemId), stats: UInt64.from(stats)},
        } as unknown as ModuleEntry
    }
    function emptySlot(): ModuleEntry {
        return {type: UInt8.from(0)} as unknown as ModuleEntry
    }

    // A spawned depot: loader in slot 0, four empty bays after it.
    const depotWithLoader = (): ModuleEntry[] => [
        makeModuleEntry(LOADER_T1, packStats(500)),
        emptySlot(),
        emptySlot(),
        emptySlot(),
        emptySlot(),
    ]
    const params = (overrides: Record<string, unknown> = {}) => ({
        depotModules: depotWithLoader(),
        depotItemId: DEPOT_ITEM,
        depotKind: 'depot',
        depotZ: 0,
        shipKind: 'ship',
        shipZ: 0,
        cargoMass: 100,
        ...overrides,
    })

    test('drives off the depot loader, not the ship', () => {
        expect(depotTransferDuration(params())).toBeGreaterThan(0)
    })

    test('grows with cargo mass', () => {
        expect(depotTransferDuration(params({cargoMass: 10_000}))).toBeGreaterThan(
            depotTransferDuration(params({cargoMass: 100}))
        )
    })

    test('empty cargo costs nothing', () => {
        expect(depotTransferDuration(params({cargoMass: 0}))).toBe(0)
    })

    test('a depot with no loader installed cannot transfer', () => {
        expect(depotTransferDuration(params({depotModules: [emptySlot()]}))).toBe(0)
    })

    test('co-located transfers are floored at the orbital minimum distance', () => {
        // max(planetary 100, orbital 200) = 200, so anything under 200 reads as 200
        const touching = depotTransferDuration(params({shipZ: 0, depotZ: 0}))
        const under = depotTransferDuration(params({shipZ: 150, depotZ: 0}))
        const over = depotTransferDuration(params({shipZ: 400, depotZ: 0}))
        expect(under).toBe(touching)
        expect(over).toBeGreaterThan(touching)
    })

    test('never reports zero for real cargo', () => {
        expect(depotTransferDuration(params({cargoMass: 1}))).toBeGreaterThanOrEqual(1)
    })
})

describe('civic drop-off duration', () => {
    type ModuleEntry = ServerContract.Types.module_entry
    const DEPOT_ITEM = 10219
    const WORKSHOP_ITEM = 10208
    const LOADER_T1 = 10103

    function makeModuleEntry(itemId: number, stats: bigint): ModuleEntry {
        return {
            type: UInt8.from(0),
            installed: {item_id: UInt16.from(itemId), stats: UInt64.from(stats)},
        } as unknown as ModuleEntry
    }
    function emptySlot(): ModuleEntry {
        return {type: UInt8.from(0)} as unknown as ModuleEntry
    }

    const withLoader = () => ({
        buildingModules: [makeModuleEntry(LOADER_T1, packStats(500)), emptySlot()],
        buildingItemId: DEPOT_ITEM,
        buildingKind: 'depot',
        buildingZ: 0,
        shipKind: 'ship',
        shipZ: 400,
        cargoMass: 100,
    })
    const withoutLoader = () => ({
        buildingModules: [] as ModuleEntry[],
        buildingItemId: WORKSHOP_ITEM,
        buildingKind: 'workshop',
        buildingZ: 0,
        shipKind: 'ship',
        shipZ: 400,
        cargoMass: 100,
    })

    test('a building with a slot-0 loader prices off that loader', () => {
        const p = withLoader()
        expect(civicDropoffDuration(p)).toBe(
            depotTransferDuration({
                depotModules: p.buildingModules,
                depotItemId: p.buildingItemId,
                depotKind: p.buildingKind,
                depotZ: p.buildingZ,
                shipKind: p.shipKind,
                shipZ: p.shipZ,
                cargoMass: p.cargoMass,
            })
        )
    })

    test('a building with no loader falls back to the civic loader', () => {
        const p = withoutLoader()
        expect(civicDropoffDuration(p)).toBe(contributeDuration(p.cargoMass, p.shipZ))
        expect(civicDropoffDuration(p)).toBeGreaterThan(0)
    })

    test('grows with cargo mass on both paths', () => {
        expect(civicDropoffDuration({...withLoader(), cargoMass: 10_000})).toBeGreaterThan(
            civicDropoffDuration(withLoader())
        )
        expect(civicDropoffDuration({...withoutLoader(), cargoMass: 10_000})).toBeGreaterThan(
            civicDropoffDuration(withoutLoader())
        )
    })
})
