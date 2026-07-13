import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskType, TaskCancelable} from '../index-module'
import {cancelEligibility, CancelBlockReason} from './cancel'

const T0 = '2026-06-19T00:00:00'

function task(over: Partial<{type: number; duration: number; cancelable: number; group: number}>) {
    return ServerContract.Types.task.from({
        type: over.type ?? TaskType.TRAVEL,
        duration: over.duration ?? 100,
        cancelable: over.cancelable ?? TaskCancelable.BEFORE_START,
        cargo: [],
        couplings: [],
        ...(over.group ? {entitygroup: over.group} : {}),
    })
}

function entity(tasks: ReturnType<typeof task>[], startedISO = T0) {
    return ServerContract.Types.entity_info.from({
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
        holds: [],
    })
}

describe('cancelEligibility — local gates', () => {
    const now = new Date('2026-06-19T00:00:10.000Z') // 10s in: task 0 running, task 1 upcoming

    test('cancelling the last upcoming task: ok, count 1', () => {
        const e = entity([task({}), task({})])
        const plan = cancelEligibility(e, 0, 1, {now})
        expect(plan.ok).toBe(true)
        expect(plan.range.count).toBe(1)
        expect(plan.range.taskIndices).toEqual([1])
    })

    test('NEVER task is blocked', () => {
        const e = entity([
            task({}),
            task({cancelable: TaskCancelable.NEVER, type: TaskType.GATHER}),
        ])
        expect(cancelEligibility(e, 0, 1, {now}).blockedReason).toBe(CancelBlockReason.TASK_NEVER)
    })

    test('BEFORE_START task that is running is blocked', () => {
        const e = entity([task({cancelable: TaskCancelable.BEFORE_START, duration: 100})])
        // task 0 is running at now=10s
        expect(cancelEligibility(e, 0, 0, {now}).blockedReason).toBe(
            CancelBlockReason.BEFORE_START_RUNNING
        )
    })

    test('done task is blocked', () => {
        const e = entity([task({duration: 5})]) // completes at 5s, now=10s
        expect(cancelEligibility(e, 0, 0, {now}).blockedReason).toBe(CancelBlockReason.DONE)
    })

    test('unknown lane: count 0, ok false', () => {
        const e = entity([task({})])
        const plan = cancelEligibility(e, 9, 0, {now})
        expect(plan.ok).toBe(false)
        expect(plan.range.count).toBe(0)
    })

    test('multi-task range: 4 tasks, fromIndex 1 yields count 3', () => {
        const e = entity([
            task({duration: 100}),
            task({cancelable: TaskCancelable.ALWAYS, duration: 100}),
            task({cancelable: TaskCancelable.ALWAYS, duration: 100}),
            task({cancelable: TaskCancelable.ALWAYS, duration: 100}),
        ])
        const plan = cancelEligibility(e, 0, 1, {now})
        expect(plan.ok).toBe(true)
        expect(plan.range.count).toBe(3)
        expect(plan.range.taskIndices).toEqual([1, 2, 3])
    })
})

describe('cancelEligibility — linked tasks', () => {
    const now = new Date('2026-06-19T00:00:10.000Z')
    test('range containing a linked (entitygroup) task is blocked', () => {
        const e = entity([task({}), task({group: 42}), task({})])
        expect(cancelEligibility(e, 0, 0, {now}).blockedReason).toBe(
            CancelBlockReason.CONTAINS_LINKED_TASK
        )
    })
    test('task after the linked one cancels normally', () => {
        const e = entity([task({}), task({group: 42}), task({})])
        expect(cancelEligibility(e, 0, 2, {now}).ok).toBe(true)
    })
})

const HOLD_PULL = 1
const HOLD_BUILD = 4
function loadTask(giverType: string, giverId: number, holdId: number, qty: number) {
    return ServerContract.Types.task.from({
        type: TaskType.LOAD,
        duration: 100,
        cancelable: TaskCancelable.ALWAYS,
        cargo: [{item_id: 7, stats: 0, modules: [], quantity: qty}],
        couplings: [
            {
                counterpart: {entity_type: giverType, entity_id: giverId},
                hold: holdId,
                kind: HOLD_PULL,
            },
        ],
    })
}

describe('cancelEligibility — effects', () => {
    const now = new Date('2026-06-19T00:00:10.000Z')

    test('abandonsRunning true when the front of range is a running ALWAYS task', () => {
        const e = entity([
            task({cancelable: TaskCancelable.ALWAYS, type: TaskType.RECHARGE, duration: 100}),
        ])
        expect(cancelEligibility(e, 0, 0, {now}).effects.abandonsRunning).toBe(true)
    })

    test('buildplot cancel reports keepsPlotDeposits', () => {
        const e = entity([
            ServerContract.Types.task.from({
                type: TaskType.BUILDPLOT,
                duration: 100,
                cancelable: TaskCancelable.ALWAYS,
                cargo: [],
                couplings: [
                    {
                        counterpart: {entity_type: 'plot', entity_id: 55},
                        hold: 0,
                        kind: HOLD_BUILD,
                    },
                ],
            }),
        ])
        const plan = cancelEligibility(e, 0, 0, {now})
        expect(plan.effects.keepsPlotDeposits?.plot.entity_id.toNumber()).toBe(55)
    })

    test('PULL load cancel refunds cargo to the giver', () => {
        const lt = loadTask('warehouse', 6, 1, 4)
        const upcoming = new Date('2026-06-18T23:59:50.000Z')
        const e = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'Ship 1',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [{lane_key: 0, schedule: {started: T0, tasks: [lt]}}],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [
                {
                    id: 1,
                    kind: HOLD_PULL,
                    counterpart: {entity_type: 'warehouse', entity_id: 6},
                    until: T0,
                    incoming_mass: 0,
                },
            ],
        })
        const plan = cancelEligibility(e, 0, 0, {now: upcoming})
        expect(plan.effects.refunds[0]?.giver.entity_id.toNumber()).toBe(6)
        expect(plan.effects.refunds[0]?.cargo[0].quantity.toNumber()).toBe(4)
    })

    test('PULL load cancel populates releasedHolds with kind and counterpart', () => {
        const lt = loadTask('warehouse', 6, 1, 4)
        const upcoming = new Date('2026-06-18T23:59:50.000Z')
        const e = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'Ship 1',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [{lane_key: 0, schedule: {started: T0, tasks: [lt]}}],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [
                {
                    id: 1,
                    kind: HOLD_PULL,
                    counterpart: {entity_type: 'warehouse', entity_id: 6},
                    until: T0,
                    incoming_mass: 0,
                },
            ],
        })
        const plan = cancelEligibility(e, 0, 0, {now: upcoming})
        expect(plan.effects.releasedHolds[0]?.kind).toBe(1)
        expect(plan.effects.releasedHolds[0]?.counterpart.entity_id.toNumber()).toBe(6)
    })

    test('uncoupled task emits no releasedHolds entry', () => {
        const upcoming = new Date('2026-06-18T23:59:50.000Z')
        const e = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'Ship 1',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [
                {
                    lane_key: 0,
                    schedule: {
                        started: T0,
                        tasks: [task({cancelable: TaskCancelable.ALWAYS, type: TaskType.LOAD})],
                    },
                },
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        const plan = cancelEligibility(e, 0, 0, {now: upcoming})
        expect(plan.effects.releasedHolds).toHaveLength(0)
        expect(plan.effects.refunds).toHaveLength(0)
    })
})

describe('cancelEligibility — feasibility', () => {
    const upcoming = new Date('2026-06-18T23:59:50.000Z')

    test('WOULD_STRAND when cancelling a producer a later consumer needs', () => {
        const producer = ServerContract.Types.task.from({
            type: TaskType.LOAD,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [{item_id: 7, stats: 0, modules: [], quantity: 2}],
            couplings: [],
        })
        const consumer = ServerContract.Types.task.from({
            type: TaskType.CRAFT,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [
                {item_id: 7, stats: 0, modules: [], quantity: 2},
                {item_id: 9, stats: 0, modules: [], quantity: 1},
            ],
            couplings: [],
        })
        const e = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'S',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [
                {
                    lane_key: 1,
                    schedule: {started: '2026-06-19T00:00:00', tasks: [producer]},
                },
                {
                    lane_key: 2,
                    schedule: {started: '2026-06-19T00:00:00', tasks: [consumer]},
                },
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        expect(cancelEligibility(e, 1, 0, {now: upcoming}).blockedReason).toBe(
            CancelBlockReason.WOULD_STRAND
        )
    })

    test('benign cancel on independent lane does NOT strand', () => {
        const producer = ServerContract.Types.task.from({
            type: TaskType.LOAD,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [{item_id: 7, stats: 0, modules: [], quantity: 2}],
            couplings: [],
        })
        const independent = ServerContract.Types.task.from({
            type: TaskType.TRAVEL,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [],
            couplings: [],
        })
        const e = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'S',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [
                {lane_key: 1, schedule: {started: '2026-06-19T00:00:00', tasks: [producer]}},
                {lane_key: 2, schedule: {started: '2026-06-19T00:00:00', tasks: [independent]}},
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        expect(cancelEligibility(e, 2, 0, {now: upcoming}).ok).toBe(true)
    })

    test('WOULD_STRAND when cancelling producer of a MODULAR cargo the consumer needs', () => {
        const moduledCargo = {item_id: 7, stats: 0, modules: [{type: 3}], quantity: 2}
        const producer = ServerContract.Types.task.from({
            type: TaskType.LOAD,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [moduledCargo],
            couplings: [],
        })
        const consumer = ServerContract.Types.task.from({
            type: TaskType.CRAFT,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [moduledCargo, {item_id: 9, stats: 0, modules: [], quantity: 1}],
            couplings: [],
        })
        const e = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'S',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [
                {lane_key: 1, schedule: {started: '2026-06-19T00:00:00', tasks: [producer]}},
                {lane_key: 2, schedule: {started: '2026-06-19T00:00:00', tasks: [consumer]}},
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        expect(cancelEligibility(e, 1, 0, {now: upcoming}).blockedReason).toBe(
            CancelBlockReason.WOULD_STRAND
        )
    })
})
