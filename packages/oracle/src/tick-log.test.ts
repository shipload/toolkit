import {describe, expect, test} from 'bun:test'
import {shouldLogTick, tickSignature, type TickLogState} from './tick-log'
import type {TickResult} from './run-once'

const HEARTBEAT = 30 * 60 * 1000

function tick(over: Partial<TickResult> = {}): TickResult {
    return {
        target: 17,
        currentHeight: 16,
        commit: 'already-committed',
        reveal: 'waiting-for-height',
        eta: {kind: 'boundary', seconds: 2400},
        ...over,
    }
}

function state(r: TickResult, loggedAt: number): TickLogState {
    return {signature: tickSignature(r), loggedAt}
}

describe('shouldLogTick', () => {
    test('the first tick always logs', () => {
        expect(shouldLogTick(tick(), null, 0, HEARTBEAT)).toBe(true)
    })

    test('an unchanged tick inside the heartbeat window stays silent', () => {
        const prev = state(tick(), 0)
        expect(shouldLogTick(tick(), prev, 10_000, HEARTBEAT)).toBe(false)
    })

    test('a changed reveal outcome logs immediately', () => {
        const prev = state(tick(), 0)
        expect(shouldLogTick(tick({reveal: 'posted'}), prev, 10_000, HEARTBEAT)).toBe(true)
    })

    test('a changed commit outcome logs immediately', () => {
        const prev = state(tick(), 0)
        expect(shouldLogTick(tick({commit: 'posted'}), prev, 10_000, HEARTBEAT)).toBe(true)
    })

    test('a new target epoch logs immediately', () => {
        const prev = state(tick(), 0)
        expect(shouldLogTick(tick({target: 18}), prev, 10_000, HEARTBEAT)).toBe(true)
    })

    test('the heartbeat logs an unchanged tick once the window elapses', () => {
        const prev = state(tick(), 0)
        expect(shouldLogTick(tick(), prev, HEARTBEAT, HEARTBEAT)).toBe(true)
    })

    test('height alone is not a change', () => {
        const prev = state(tick(), 0)
        expect(shouldLogTick(tick({currentHeight: 17}), prev, 10_000, HEARTBEAT)).toBe(false)
    })

    test('a moving eta is not a change', () => {
        const prev = state(tick(), 0)
        const moved = tick({eta: {kind: 'boundary', seconds: 60}})
        expect(shouldLogTick(moved, prev, 10_000, HEARTBEAT)).toBe(false)
    })
})
