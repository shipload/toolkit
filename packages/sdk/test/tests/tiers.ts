import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {
    getItem,
    isCraftedItem,
    isRelatedItem,
    ITEM_ORE_T1,
    itemCategory,
    itemOffset,
    itemTier,
    RESERVE_TIERS,
    type ReserveTier,
    rollTier,
    rollWithinTier,
    TIER_ROLL_MAX,
} from '$lib'

describe('tier utilities', () => {
    test('itemTier returns tier from item ID', () => {
        assert.equal(itemTier(10001), 1)
        assert.equal(itemTier(10100), 1)
        assert.equal(itemTier(10200), 1)
        assert.equal(itemTier(11001), 2)
        assert.equal(itemTier(11200), 2)
        assert.equal(itemTier(12001), 3)
    })

    test('itemTier returns 0 for raw resources', () => {
        assert.equal(itemTier(101), 0)
        assert.equal(itemTier(402), 0)
    })

    test('itemOffset returns offset within tier', () => {
        assert.equal(itemOffset(10001), 1)
        assert.equal(itemOffset(10100), 100)
        assert.equal(itemOffset(10200), 200)
        assert.equal(itemOffset(11001), 1)
        assert.equal(itemOffset(11200), 200)
    })

    test('itemCategory classifies crafted items', () => {
        assert.equal(itemCategory(10001), 'component')
        assert.equal(itemCategory(10100), 'module')
        assert.equal(itemCategory(10200), 'entity')
        assert.equal(itemCategory(11001), 'component')
        assert.equal(itemCategory(11200), 'entity')
        assert.equal(itemCategory(101), 'resource')
    })

    test('isRelatedItem matches same offset across tiers', () => {
        assert.isTrue(isRelatedItem(10001, 11001))
        assert.isTrue(isRelatedItem(10200, 11200))
        assert.isFalse(isRelatedItem(10001, 10002))
        assert.isFalse(isRelatedItem(10001, 10100))
    })

    test('isCraftedItem checks >= 10000', () => {
        assert.isFalse(isCraftedItem(101))
        assert.isTrue(isCraftedItem(10001))
        assert.isTrue(isCraftedItem(11001))
    })
})

describe('reserve tiers', () => {
    test('tier constants match spec', () => {
        assert.deepEqual(RESERVE_TIERS.small, {min: 36_000, max: 144_000})
        assert.deepEqual(RESERVE_TIERS.medium, {min: 240_000, max: 480_000})
        assert.deepEqual(RESERVE_TIERS.large, {min: 960_000, max: 1_680_000})
        assert.deepEqual(RESERVE_TIERS.massive, {min: 2_400_000, max: 6_000_000})
        assert.deepEqual(RESERVE_TIERS.motherlode, {min: 9_600_000, max: 24_000_000})
    })

    const TIERS: ReserveTier[] = ['small', 'medium', 'large', 'massive', 'motherlode']

    function tierShares(stratum: number): Record<ReserveTier, number> {
        const starts = TIERS.map((tier) => {
            let lo = 0
            let hi = TIER_ROLL_MAX
            while (lo < hi) {
                const mid = Math.floor((lo + hi) / 2)
                if (TIERS.indexOf(rollTier(mid, stratum)) >= TIERS.indexOf(tier)) hi = mid
                else lo = mid + 1
            }
            return lo
        })
        const shares = {} as Record<ReserveTier, number>
        TIERS.forEach((tier, i) => {
            shares[tier] = ((starts[i + 1] ?? TIER_ROLL_MAX) - starts[i]) / TIER_ROLL_MAX
        })
        return shares
    }

    test('the highest tier roll is a motherlode at every stratum', () => {
        for (const stratum of [0, 1, 2443, 9708, 65535]) {
            assert.equal(rollTier(TIER_ROLL_MAX - 1, stratum), 'motherlode')
        }
    })

    test('rollTier at shallow distributes 80/19.1946/0.8/0.005/0.0004', () => {
        const shares = tierShares(0)
        const expected = {
            small: 0.8,
            medium: 0.191946,
            large: 0.008,
            massive: 0.00005,
            motherlode: 0.000004,
        }
        for (const tier of TIERS) assert.closeTo(shares[tier], expected[tier], 1 / 2 ** 31)
    })

    test('rollTier at deep distributes 50/45.892/4/0.1/0.008', () => {
        const shares = tierShares(65535)
        const expected = {
            small: 0.5,
            medium: 0.45892,
            large: 0.04,
            massive: 0.001,
            motherlode: 0.00008,
        }
        for (const tier of TIERS) assert.closeTo(shares[tier], expected[tier], 1 / 2 ** 31)
    })

    test('rollWithinTier is skewed low', () => {
        const range = RESERVE_TIERS.large
        const unitMass = getItem(ITEM_ORE_T1).mass
        const minUnits = Math.floor(range.min / unitMass)
        const maxUnits = Math.floor(range.max / unitMass)
        let belowMidpoint = 0
        const N = 10_000
        for (let i = 0; i < N; i++) {
            const r = Math.floor((i / N) * 65536)
            const v = rollWithinTier(r, range, unitMass)
            assert.isAtLeast(v, Math.max(1, minUnits))
            assert.isAtMost(v, maxUnits)
            const midpoint = (minUnits + maxUnits) / 2
            if (v < midpoint) belowMidpoint++
        }
        // u^2 skew: ~70% of values should be below midpoint
        assert.isAbove(belowMidpoint / N, 0.6)
    })

    test('rollWithinTier deterministic', () => {
        const range = RESERVE_TIERS.medium
        const unitMass = getItem(ITEM_ORE_T1).mass
        assert.equal(rollWithinTier(0, range, unitMass), Math.floor(range.min / unitMass))
        assert.equal(rollWithinTier(65535, range, unitMass), Math.floor(range.max / unitMass))
    })
})
