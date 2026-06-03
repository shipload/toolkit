import {describe, expect, test} from 'bun:test'
import {Int64, Name, TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {ServerContract} from '../../src/contracts'
import {ITEM_WAREHOUSE_T1_PACKED} from '../../src/data/item-ids'
import {TaskType} from '../../src/types'

const COORDS = ServerContract.Types.coordinates.from({x: Int64.from(0), y: Int64.from(0)})
const OWNER = Name.from('tester.gm')
const PLATE = 10001
const FRAME = 10002

function targetRef(
    type: 'plot' | 'warehouse',
    id: number
): InstanceType<typeof ServerContract.Types.entity_ref> {
    return ServerContract.Types.entity_ref.from({
        entity_type: Name.from(type),
        entity_id: UInt64.from(id),
    })
}

function makeTask(opts: {
    type: TaskType
    duration: number
    target?: {type: 'plot' | 'warehouse'; id: number}
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
        entitytarget: opts.target ? targetRef(opts.target.type, opts.target.id) : undefined,
    })
}

function makeHauler(
    id: number,
    tasks: InstanceType<typeof ServerContract.Types.task>[]
): InstanceType<typeof ServerContract.Types.entity_info> {
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(id),
        type: Name.from('ship'),
        item_id: UInt16.from(1000),
        owner: OWNER,
        entity_name: `Hauler #${id}`,
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
                      started: TimePoint.from('2026-06-02T10:00:00.000'),
                      tasks,
                  }),
    })
}

describe('ConstructionManager.reservationsFrom', () => {
    const mgr = new ConstructionManager({} as never)

    test('returns empty when source has no tasks', () => {
        const hauler = makeHauler(10, [])
        expect(mgr.reservationsFrom(UInt64.from(10), [hauler])).toEqual([])
    })

    test('returns LOAD/UNLOAD tasks owned by the source entity', () => {
        const hauler = makeHauler(10, [
            makeTask({
                type: TaskType.LOAD,
                duration: 60,
                target: {type: 'plot', id: 1101},
                cargo: [{itemId: PLATE, qty: 5}],
            }),
            makeTask({
                type: TaskType.LOAD,
                duration: 60,
                target: {type: 'plot', id: 1102},
                cargo: [{itemId: FRAME, qty: 3}],
            }),
        ])
        const result = mgr.reservationsFrom(UInt64.from(10), [hauler])
        expect(result.map((r) => [Number(r.targetEntityId), r.itemId, r.quantity])).toEqual([
            [1101, PLATE, 5],
            [1102, FRAME, 3],
        ])
    })

    test('ignores tasks owned by other entities', () => {
        const a = makeHauler(10, [])
        const b = makeHauler(11, [
            makeTask({
                type: TaskType.LOAD,
                duration: 60,
                target: {type: 'plot', id: 1101},
                cargo: [{itemId: PLATE, qty: 5}],
            }),
        ])
        expect(mgr.reservationsFrom(UInt64.from(10), [a, b])).toEqual([])
    })

    test('aggregates same-item reservations to the same target into one row', () => {
        const hauler = makeHauler(10, [
            makeTask({
                type: TaskType.LOAD,
                duration: 60,
                target: {type: 'plot', id: 1101},
                cargo: [{itemId: PLATE, qty: 3}],
            }),
            makeTask({
                type: TaskType.LOAD,
                duration: 60,
                target: {type: 'plot', id: 1101},
                cargo: [{itemId: PLATE, qty: 4}],
            }),
        ])
        const result = mgr.reservationsFrom(UInt64.from(10), [hauler])
        expect(result).toHaveLength(1)
        expect(result[0].quantity).toBe(7)
    })

    test('ignores non-LOAD/UNLOAD tasks', () => {
        const hauler = makeHauler(10, [
            makeTask({type: TaskType.TRAVEL, duration: 60, target: {type: 'plot', id: 1101}}),
        ])
        expect(mgr.reservationsFrom(UInt64.from(10), [hauler])).toEqual([])
    })
})

describe('partitionSources netting against reservations', () => {
    const mgr = new ConstructionManager({} as never)
    const PLOT_ID = UInt64.from(1101)

    function makePlot() {
        return ServerContract.Types.entity_row.from({
            id: PLOT_ID,
            kind: Name.from('plot'),
            item_id: UInt16.from(ITEM_WAREHOUSE_T1_PACKED),
            owner: OWNER,
            name: '',
            stats: UInt64.from(0),
            capacity: UInt32.from(140),
            cargomass: UInt32.from(0),
            coordinates: COORDS,
            modules: [],
        })
    }

    function makeLoaderShip(
        id: number,
        schedule?: InstanceType<typeof ServerContract.Types.schedule>
    ) {
        return ServerContract.Types.entity_info.from({
            id: UInt64.from(id),
            type: Name.from('ship'),
            item_id: UInt16.from(1000),
            owner: OWNER,
            entity_name: `Ship #${id}`,
            cargomass: UInt32.from(0),
            cargo: [],
            coordinates: COORDS,
            loaders: ServerContract.Types.loader_stats.from({
                mass: UInt32.from(50_000),
                thrust: UInt16.from(0),
                quantity: UInt8.from(1),
            }),
            is_idle: !schedule,
            current_task_elapsed: UInt32.from(0),
            current_task_remaining: UInt32.from(0),
            pending_tasks: [],
            modules: [],
            schedule,
        })
    }

    function makeCargoRow(entityId: number, rowId: number, itemId: number, qty: number) {
        return ServerContract.Types.cargo_row.from({
            id: UInt64.from(rowId),
            entity_id: UInt64.from(entityId),
            item_id: UInt64.from(itemId),
            quantity: UInt64.from(qty),
            stats: UInt64.from(0),
            modules: [],
        })
    }

    test('available is unchanged when source has no outgoing reservations', () => {
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!
        const ship = makeLoaderShip(10)
        const cargo = [makeCargoRow(10, 100, PLATE, 80)]

        const sources = mgr.eligibleSources(target, [ship], cargo)
        expect(sources[0].relevantCargo[0].available).toBe(80)
        expect(sources[0].relevantCargo[0].reserved).toBe(0)
    })

    test('available is net of reservations targeting other plots', () => {
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!
        const ship = makeLoaderShip(
            10,
            ServerContract.Types.schedule.from({
                started: TimePoint.from('2026-06-02T10:00:00.000'),
                tasks: [
                    makeTask({
                        type: TaskType.LOAD,
                        duration: 60,
                        target: {type: 'plot', id: 9999},
                        cargo: [{itemId: PLATE, qty: 30}],
                    }),
                ],
            })
        )
        const cargo = [makeCargoRow(10, 100, PLATE, 80)]

        const sources = mgr.eligibleSources(target, [ship], cargo)
        expect(sources[0].relevantCargo[0].available).toBe(50)
        expect(sources[0].relevantCargo[0].reserved).toBe(30)
    })

    test('drops a source whose cargo is fully reserved elsewhere', () => {
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!
        const ship = makeLoaderShip(
            10,
            ServerContract.Types.schedule.from({
                started: TimePoint.from('2026-06-02T10:00:00.000'),
                tasks: [
                    makeTask({
                        type: TaskType.LOAD,
                        duration: 60,
                        target: {type: 'plot', id: 9999},
                        cargo: [{itemId: PLATE, qty: 80}],
                    }),
                ],
            })
        )
        const cargo = [makeCargoRow(10, 100, PLATE, 80)]

        const sources = mgr.eligibleSources(target, [ship], cargo)
        expect(sources).toEqual([])
    })
})
