import {describe, expect, test} from 'bun:test'
import {ServerContract, type ServerTypes} from '@shipload/sdk'
import {TimePoint} from '@wharfkit/antelope'
import {
    CANCEL_ALWAYS,
    CANCEL_BEFORE_START,
    CANCEL_NEVER,
    computeCancelableCount,
} from '../../src/lib/cancel-compute'
import type {EntitySnapshot} from '../../src/lib/snapshot'

function task(cancelable: number): ServerTypes.task {
    return ServerContract.Types.task.from({
        type: 0,
        duration: 1,
        cancelable,
        cargo: [],
    })
}

function snap(opts: {
    isIdle: boolean
    pendingCancelables: number[]
    completedCount?: number
}): EntitySnapshot {
    const completed = opts.completedCount ?? 0
    const pending = opts.pendingCancelables.map(task)
    const allTasks: ServerTypes.task[] = []
    for (let i = 0; i < completed; i++) allTasks.push(task(CANCEL_ALWAYS))
    if (!opts.isIdle) allTasks.push(task(CANCEL_NEVER))
    for (const t of pending) allTasks.push(t)
    return {
        type: 'ship',
        id: 1n,
        owner: 'alice',
        entity_name: 'T',
        coordinates: {x: 0n, y: 0n},
        cargomass: 0n,
        cargo: [],
        is_idle: opts.isIdle,
        pending_tasks: pending,
        schedule: {
            started: TimePoint.from('2026-01-01T00:00:00.000'),
            tasks: allTasks,
        },
    }
}

describe('computeCancelableCount --all', () => {
    test('all-cancelable pending returns full pending count', () => {
        const s = snap({
            isIdle: false,
            pendingCancelables: [CANCEL_ALWAYS, CANCEL_ALWAYS, CANCEL_BEFORE_START],
        })
        expect(computeCancelableCount(s, {kind: 'all'})).toBe(3n)
    })

    test('CANCEL_NEVER at tail returns 0', () => {
        const s = snap({
            isIdle: false,
            pendingCancelables: [CANCEL_ALWAYS, CANCEL_ALWAYS, CANCEL_NEVER],
        })
        expect(computeCancelableCount(s, {kind: 'all'})).toBe(0n)
    })

    test('CANCEL_NEVER in middle returns count up to blocker from tail', () => {
        const s = snap({
            isIdle: false,
            pendingCancelables: [
                CANCEL_ALWAYS,
                CANCEL_NEVER,
                CANCEL_ALWAYS,
                CANCEL_ALWAYS,
            ],
        })
        expect(computeCancelableCount(s, {kind: 'all'})).toBe(2n)
    })

    test('empty pending returns 0 (idle)', () => {
        const s = snap({isIdle: true, pendingCancelables: [], completedCount: 4})
        expect(computeCancelableCount(s, {kind: 'all'})).toBe(0n)
    })

    test('no schedule at all returns 0', () => {
        const s: EntitySnapshot = {
            type: 'ship',
            id: 1n,
            owner: 'alice',
            entity_name: 'T',
            coordinates: {x: 0n, y: 0n},
            cargomass: 0n,
            cargo: [],
            is_idle: true,
        }
        expect(computeCancelableCount(s, {kind: 'all'})).toBe(0n)
    })

    test('BEFORE_START counts as cancelable while pending', () => {
        const s = snap({
            isIdle: false,
            pendingCancelables: [CANCEL_BEFORE_START, CANCEL_BEFORE_START],
        })
        expect(computeCancelableCount(s, {kind: 'all'})).toBe(2n)
    })
})

describe('computeCancelableCount --from', () => {
    test('idx at first pending returns full pending count', () => {
        const s = snap({
            isIdle: false,
            completedCount: 2,
            pendingCancelables: [CANCEL_ALWAYS, CANCEL_ALWAYS, CANCEL_ALWAYS],
        })
        // schedule = [done, done, running, p, p, p] -> total 6, idx 3 -> count 3
        expect(computeCancelableCount(s, {kind: 'from', index: 3})).toBe(3n)
    })

    test('idx in middle of pending returns tail count', () => {
        const s = snap({
            isIdle: false,
            completedCount: 1,
            pendingCancelables: [CANCEL_ALWAYS, CANCEL_ALWAYS, CANCEL_ALWAYS],
        })
        // schedule = [done, running, p, p, p] -> total 5, idx 3 -> count 2
        expect(computeCancelableCount(s, {kind: 'from', index: 3})).toBe(2n)
    })

    test('idx at last task returns 1', () => {
        const s = snap({
            isIdle: false,
            pendingCancelables: [CANCEL_ALWAYS, CANCEL_ALWAYS],
        })
        // schedule = [running, p, p] -> total 3, idx 2 -> count 1
        expect(computeCancelableCount(s, {kind: 'from', index: 2})).toBe(1n)
    })

    test('idx in completed range throws', () => {
        const s = snap({
            isIdle: false,
            completedCount: 2,
            pendingCancelables: [CANCEL_ALWAYS],
        })
        expect(() => computeCancelableCount(s, {kind: 'from', index: 0})).toThrow(
            /completed/,
        )
        expect(() => computeCancelableCount(s, {kind: 'from', index: 1})).toThrow(
            /completed/,
        )
    })

    test('idx at running task throws', () => {
        const s = snap({
            isIdle: false,
            completedCount: 1,
            pendingCancelables: [CANCEL_ALWAYS, CANCEL_ALWAYS],
        })
        // schedule = [done, running, p, p] -> running at idx 1
        expect(() => computeCancelableCount(s, {kind: 'from', index: 1})).toThrow(
            /running/,
        )
    })

    test('idx out of range throws', () => {
        const s = snap({
            isIdle: false,
            pendingCancelables: [CANCEL_ALWAYS],
        })
        // schedule total = 2 (running + 1 pending). idx 2 is OOB.
        expect(() => computeCancelableCount(s, {kind: 'from', index: 2})).toThrow(
            /out of range/,
        )
        expect(() => computeCancelableCount(s, {kind: 'from', index: 99})).toThrow(
            /out of range/,
        )
    })

    test('negative idx throws', () => {
        const s = snap({
            isIdle: false,
            pendingCancelables: [CANCEL_ALWAYS],
        })
        expect(() => computeCancelableCount(s, {kind: 'from', index: -1})).toThrow(
            /out of range/,
        )
    })

    test('idle entity rejects any --from', () => {
        const s = snap({isIdle: true, pendingCancelables: [], completedCount: 3})
        expect(() => computeCancelableCount(s, {kind: 'from', index: 0})).toThrow(
            /completed/,
        )
    })

    test('no schedule rejects --from', () => {
        const s: EntitySnapshot = {
            type: 'ship',
            id: 1n,
            owner: 'alice',
            entity_name: 'T',
            coordinates: {x: 0n, y: 0n},
            cargomass: 0n,
            cargo: [],
            is_idle: true,
        }
        expect(() => computeCancelableCount(s, {kind: 'from', index: 0})).toThrow()
    })
})
