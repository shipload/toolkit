import {describe, expect, test} from 'bun:test'
import {
    CANCEL_ALWAYS,
    CANCEL_BEFORE_START,
    CANCEL_NEVER,
    computeCancelableCount,
    type LaneTaskView,
} from '../../src/lib/cancel-compute'

function view(opts: {
    tasks: {cancelable: number}[]
    completed: number
    isIdle: boolean
}): LaneTaskView {
    return {
        tasks: opts.tasks,
        pending: opts.tasks.slice(opts.completed + (opts.isIdle ? 0 : 1)),
        completed: opts.completed,
        isIdle: opts.isIdle,
    }
}

describe('computeCancelableCount --all', () => {
    test('all-cancelable pending returns full pending count', () => {
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_BEFORE_START},
            ],
            completed: 0,
        })
        expect(computeCancelableCount(v, {kind: 'all'})).toBe(3n)
    })

    test('CANCEL_NEVER at tail returns 0', () => {
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_NEVER},
            ],
            completed: 0,
        })
        expect(computeCancelableCount(v, {kind: 'all'})).toBe(0n)
    })

    test('CANCEL_NEVER in middle returns count up to blocker from tail', () => {
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 0,
        })
        expect(computeCancelableCount(v, {kind: 'all'})).toBe(2n)
    })

    test('empty pending returns 0 (idle)', () => {
        const v = view({
            isIdle: true,
            tasks: [
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 4,
        })
        expect(computeCancelableCount(v, {kind: 'all'})).toBe(0n)
    })

    test('no tasks returns 0', () => {
        const v = view({isIdle: true, tasks: [], completed: 0})
        expect(computeCancelableCount(v, {kind: 'all'})).toBe(0n)
    })

    test('BEFORE_START counts as cancelable while pending', () => {
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_BEFORE_START},
                {cancelable: CANCEL_BEFORE_START},
            ],
            completed: 0,
        })
        expect(computeCancelableCount(v, {kind: 'all'})).toBe(2n)
    })
})

describe('computeCancelableCount --from', () => {
    test('idx at first pending returns full pending count', () => {
        // tasks = [done, done, running, p, p, p] -> total 6, idx 3 -> count 3
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 2,
        })
        expect(computeCancelableCount(v, {kind: 'from', index: 3})).toBe(3n)
    })

    test('idx in middle of pending returns tail count', () => {
        // tasks = [done, running, p, p, p] -> total 5, idx 3 -> count 2
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 1,
        })
        expect(computeCancelableCount(v, {kind: 'from', index: 3})).toBe(2n)
    })

    test('idx at last task returns 1', () => {
        // tasks = [running, p, p] -> total 3, idx 2 -> count 1
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 0,
        })
        expect(computeCancelableCount(v, {kind: 'from', index: 2})).toBe(1n)
    })

    test('idx in completed range throws', () => {
        // tasks = [done, done, running, p] -> completed=2, running at 2
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 2,
        })
        expect(() => computeCancelableCount(v, {kind: 'from', index: 0})).toThrow(/completed/)
        expect(() => computeCancelableCount(v, {kind: 'from', index: 1})).toThrow(/completed/)
    })

    test('idx at running task throws', () => {
        // tasks = [done, running, p, p] -> running at idx 1
        const v = view({
            isIdle: false,
            tasks: [
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_NEVER},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 1,
        })
        expect(() => computeCancelableCount(v, {kind: 'from', index: 1})).toThrow(/running/)
    })

    test('idx out of range throws', () => {
        // tasks = [running, p] -> total 2, idx 2 is OOB
        const v = view({
            isIdle: false,
            tasks: [{cancelable: CANCEL_NEVER}, {cancelable: CANCEL_ALWAYS}],
            completed: 0,
        })
        expect(() => computeCancelableCount(v, {kind: 'from', index: 2})).toThrow(/out of range/)
        expect(() => computeCancelableCount(v, {kind: 'from', index: 99})).toThrow(/out of range/)
    })

    test('negative idx throws', () => {
        const v = view({
            isIdle: false,
            tasks: [{cancelable: CANCEL_NEVER}, {cancelable: CANCEL_ALWAYS}],
            completed: 0,
        })
        expect(() => computeCancelableCount(v, {kind: 'from', index: -1})).toThrow(/out of range/)
    })

    test('idle entity rejects any --from in completed range', () => {
        // all 3 tasks completed, none pending
        const v = view({
            isIdle: true,
            tasks: [
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
                {cancelable: CANCEL_ALWAYS},
            ],
            completed: 3,
        })
        expect(() => computeCancelableCount(v, {kind: 'from', index: 0})).toThrow(/completed/)
    })

    test('no tasks rejects --from as out of range', () => {
        const v = view({isIdle: true, tasks: [], completed: 0})
        expect(() => computeCancelableCount(v, {kind: 'from', index: 0})).toThrow()
    })

    test('cancel --from on a worker lane counts the cancelable tail', () => {
        const v = view({
            tasks: [{cancelable: 0}, {cancelable: 2}, {cancelable: 2}],
            completed: 0,
            isIdle: false,
        })
        expect(computeCancelableCount(v, {kind: 'from', index: 1})).toBe(2n)
    })
})
