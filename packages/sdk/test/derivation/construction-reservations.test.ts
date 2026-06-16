import {describe, expect, test} from 'bun:test'
import {Name, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {ServerContract} from '../../src/contracts'
import {ITEM_WAREHOUSE_T1_PACKED} from '../../src/data/item-ids'
import {TaskType} from '../../src/types'
import {
    COORDS,
    entityRef,
    makeHauler,
    makeTask,
    OWNER,
    SCHEDULE_START,
} from './construction-fixtures'

const PLATE = 10001
const FRAME = 10002

describe('ConstructionManager.reservationsFrom', () => {
    const mgr = new ConstructionManager({} as never)

    test('returns empty when source has no tasks', () => {
        const hauler = makeHauler({id: 10})
        expect(mgr.reservationsFrom(UInt64.from(10), [hauler])).toEqual([])
    })

    test('reserves outgoing UNLOAD (push) cargo per-item', () => {
        const hauler = makeHauler({
            id: 10,
            tasks: [
                makeTask({
                    type: TaskType.UNLOAD,
                    duration: 60,
                    target: entityRef('plot', 1101),
                    cargo: [{itemId: PLATE, qty: 5}],
                }),
                makeTask({
                    type: TaskType.UNLOAD,
                    duration: 60,
                    target: entityRef('plot', 1102),
                    cargo: [{itemId: FRAME, qty: 3}],
                }),
            ],
        })
        const result = mgr.reservationsFrom(UInt64.from(10), [hauler])
        expect(result.map((r) => [Number(r.targetEntityId), r.itemId, r.quantity])).toEqual([
            [1101, PLATE, 5],
            [1102, FRAME, 3],
        ])
    })

    test('does not reserve incoming LOAD (pull) cargo', () => {
        const hauler = makeHauler({
            id: 10,
            tasks: [
                makeTask({
                    type: TaskType.LOAD,
                    duration: 60,
                    target: entityRef('plot', 1101),
                    cargo: [{itemId: PLATE, qty: 5}],
                }),
            ],
        })
        expect(mgr.reservationsFrom(UInt64.from(10), [hauler])).toEqual([])
    })

    test('ignores tasks owned by other entities', () => {
        const a = makeHauler({id: 10})
        const b = makeHauler({
            id: 11,
            tasks: [
                makeTask({
                    type: TaskType.UNLOAD,
                    duration: 60,
                    target: entityRef('plot', 1101),
                    cargo: [{itemId: PLATE, qty: 5}],
                }),
            ],
        })
        expect(mgr.reservationsFrom(UInt64.from(10), [a, b])).toEqual([])
    })

    test('aggregates same-item reservations to the same target into one row', () => {
        const hauler = makeHauler({
            id: 10,
            tasks: [
                makeTask({
                    type: TaskType.UNLOAD,
                    duration: 60,
                    target: entityRef('plot', 1101),
                    cargo: [{itemId: PLATE, qty: 3}],
                }),
                makeTask({
                    type: TaskType.UNLOAD,
                    duration: 60,
                    target: entityRef('plot', 1101),
                    cargo: [{itemId: PLATE, qty: 4}],
                }),
            ],
        })
        const result = mgr.reservationsFrom(UInt64.from(10), [hauler])
        expect(result).toHaveLength(1)
        expect(result[0].quantity).toBe(7)
    })

    test('ignores non-UNLOAD tasks', () => {
        const hauler = makeHauler({
            id: 10,
            tasks: [
                makeTask({type: TaskType.TRAVEL, duration: 60, target: entityRef('plot', 1101)}),
            ],
        })
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
            lanes: [],
            holds: [],
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
            modules: [],
            lanes: schedule
                ? [ServerContract.Types.lane.from({lane_key: UInt8.from(0), schedule})]
                : [],
            holds: [],
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

    test('available is net of UNLOAD reservations targeting other plots', () => {
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!
        const ship = makeLoaderShip(
            10,
            ServerContract.Types.schedule.from({
                started: SCHEDULE_START,
                tasks: [
                    makeTask({
                        type: TaskType.UNLOAD,
                        duration: 60,
                        target: entityRef('plot', 9999),
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

    test('a pending LOAD does not reserve the source rows', () => {
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!
        const ship = makeLoaderShip(
            10,
            ServerContract.Types.schedule.from({
                started: SCHEDULE_START,
                tasks: [
                    makeTask({
                        type: TaskType.LOAD,
                        duration: 60,
                        target: entityRef('plot', 9999),
                        cargo: [{itemId: PLATE, qty: 30}],
                    }),
                ],
            })
        )
        const cargo = [makeCargoRow(10, 100, PLATE, 80)]

        const sources = mgr.eligibleSources(target, [ship], cargo)
        expect(sources[0].relevantCargo[0].available).toBe(80)
        expect(sources[0].relevantCargo[0].reserved).toBe(0)
    })

    test('drops a source whose cargo is fully reserved by an UNLOAD elsewhere', () => {
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!
        const ship = makeLoaderShip(
            10,
            ServerContract.Types.schedule.from({
                started: SCHEDULE_START,
                tasks: [
                    makeTask({
                        type: TaskType.UNLOAD,
                        duration: 60,
                        target: entityRef('plot', 9999),
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
