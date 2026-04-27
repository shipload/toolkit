import {assert} from 'chai'
import {
    isCraftedItem,
    isRelatedItem,
    itemCategory,
    itemOffset,
    itemTier,
    RESERVE_TIERS,
    ReserveTier,
    rollTier,
    rollWithinTier,
} from '$lib'

suite('tier utilities', () => {
    test('itemTier returns tier from item ID', () => {
        assert.equal(itemTier(10001), 1)
        assert.equal(itemTier(10100), 1)
        assert.equal(itemTier(10200), 1)
        assert.equal(itemTier(20001), 2)
        assert.equal(itemTier(20200), 2)
        assert.equal(itemTier(30001), 3)
    })

    test('itemTier returns 0 for raw resources', () => {
        assert.equal(itemTier(101), 0)
        assert.equal(itemTier(402), 0)
    })

    test('itemOffset returns offset within tier', () => {
        assert.equal(itemOffset(10001), 1)
        assert.equal(itemOffset(10100), 100)
        assert.equal(itemOffset(10200), 200)
        assert.equal(itemOffset(20001), 1)
        assert.equal(itemOffset(20200), 200)
    })

    test('itemCategory classifies crafted items', () => {
        assert.equal(itemCategory(10001), 'component')
        assert.equal(itemCategory(10100), 'module')
        assert.equal(itemCategory(10200), 'entity')
        assert.equal(itemCategory(20001), 'component')
        assert.equal(itemCategory(20200), 'entity')
        assert.equal(itemCategory(101), 'resource')
    })

    test('isRelatedItem matches same offset across tiers', () => {
        assert.isTrue(isRelatedItem(10001, 20001))
        assert.isTrue(isRelatedItem(10200, 20200))
        assert.isFalse(isRelatedItem(10001, 10002))
        assert.isFalse(isRelatedItem(10001, 10100))
    })

    test('isCraftedItem checks >= 10000', () => {
        assert.isFalse(isCraftedItem(101))
        assert.isTrue(isCraftedItem(10001))
        assert.isTrue(isCraftedItem(20001))
    })
})

suite('reserve tiers', () => {
    test('tier constants match spec', () => {
        assert.deepEqual(RESERVE_TIERS.small, {min: 15, max: 60})
        assert.deepEqual(RESERVE_TIERS.medium, {min: 100, max: 200})
        assert.deepEqual(RESERVE_TIERS.large, {min: 400, max: 700})
        assert.deepEqual(RESERVE_TIERS.massive, {min: 1000, max: 2500})
        assert.deepEqual(RESERVE_TIERS.motherlode, {min: 4000, max: 10000})
    })

    test('rollTier at shallow distributes ~80/19.2/0.8/0.005/0.0004', () => {
        const counts: Record<ReserveTier, number> = {
            small: 0,
            medium: 0,
            large: 0,
            massive: 0,
            motherlode: 0,
        }
        const N = 1_000_000
        for (let r = 0; r < N; r++) {
            const tierRoll = (r * 0xffff) % 0x10000
            counts[rollTier(tierRoll, 1)]++
        }
        // Wide tolerance because tierRoll above is a non-uniform sweep, just sanity:
        assert.isAtLeast(counts.small, 700_000)
        assert.isAtMost(counts.small, 850_000)
    })

    test('rollTier at deep yields more large/massive than at shallow', () => {
        let shallowLargePlus = 0
        let deepLargePlus = 0
        for (let r = 0; r < 65536; r++) {
            const shallow = rollTier(r, 1)
            const deep = rollTier(r, 65535)
            if (shallow === 'large' || shallow === 'massive' || shallow === 'motherlode')
                shallowLargePlus++
            if (deep === 'large' || deep === 'massive' || deep === 'motherlode') deepLargePlus++
        }
        assert.isAbove(deepLargePlus, shallowLargePlus * 4)
    })

    test('rollWithinTier is skewed low', () => {
        const range = RESERVE_TIERS.large
        let belowMidpoint = 0
        const N = 10_000
        for (let i = 0; i < N; i++) {
            const r = Math.floor((i / N) * 65536)
            const v = rollWithinTier(r, range)
            assert.isAtLeast(v, range.min)
            assert.isAtMost(v, range.max)
            const midpoint = (range.min + range.max) / 2
            if (v < midpoint) belowMidpoint++
        }
        // u^2 skew: ~70% of values should be below midpoint
        assert.isAbove(belowMidpoint / N, 0.6)
    })

    test('rollWithinTier deterministic', () => {
        const range = RESERVE_TIERS.medium
        assert.equal(rollWithinTier(0, range), range.min)
        assert.equal(rollWithinTier(65535, range), range.max)
    })
})
