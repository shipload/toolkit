import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskType} from '../index-module'
import {
    appliedTaskCount,
    hasPendingCapper,
    hasResolvable,
    isCapperTaskType,
    orderedTasks,
    unappliedTasks,
} from './schedule'

const T0 = '2026-06-19T00:00:00'
const NOW = new Date('2026-06-19T00:01:00.000Z')

function task(over: Partial<{type: number; duration: number}>) {
    return ServerContract.Types.task.from({
        type: over.type ?? TaskType.TRAVEL,
        duration: over.duration ?? 30,
        cancelable: 0,
        cargo: [],
        couplings: [],
    })
}

function entity(
    tasks: ReturnType<typeof task>[],
    holds: ServerContract.Types.hold[] = [],
    startedISO = T0
) {
    return ServerContract.Types.entity_info.from({
        projected_at: 0,
        type: 'ship',
        id: 1,
        owner: 'player.gm',
        entity_name: 'Ship 1',
        coordinates: {x: 0, y: 0, z: 0},
        item_id: 1,
        cargomass: 0,
        cargo: [],
        modules: [],
        lanes: [{lane_key: 0, schedule: {started: startedISO, tasks}}],
        gatherer_lanes: [],
        crafter_lanes: [],
        builder_lanes: [],
        loader_lanes: [],
        holds,
    })
}

function hold(kind: number) {
    return ServerContract.Types.hold.from({
        id: 1,
        kind,
        counterpart: {entity_type: 'ship', entity_id: 2},
        until: T0,
        incoming_mass: 0,
    })
}

describe('isCapperTaskType', () => {
    test('UNDEPLOY, DEMOLISH are cappers', () => {
        expect(isCapperTaskType(TaskType.UNDEPLOY)).toBe(true)
        expect(isCapperTaskType(TaskType.DEMOLISH)).toBe(true)
    })

    test('REFIT is not a capper', () => {
        expect(isCapperTaskType(TaskType.REFIT)).toBe(false)
    })

    test('non-capper task types are not cappers', () => {
        expect(isCapperTaskType(TaskType.TRAVEL)).toBe(false)
        expect(isCapperTaskType(TaskType.LOAD)).toBe(false)
    })
})

describe('hasPendingCapper', () => {
    test('false with no schedule', () => {
        expect(hasPendingCapper(entity([]))).toBe(false)
    })

    test('false with only non-capper tasks queued', () => {
        expect(hasPendingCapper(entity([task({type: TaskType.TRAVEL})]))).toBe(false)
    })

    test('true when a DEMOLISH task is queued anywhere in the lane', () => {
        const e = entity([task({type: TaskType.TRAVEL}), task({type: TaskType.DEMOLISH})])
        expect(hasPendingCapper(e)).toBe(true)
    })

    test('true when a DEMOLISH task is queued', () => {
        expect(hasPendingCapper(entity([task({type: TaskType.DEMOLISH})]))).toBe(true)
    })
})

describe('hasResolvable — capper gating', () => {
    test('a completed non-capper front is resolvable', () => {
        const e = entity([task({type: TaskType.TRAVEL, duration: 30})])
        expect(hasResolvable(e, NOW)).toBe(true)
    })

    test('a completed capper front with no holds is resolvable', () => {
        const e = entity([task({type: TaskType.DEMOLISH, duration: 30})])
        expect(hasResolvable(e, NOW)).toBe(true)
    })

    test('a completed capper front with a live hold is gated', () => {
        const e = entity([task({type: TaskType.DEMOLISH, duration: 30})], [hold(2)])
        expect(hasResolvable(e, NOW)).toBe(false)
    })

    test('a capper front clears once holds empty', () => {
        const withHold = entity([task({type: TaskType.DEMOLISH, duration: 30})], [hold(2)])
        const cleared = entity([task({type: TaskType.DEMOLISH, duration: 30})], [])
        expect(hasResolvable(withHold, NOW)).toBe(false)
        expect(hasResolvable(cleared, NOW)).toBe(true)
    })

    test('a live hold does not gate a non-capper front', () => {
        const e = entity([task({type: TaskType.TRAVEL, duration: 30})], [hold(2)])
        expect(hasResolvable(e, NOW)).toBe(true)
    })

    test('an in-progress front is not resolvable regardless of holds', () => {
        const e = entity([task({type: TaskType.DEMOLISH, duration: 3600})])
        expect(hasResolvable(e, NOW)).toBe(false)
    })
})

function anchoredEntity(anchorISO: string) {
    const e = entity([
        task({type: TaskType.TRAVEL, duration: 30}),
        task({type: TaskType.TRAVEL, duration: 30}),
        task({type: TaskType.TRAVEL, duration: 30}),
    ])
    return ServerContract.Types.entity_info.from({
        ...ServerContract.Types.entity_info.from(e),
        projected_at: anchorISO,
    })
}

describe('appliedTaskCount / unappliedTasks', () => {
    test('no anchor leaves every task unapplied', () => {
        const e = entity([task({duration: 30}), task({duration: 30})])
        expect(appliedTaskCount({lanes: e.lanes}, orderedTasks(e))).toBe(0)
        expect(unappliedTasks({lanes: e.lanes})).toHaveLength(2)
    })

    test('tasks completed at or before the anchor are already applied', () => {
        const e = anchoredEntity('2026-06-19T00:01:00')
        expect(appliedTaskCount(e, orderedTasks(e))).toBe(2)
        expect(unappliedTasks(e)).toHaveLength(1)
    })

    test('the anchor is inclusive, mirroring completed_task_count_at', () => {
        const e = anchoredEntity('2026-06-19T00:00:30')
        expect(appliedTaskCount(e, orderedTasks(e))).toBe(1)
    })

    test('a whole schedule finished before the anchor leaves nothing unapplied', () => {
        const e = anchoredEntity('2026-06-19T12:00:00')
        expect(unappliedTasks(e)).toHaveLength(0)
    })
})
