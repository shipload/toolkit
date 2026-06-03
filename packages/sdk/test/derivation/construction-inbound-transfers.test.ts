import {describe, expect, test} from 'bun:test'
import {Int64, Name, TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {ServerContract} from '../../src/contracts'
import {TaskType} from '../../src/types'

const COORDS = ServerContract.Types.coordinates.from({x: Int64.from(0), y: Int64.from(0)})
const OWNER = Name.from('tester.gm')
const PLOT_ID = UInt64.from(1101)
const PLATE = 10001
const FRAME = 10002

function plotRef(id = PLOT_ID): InstanceType<typeof ServerContract.Types.entity_ref> {
    return ServerContract.Types.entity_ref.from({
        entity_type: Name.from('plot'),
        entity_id: id,
    })
}

function makeTask(opts: {
    type: TaskType
    duration: number
    targetId?: UInt64
    cargo?: Array<{itemId: number; qty: number}>
}): InstanceType<typeof ServerContract.Types.task> {
    return ServerContract.Types.task.from({
        type: UInt8.from(opts.type),
        duration: UInt32.from(opts.duration),
        cancelable: UInt8.from(2),
        cargo: (opts.cargo ?? []).map((c) =>
            ServerContract.Types.cargo_item.from({
                item_id: UInt16.from(c.itemId),
                quantity: UInt32.from(c.qty),
                stats: UInt64.from(0),
                modules: [],
            })
        ),
        entitytarget: opts.targetId ? plotRef(opts.targetId) : undefined,
    })
}

function makeHauler(
    id: number,
    tasks: InstanceType<typeof ServerContract.Types.task>[],
    scheduleStart: TimePoint,
    name = `Hauler #${id}`
): InstanceType<typeof ServerContract.Types.entity_info> {
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(id),
        type: Name.from('ship'),
        item_id: UInt16.from(1000),
        owner: OWNER,
        entity_name: name,
        cargomass: UInt32.from(0),
        cargo: [],
        coordinates: COORDS,
        modules: [],
        is_idle: tasks.length === 0,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
        schedule:
            tasks.length === 0
                ? undefined
                : ServerContract.Types.schedule.from({
                      started: scheduleStart,
                      tasks,
                  }),
    })
}

const SCHEDULE_START = TimePoint.from('2026-06-02T10:00:00.000')
const NOW = new Date('2026-06-02T10:00:00.000Z')

describe('ConstructionManager.inboundTransfersTo', () => {
    const mgr = new ConstructionManager({} as never)

    test('returns empty when no entity has a task targeting the plot', () => {
        const idle = makeHauler(10, [], SCHEDULE_START)
        expect(mgr.inboundTransfersTo(PLOT_ID, [idle], NOW)).toEqual([])
    })

    test('aggregates a single LOAD task targeting the plot', () => {
        const hauler = makeHauler(
            10,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 132,
                    targetId: PLOT_ID,
                    cargo: [{itemId: PLATE, qty: 5}],
                }),
            ],
            SCHEDULE_START
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result).toEqual([
            {
                sourceEntityId: UInt64.from(10),
                sourceEntityType: Name.from('ship'),
                sourceName: 'Hauler #10',
                itemId: PLATE,
                quantity: 5,
                etaSeconds: 132,
            },
        ])
    })

    test('aggregates UNLOAD tasks the same as LOAD', () => {
        const hauler = makeHauler(
            11,
            [
                makeTask({
                    type: TaskType.UNLOAD,
                    duration: 60,
                    targetId: PLOT_ID,
                    cargo: [{itemId: FRAME, qty: 3}],
                }),
            ],
            SCHEDULE_START
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result[0].itemId).toBe(FRAME)
        expect(result[0].quantity).toBe(3)
        expect(result[0].etaSeconds).toBe(60)
    })

    test('ignores tasks targeting a different plot', () => {
        const hauler = makeHauler(
            12,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    targetId: UInt64.from(9999),
                    cargo: [{itemId: PLATE, qty: 7}],
                }),
            ],
            SCHEDULE_START
        )
        expect(mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)).toEqual([])
    })

    test('ignores non-LOAD/UNLOAD tasks even when targeted at the plot', () => {
        const hauler = makeHauler(
            13,
            [
                makeTask({
                    type: TaskType.TRAVEL,
                    duration: 60,
                    targetId: PLOT_ID,
                }),
            ],
            SCHEDULE_START
        )
        expect(mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)).toEqual([])
    })

    test('etaSeconds includes preceding task durations', () => {
        const hauler = makeHauler(
            14,
            [
                makeTask({type: TaskType.TRAVEL, duration: 90}),
                makeTask({type: TaskType.RECHARGE, duration: 30}),
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    targetId: PLOT_ID,
                    cargo: [{itemId: PLATE, qty: 4}],
                }),
            ],
            SCHEDULE_START
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result[0].etaSeconds).toBe(180)
    })

    test('etaSeconds subtracts elapsed time when schedule started in the past', () => {
        const startedEarlier = TimePoint.from('2026-06-02T09:59:00.000')
        const hauler = makeHauler(
            15,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 132,
                    targetId: PLOT_ID,
                    cargo: [{itemId: PLATE, qty: 2}],
                }),
            ],
            startedEarlier
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result[0].etaSeconds).toBe(72)
    })

    test('clamps etaSeconds to zero rather than negative when the task is already complete', () => {
        const startedEarlier = TimePoint.from('2026-06-02T09:50:00.000')
        const hauler = makeHauler(
            16,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    targetId: PLOT_ID,
                    cargo: [{itemId: PLATE, qty: 1}],
                }),
            ],
            startedEarlier
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result[0].etaSeconds).toBe(0)
    })

    test('aggregates multi-item cargo within a single task into separate rows', () => {
        const hauler = makeHauler(
            17,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    targetId: PLOT_ID,
                    cargo: [
                        {itemId: PLATE, qty: 3},
                        {itemId: FRAME, qty: 2},
                    ],
                }),
            ],
            SCHEDULE_START
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result).toHaveLength(2)
        expect(result.map((r) => [r.itemId, r.quantity])).toEqual([
            [PLATE, 3],
            [FRAME, 2],
        ])
    })

    test('aggregates multiple stacks of the same item from the same source into one row', () => {
        const hauler = makeHauler(
            18,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    targetId: PLOT_ID,
                    cargo: [
                        {itemId: PLATE, qty: 3},
                        {itemId: PLATE, qty: 4},
                    ],
                }),
            ],
            SCHEDULE_START
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result).toHaveLength(1)
        expect(result[0].quantity).toBe(7)
    })

    test('returns one row per (source, item) across multiple sources', () => {
        const a = makeHauler(
            19,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 100,
                    targetId: PLOT_ID,
                    cargo: [{itemId: PLATE, qty: 5}],
                }),
            ],
            SCHEDULE_START,
            'Hauler A'
        )
        const b = makeHauler(
            20,
            [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 200,
                    targetId: PLOT_ID,
                    cargo: [{itemId: PLATE, qty: 3}],
                }),
            ],
            SCHEDULE_START,
            'Hauler B'
        )
        const result = mgr.inboundTransfersTo(PLOT_ID, [a, b], NOW)
        expect(result).toHaveLength(2)
        expect(result.map((r) => r.sourceName).sort()).toEqual(['Hauler A', 'Hauler B'])
    })
})
