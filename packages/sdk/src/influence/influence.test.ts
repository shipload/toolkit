import {describe, expect, test} from 'bun:test'
import {Checksum256} from '@wharfkit/antelope'
import {ITEM_ORE_T1, ITEM_PLATE, ITEM_CRYSTAL_T1} from '../data/item-ids'
import {categoryIndex} from './categories'
import {
    CHARTER_WORKSHOP_COST,
    DEMAND_CONFIG_SEED,
    INFLUENCE_ATOMIC_PER_POINT,
    INFLUENCE_D1_SEED,
    NEED_FP_SCALE,
} from './constants'
import {decayActive, normalizeActive} from './decay'
import {
    buildDemand,
    cellNeed,
    DEMAND_TIER_WEIGHTS,
    type DemandView,
    deriveDemand,
    lackingMaskFrom,
    needForCell,
    pickPeakTier,
    popcount5,
    rankedCategories,
    rankLacking,
} from './demand'
import {findDecomp, DECOMP_REGISTRY} from './decomp'
import {contributeDuration} from './duration'
import {getStatCount, statsSumSq} from './quality'
import {
    componentEffortAtomic,
    explainCargoItem,
    pricingFromWeights,
    valueCargoItem,
    valueContribution,
} from './valuation'
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

function demandOf(need: (category: number, tier: number) => bigint): DemandView {
    return {
        abundantMask: 0,
        lackingMask: 0x1f,
        rank: [0, 0, 0, 0, 0],
        peakTier: [0, 0, 0, 0, 0],
        needFp: Array.from({length: 5}, (_, c) =>
            Array.from({length: 10}, (_, t) => need(c, t + 1))
        ),
    }
}

const baseDemand = demandOf(() => BigInt(NEED_FP_SCALE))

function wordBytes(words: number[]): number[] {
    const bytes = new Array<number>(64).fill(0)
    words.forEach((w, i) => {
        bytes[i * 4] = (w >>> 24) & 0xff
        bytes[i * 4 + 1] = (w >>> 16) & 0xff
        bytes[i * 4 + 2] = (w >>> 8) & 0xff
        bytes[i * 4 + 3] = w & 0xff
    })
    return bytes
}

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
        expect(getStatCount(ITEM_PLATE)).toBe(6)
    })
})

describe('demand', () => {
    test('the lacking mask is the complement over five categories', () => {
        expect(lackingMaskFrom(0b00101)).toBe(0b11010)
        expect(popcount5(0b11010)).toBe(3)
    })

    test('the rank shuffle permutes the lacking set with one word per step', () => {
        const lacking = 0b10110
        expect(rankLacking(lacking, wordBytes([0, 0]))).toEqual([2, 4, 1])
        expect(rankLacking(lacking, wordBytes([2, 1]))).toEqual([1, 2, 4])
        expect(rankLacking(lacking, wordBytes([1, 0]))).toEqual([4, 1, 2])
        expect(rankLacking(0b00010, wordBytes([7, 7]))).toEqual([1])
        expect(() => rankLacking(0, wordBytes([]))).toThrow('location has no lacking category')
    })

    test('the tier roll follows the cumulative weights', () => {
        let cum = 0
        DEMAND_TIER_WEIGHTS.forEach((w, i) => {
            expect(pickPeakTier(cum)).toBe(i + 1)
            expect(pickPeakTier(cum + w - 1)).toBe(i + 1)
            cum += w
        })
        expect(cum).toBe(10_000)
        expect(pickPeakTier(10_000)).toBe(1)
        expect(pickPeakTier(0xffffffff)).toBe(pickPeakTier(0xffffffff % 10_000))
    })

    test('a cell pays its rank rate times the peak bonus for its distance', () => {
        const words = [0, 0, 0, 0, 0, 2784 + 2592 + 1998, 0, 0, 9999]
        const view = buildDemand(0b00101, wordBytes(words), DEMAND_CONFIG_SEED)
        expect(rankedCategories(view)).toEqual([3, 4, 1])
        expect(view.rank).toEqual([0, 3, 0, 1, 2])
        expect(view.peakTier).toEqual([0, 4, 0, 1, 10])
        for (let t = 1; t <= 10; t++) {
            expect(needForCell(view, 0, t)).toBe(DEMAND_CONFIG_SEED.floor)
            expect(needForCell(view, 2, t)).toBe(DEMAND_CONFIG_SEED.floor)
        }
        expect(needForCell(view, 3, 1)).toBe(20_800n)
        expect(needForCell(view, 3, 2)).toBe(18_200n)
        expect(needForCell(view, 3, 3)).toBe(15_600n)
        expect(needForCell(view, 3, 10)).toBe(13_000n)
        expect(needForCell(view, 4, 10)).toBe(16_000n)
        expect(needForCell(view, 4, 9)).toBe(14_000n)
        expect(needForCell(view, 4, 8)).toBe(12_000n)
        expect(needForCell(view, 4, 1)).toBe(10_000n)
        expect(needForCell(view, 1, 4)).toBe(12_800n)
        expect(needForCell(view, 1, 2)).toBe(9_600n)
        expect(needForCell(view, 1, 7)).toBe(8_000n)
        expect(cellNeed(13_000n, 16_000n)).toBe(20_800n)
    })

    test('an Industrial world ranks its one lacking category first', () => {
        const view = buildDemand(0b11101, wordBytes([5, 5, 0, 0, 0, 0]), DEMAND_CONFIG_SEED)
        expect(view.rank).toEqual([0, 1, 0, 0, 0])
        expect(view.peakTier[1]).toBe(1)
        expect(needForCell(view, 1, 1)).toBe(20_800n)
        expect(needForCell(view, 1, 5)).toBe(13_000n)
    })

    test('a world lacking more categories than ranks refuses', () => {
        const config = {...DEMAND_CONFIG_SEED, rankFp: [13_000n, 10_000n]}
        expect(() => buildDemand(0b00001, wordBytes([]), config)).toThrow(
            'location lacks more categories than demand ranks'
        )
    })

    test('ranks and peaks move with the epoch seed, not the game seed', () => {
        const gameSeed = Checksum256.hash(Buffer.from('game'))
        const coordinates = WORLD
        const firsts = new Set<number>()
        const peaks = new Set<number>()
        for (let i = 0; i < 24; i++) {
            const epochSeed = Checksum256.hash(Buffer.from(`epoch-${i}`))
            const view = deriveDemand({
                gameSeed,
                epochSeed,
                coordinates,
                config: DEMAND_CONFIG_SEED,
            })
            const [first] = rankedCategories(view)
            firsts.add(first)
            peaks.add(view.peakTier[first])
        }
        expect(firsts.size).toBeGreaterThan(1)
        expect(peaks.size).toBeGreaterThan(1)
    })

    test('the composition partition is stable across epochs', () => {
        const gameSeed = Checksum256.hash(Buffer.from('game'))
        const coordinates = WORLD
        const masks = new Set<number>()
        for (let i = 0; i < 8; i++) {
            const epochSeed = Checksum256.hash(Buffer.from(`epoch-${i}`))
            masks.add(
                deriveDemand({gameSeed, epochSeed, coordinates, config: DEMAND_CONFIG_SEED})
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
        expect(DECOMP_REGISTRY.length).toBe(97)
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
        const acute = demandOf((c, t) =>
            c === categoryIndex('regolith') ? 20_800n : 1_000n * BigInt(t)
        )
        for (const def of getItems()) {
            if (def.type !== 'resource' && def.type !== 'component') continue
            const item = {itemId: Number(def.id), quantity: 7, stats: packStats(363, 535, 246)}
            const explained = explainCargoItem(item, acute, pricing)
            expect(explained.totalAtomic).toBe(valueCargoItem(item, acute, pricing))
        }
    })

    test('a resource explains mass, weight, quality and need', () => {
        const acute = demandOf((c, t) =>
            c === categoryIndex('crystal') && t === 1 ? 20_000n : BigInt(NEED_FP_SCALE)
        )
        const explained = explainCargoItem(
            {itemId: ITEM_CRYSTAL_T1, quantity: 5000, stats: packStats(PAR)},
            acute,
            pricing
        )
        if (explained.kind !== 'resource') throw new Error('expected resource')
        expect(explained.mass).toBe(
            BigInt(getItems().find((i) => Number(i.id) === ITEM_CRYSTAL_T1)!.mass) * 5000n
        )
        expect(explained.weight).toBe(1)
        expect(explained.quality).toBeCloseTo(1, 6)
        expect(explained.need).toBe(2)
        expect(explained.points).toBeCloseTo(
            (Number(explained.mass) / 10) * explained.weight * explained.quality * explained.need,
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

    test('a doubled cell need doubles a resource', () => {
        const acute = demandOf((c, t) =>
            c === categoryIndex('crystal') && t === 1 ? 20_000n : BigInt(NEED_FP_SCALE)
        )
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

    test('a component follows the cell need of each input it decomposes into', () => {
        const item = {itemId: ITEM_PLATE, quantity: 5, stats: packStats(PAR)}
        const effort = componentEffortAtomic(findDecomp(ITEM_PLATE)!.processedMass, 5)
        const base = valueCargoItem(item, baseDemand, pricing) - effort
        const doubled = demandOf(() => 20_000n)
        expect(valueCargoItem(item, doubled, pricing) - effort).toBe(base * 2n)
        const elsewhere = demandOf((c) => (c === categoryIndex('ore') ? 10_000n : 20_000n))
        expect(valueCargoItem(item, elsewhere, pricing)).toBe(
            valueCargoItem(item, baseDemand, pricing)
        )
        const explained = explainCargoItem(item, doubled, pricing)
        if (explained.kind !== 'component') throw new Error('expected component')
        expect(explained.need).toBe(2)
    })

    test('a component reads only the cell of its input, not its neighbours', () => {
        const ore = categoryIndex('ore')
        const item = {itemId: ITEM_PLATE, quantity: 3, stats: packStats(PAR)}
        const effort = componentEffortAtomic(findDecomp(ITEM_PLATE)!.processedMass, 3)
        const base = valueCargoItem(item, baseDemand, pricing) - effort
        const inputCell = demandOf((c, t) => (c === ore && t === 1 ? 16_000n : 8_000n))
        const scaled = valueCargoItem(item, inputCell, pricing) - effort
        expect(scaled - (base * 16n) / 10n).toBeGreaterThanOrEqual(0n)
        expect(scaled - (base * 16n) / 10n).toBeLessThanOrEqual(1n)
        const nextTier = demandOf((c, t) =>
            c === ore && t === 2 ? 16_000n : BigInt(NEED_FP_SCALE)
        )
        expect(valueCargoItem(item, nextTier, pricing)).toBe(
            valueCargoItem(item, baseDemand, pricing)
        )
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
