import {describe, expect, test} from 'bun:test'
import {Name, TimePoint, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {TaskType} from '../../src/types'
import {entityRef, makeHauler, makeTask} from './construction-fixtures'

const PLOT_ID = UInt64.from(1101)
const PLATE = 10001
const FRAME = 10002

const plotRef = (id: UInt64 = PLOT_ID) => entityRef('plot', id)
const NOW = new Date('2026-06-02T10:00:00.000Z')

describe('ConstructionManager.inboundTransfersTo', () => {
    const mgr = new ConstructionManager({} as never)

    test('returns empty when no entity has a task targeting the plot', () => {
        const idle = makeHauler({id: 10})
        expect(mgr.inboundTransfersTo(PLOT_ID, [idle], NOW)).toEqual([])
    })

    test('aggregates a single LOAD task targeting the plot', () => {
        const hauler = makeHauler({
            id: 10,
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 132,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 5}],
                }),
            ],
        })
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
        const hauler = makeHauler({
            id: 11,
            tasks: [
                makeTask({
                    type: TaskType.UNLOAD,
                    duration: 60,
                    target: plotRef(),
                    cargo: [{itemId: FRAME, qty: 3}],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result[0].itemId).toBe(FRAME)
        expect(result[0].quantity).toBe(3)
        expect(result[0].etaSeconds).toBe(60)
    })

    test('ignores tasks targeting a different plot', () => {
        const hauler = makeHauler({
            id: 12,
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: plotRef(UInt64.from(9999)),
                    cargo: [{itemId: PLATE, qty: 7}],
                }),
            ],
        })
        expect(mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)).toEqual([])
    })

    test('ignores non-LOAD/UNLOAD tasks even when targeted at the plot', () => {
        const hauler = makeHauler({
            id: 13,
            tasks: [makeTask({type: TaskType.TRAVEL, duration: 60, target: plotRef()})],
        })
        expect(mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)).toEqual([])
    })

    test('etaSeconds includes preceding task durations', () => {
        const hauler = makeHauler({
            id: 14,
            tasks: [
                makeTask({type: TaskType.TRAVEL, duration: 90}),
                makeTask({type: TaskType.RECHARGE, duration: 30}),
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 4}],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result[0].etaSeconds).toBe(180)
    })

    test('etaSeconds subtracts elapsed time when schedule started in the past', () => {
        const hauler = makeHauler({
            id: 15,
            scheduleStart: TimePoint.from('2026-06-02T09:59:00.000'),
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 132,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 2}],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result[0].etaSeconds).toBe(72)
    })

    test('excludes a transfer whose projected delivery is already in the past', () => {
        const hauler = makeHauler({
            id: 16,
            scheduleStart: TimePoint.from('2026-06-02T09:50:00.000'),
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 1}],
                }),
            ],
        })
        expect(mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)).toEqual([])
    })

    test('keeps a transfer whose projected delivery lands exactly at now (eta 0)', () => {
        const hauler = makeHauler({
            id: 161,
            scheduleStart: TimePoint.from('2026-06-02T09:59:00.000'),
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 1}],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result).toHaveLength(1)
        expect(result[0].etaSeconds).toBe(0)
    })

    test('excludes completed transfers but keeps later still-pending ones in the same schedule', () => {
        const hauler = makeHauler({
            id: 162,
            scheduleStart: TimePoint.from('2026-06-02T09:55:00.000'),
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 800}],
                }),
                makeTask({type: TaskType.TRAVEL, duration: 600}),
                makeTask({
                    type: TaskType.LOAD,
                    duration: 120,
                    target: plotRef(),
                    cargo: [{itemId: FRAME, qty: 4}],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result).toHaveLength(1)
        expect(result[0].itemId).toBe(FRAME)
        expect(result[0].quantity).toBe(4)
    })

    test('aggregates multi-item cargo within a single task into separate rows', () => {
        const hauler = makeHauler({
            id: 17,
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: plotRef(),
                    cargo: [
                        {itemId: PLATE, qty: 3},
                        {itemId: FRAME, qty: 2},
                    ],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result).toHaveLength(2)
        expect(result.map((r) => [r.itemId, r.quantity])).toEqual([
            [PLATE, 3],
            [FRAME, 2],
        ])
    })

    test('aggregates multiple stacks of the same item from the same source into one row', () => {
        const hauler = makeHauler({
            id: 18,
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: plotRef(),
                    cargo: [
                        {itemId: PLATE, qty: 3},
                        {itemId: PLATE, qty: 4},
                    ],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [hauler], NOW)
        expect(result).toHaveLength(1)
        expect(result[0].quantity).toBe(7)
    })

    test('returns one row per (source, item) across multiple sources', () => {
        const a = makeHauler({
            id: 19,
            name: 'Hauler A',
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 100,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 5}],
                }),
            ],
        })
        const b = makeHauler({
            id: 20,
            name: 'Hauler B',
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 200,
                    target: plotRef(),
                    cargo: [{itemId: PLATE, qty: 3}],
                }),
            ],
        })
        const result = mgr.inboundTransfersTo(PLOT_ID, [a, b], NOW)
        expect(result).toHaveLength(2)
        expect(result.map((r) => r.sourceName).sort()).toEqual(['Hauler A', 'Hauler B'])
    })
})
