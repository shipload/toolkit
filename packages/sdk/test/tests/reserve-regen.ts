import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {BlockTimestamp} from '@wharfkit/antelope'
import {getEffectiveReserve} from '$lib'

const EPOCH_SECONDS = 124 * 3600
const EPOCH_SLOTS = EPOCH_SECONDS * 2
const BASE_MS = 946684800000

function bts(ms: number): BlockTimestamp {
    return BlockTimestamp.fromMilliseconds(BASE_MS + ms)
}

describe('getEffectiveReserve', () => {
    test('returns max when remaining equals max', () => {
        assert.equal(
            getEffectiveReserve(
                {remaining: 100, max_reserve: 100, last_block: bts(0)},
                bts(1_000_000),
                EPOCH_SECONDS
            ),
            100
        )
    })

    test('adds linear regen across half an epoch', () => {
        assert.equal(
            getEffectiveReserve(
                {remaining: 0, max_reserve: 100, last_block: bts(0)},
                bts((EPOCH_SECONDS / 2) * 1000),
                EPOCH_SECONDS
            ),
            50
        )
    })

    test('caps at max_reserve after a full epoch', () => {
        assert.equal(
            getEffectiveReserve(
                {remaining: 0, max_reserve: 100, last_block: bts(0)},
                bts(EPOCH_SECONDS * 2 * 1000),
                EPOCH_SECONDS
            ),
            100
        )
    })

    test('tracks half-second granularity', () => {
        assert.equal(
            getEffectiveReserve(
                {remaining: 0, max_reserve: EPOCH_SLOTS, last_block: bts(0)},
                bts(500),
                EPOCH_SECONDS
            ),
            1
        )
    })

    test('clamps to zero when now is earlier than last_block', () => {
        assert.equal(
            getEffectiveReserve(
                {remaining: 50, max_reserve: 100, last_block: bts(10_000)},
                bts(5_000),
                EPOCH_SECONDS
            ),
            50
        )
    })

    test('returns remaining when epochSeconds is zero', () => {
        assert.equal(
            getEffectiveReserve(
                {remaining: 42, max_reserve: 100, last_block: bts(0)},
                bts(10_000),
                0
            ),
            42
        )
    })
})
