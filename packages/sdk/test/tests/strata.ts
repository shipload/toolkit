import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {Checksum256} from '@wharfkit/antelope'
import {
    deriveLocationSize,
    deriveLocationStatic,
    deriveStrata,
    deriveStratum,
    LocationType,
} from '$lib'

const testGameSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)
const testEpochSeed = Checksum256.from(
    'b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2'
)

const SYSTEM_COORDS = {x: -10, y: -4}
const EMPTY_COORDS = {x: 0, y: 0}

describe('deriveStrata', () => {
    test('returns empty array for an empty (non-system) coord', () => {
        const loc = deriveLocationStatic(testGameSeed, EMPTY_COORDS)
        assert.equal(Number(loc.type), LocationType.EMPTY, 'fixture sanity')
        const result = deriveStrata(EMPTY_COORDS, testGameSeed, testEpochSeed)
        assert.deepEqual(result, [])
    })

    test('returns only non-empty strata at a known system coord', () => {
        const result = deriveStrata(SYSTEM_COORDS, testGameSeed, testEpochSeed)
        assert.isAbove(result.length, 0, 'expected at least one non-empty stratum')
        for (const s of result) {
            assert.isAbove(s.reserve, 0, `stratum ${s.index} should have reserve > 0`)
            assert.isAbove(s.itemId, 0, `stratum ${s.index} should have a real itemId`)
        }
    })

    test('matches per-stratum derivation for first non-empty entry', () => {
        const loc = deriveLocationStatic(testGameSeed, SYSTEM_COORDS)
        const size = deriveLocationSize(loc)
        const strata = deriveStrata(SYSTEM_COORDS, testGameSeed, testEpochSeed)
        assert.isAbove(strata.length, 0, 'fixture sanity')
        const first = strata[0]
        const expected = deriveStratum(
            testEpochSeed,
            SYSTEM_COORDS,
            first.index,
            Number(loc.type),
            Number(loc.subtype),
            size
        )
        assert.equal(first.itemId, expected.itemId)
        assert.equal(first.reserve, expected.reserve)
        assert.equal(first.richness, expected.richness)
        assert.equal(first.seed, expected.seed)
    })

    test('entries are in ascending stratum-index order', () => {
        const result = deriveStrata(SYSTEM_COORDS, testGameSeed, testEpochSeed)
        for (let i = 1; i < result.length; i++) {
            assert.isAbove(
                result[i].index,
                result[i - 1].index,
                `entry ${i} should follow entry ${i - 1} in ascending order`
            )
        }
    })
})
