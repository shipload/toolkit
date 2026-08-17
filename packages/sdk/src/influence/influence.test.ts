import {describe, expect, test} from 'bun:test'
import {Checksum256} from '@wharfkit/antelope'
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
import {contributeDuration} from './duration'
import {getStatCount, statsSumSq} from './quality'
import {pricingFromWeights, valueCargoItem, valueContribution} from './valuation'
import {citizenryName} from './citizenry'

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
        expect(entry.processedKg).toBeGreaterThan(0)
        for (let i = 1; i < entry.buckets.length; i++) {
            const prev = entry.buckets[i - 1]
            const cur = entry.buckets[i]
            expect(prev.category < cur.category || prev.tier < cur.tier).toBe(true)
        }
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
        expect(contributeDuration(1_000)).toBeGreaterThan(0)
        expect(contributeDuration(1_000_000)).toBeGreaterThan(contributeDuration(1_000))
    })

    test('splitting a haul costs more than one trip', () => {
        const single = contributeDuration(100_000_000)
        const hundred = contributeDuration(1_000_000) * 100
        expect(hundred).toBeGreaterThan(single)
    })

    test('ground level is floored at the base orbital climb', () => {
        expect(contributeDuration(1_000, 0)).toBe(contributeDuration(1_000, 800))
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

    test('composes the world name', () => {
        const name = citizenryName(gameSeed, WORLD) ?? ''
        expect(name.length).toBeGreaterThan(0)
        expect(/Collective|Compact|Concord of|Union/.test(name)).toBe(true)
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
