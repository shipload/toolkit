import {describe, expect, test} from 'bun:test'
import {Int64, Name, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {ServerContract} from '../../src/contracts'
import {ITEM_WAREHOUSE_T1_PACKED} from '../../src/data/item-ids'
import {MODULE_CRAFTER, MODULE_LOADER} from '../../src/capabilities/modules'

describe('ConstructionManager.getTarget', () => {
    test('returns BuildableTarget for plot entity', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = ServerContract.Types.entity_row.from({
            id: UInt64.from(1),
            kind: Name.from('plot'),
            item_id: UInt16.from(ITEM_WAREHOUSE_T1_PACKED),
            owner: Name.from('alice.gm'),
            name: '',
            stats: UInt64.from(0),
            capacity: UInt32.from(140),
            cargomass: UInt32.from(0),
            coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
            modules: [],
            lanes: [],
            holds: [],
        })

        const target = mgr.getTarget(plot, [])

        expect(target).not.toBeNull()
        expect(target!.entityId.equals(UInt64.from(1))).toBe(true)
    })

    test('returns null for non-construction entities', () => {
        const mgr = new ConstructionManager({} as any)
        const ship = ServerContract.Types.entity_row.from({
            id: UInt64.from(2),
            kind: Name.from('ship'),
            item_id: UInt16.from(1000),
            owner: Name.from('alice.gm'),
            name: '',
            stats: UInt64.from(0),
            capacity: UInt32.from(1000),
            cargomass: UInt32.from(0),
            coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
            modules: [],
            lanes: [],
            holds: [],
        })

        expect(mgr.getTarget(ship, [])).toBeNull()
    })
})

describe('ConstructionManager.eligibleSources / unreachableSources', () => {
    const OWNER = Name.from('alice.gm')
    const COORDS = ServerContract.Types.coordinates.from({x: Int64.from(4), y: Int64.from(3)})
    const INPUT_ITEM_ID = 10001

    function makePlot() {
        return ServerContract.Types.entity_row.from({
            id: UInt64.from(1),
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

    function makeShipWithLoader(id: number, owner: Name, coords: ServerContract.Types.coordinates) {
        return ServerContract.Types.entity_info.from({
            id: UInt64.from(id),
            type: Name.from('ship'),
            item_id: UInt16.from(1000),
            owner,
            entity_name: '',
            cargomass: UInt32.from(0),
            cargo: [],
            coordinates: coords,
            is_idle: true,
            current_task_elapsed: UInt32.from(0),
            current_task_remaining: UInt32.from(0),
            pending_tasks: [],
            lanes: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [
                ServerContract.Types.loader_lane.from({
                    slot_index: UInt8.from(0),
                    mass: UInt32.from(50_000),
                    thrust: UInt16.from(0),
                    output_pct: UInt16.from(100),
                }),
            ],
            holds: [],
            modules: [
                ServerContract.Types.module_entry.from({
                    type: UInt8.from(MODULE_LOADER),
                    installed: ServerContract.Types.packed_module.from({
                        item_id: UInt16.from(10103),
                        stats: UInt64.from(0),
                    }),
                }),
            ],
        })
    }

    function makeCargoRow(
        entityId: number,
        rowId: number,
        itemId: number,
        qty: number,
        stats: bigint | number = 0n,
        modules: ServerContract.Types.module_entry[] = []
    ) {
        return ServerContract.Types.cargo_row.from({
            id: UInt64.from(rowId),
            entity_id: UInt64.from(entityId),
            item_id: UInt64.from(itemId),
            quantity: UInt64.from(qty),
            stats: UInt64.from(stats),
            modules,
        })
    }

    test('eligible sources are owned entities at coords with loaders AND relevant cargo', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!

        const hauler = makeShipWithLoader(10, OWNER, COORDS)
        const wrongCoords = makeShipWithLoader(
            11,
            OWNER,
            ServerContract.Types.coordinates.from({x: Int64.from(99), y: Int64.from(99)})
        )
        const wrongOwner = makeShipWithLoader(12, Name.from('bob.gm'), COORDS)

        const cargo10 = makeCargoRow(10, 100, INPUT_ITEM_ID, 80)
        const cargo11 = makeCargoRow(11, 101, INPUT_ITEM_ID, 80)
        const cargo12 = makeCargoRow(12, 102, INPUT_ITEM_ID, 80)

        const sources = mgr.eligibleSources(
            target,
            [hauler, wrongCoords, wrongOwner],
            [cargo10, cargo11, cargo12]
        )
        expect(sources.map((s) => s.entityId.toString())).toEqual(['10'])
        expect(sources[0].hasLoaders).toBe(true)
        expect(sources[0].relevantCargo.length).toBeGreaterThan(0)
    })

    test('unreachable sources are owned entities at coords with relevant cargo but no loaders', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!

        const container = ServerContract.Types.entity_info.from({
            id: UInt64.from(20),
            type: Name.from('container'),
            item_id: UInt16.from(2000),
            owner: OWNER,
            entity_name: '',
            cargomass: UInt32.from(0),
            cargo: [],
            coordinates: COORDS,
            modules: [],
            is_idle: true,
            current_task_elapsed: UInt32.from(0),
            current_task_remaining: UInt32.from(0),
            pending_tasks: [],
            lanes: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })

        const cargo20 = makeCargoRow(20, 200, INPUT_ITEM_ID, 30)

        const unreachable = mgr.unreachableSources(target, [container], [cargo20])
        expect(unreachable.map((s) => s.entityId.toString())).toEqual(['20'])
        expect(unreachable[0].hasLoaders).toBe(false)
    })

    test('keeps same-item cargo stacks distinct by stats and modules', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!
        const hauler = makeShipWithLoader(10, OWNER, COORDS)

        const first = makeCargoRow(10, 100, INPUT_ITEM_ID, 8, 0n)
        const second = makeCargoRow(10, 101, INPUT_ITEM_ID, 5, 42n)

        const sources = mgr.eligibleSources(target, [hauler], [first, second])

        expect(
            sources[0].relevantCargo.map((c) => ({
                key: c.key,
                itemId: c.itemId,
                available: c.available,
                reserved: c.reserved,
                stats: c.stats.toString(),
                rowId: c.rowId.toString(),
            }))
        ).toEqual([
            {
                key: `${INPUT_ITEM_ID}#0#`,
                itemId: INPUT_ITEM_ID,
                available: 8,
                reserved: 0,
                stats: '0',
                rowId: '100',
            },
            {
                key: `${INPUT_ITEM_ID}#42#`,
                itemId: INPUT_ITEM_ID,
                available: 5,
                reserved: 0,
                stats: '42',
                rowId: '101',
            },
        ])
    })
})

describe('ConstructionManager.eligibleFinalizers', () => {
    const OWNER = Name.from('alice.gm')
    const COORDS = ServerContract.Types.coordinates.from({x: Int64.from(4), y: Int64.from(3)})

    function makePlot() {
        return ServerContract.Types.entity_row.from({
            id: UInt64.from(1),
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

    function makeShipWithCrafter(
        id: number,
        owner: Name,
        coords: ServerContract.Types.coordinates,
        speed: number
    ) {
        return ServerContract.Types.entity_info.from({
            id: UInt64.from(id),
            type: Name.from('ship'),
            item_id: UInt16.from(1000),
            owner,
            entity_name: '',
            cargomass: UInt32.from(0),
            cargo: [],
            coordinates: coords,
            is_idle: true,
            current_task_elapsed: UInt32.from(0),
            current_task_remaining: UInt32.from(0),
            pending_tasks: [],
            lanes: [],
            gatherer_lanes: [],
            crafter_lanes: [
                ServerContract.Types.crafter_lane.from({
                    slot_index: UInt8.from(0),
                    speed: UInt16.from(speed),
                    drain: UInt32.from(10),
                    output_pct: UInt16.from(100),
                }),
            ],
            builder_lanes: [
                ServerContract.Types.crafter_lane.from({
                    slot_index: UInt8.from(0),
                    speed: UInt16.from(speed),
                    drain: UInt32.from(10),
                    output_pct: UInt16.from(100),
                }),
            ],
            loader_lanes: [],
            holds: [],
            modules: [
                ServerContract.Types.module_entry.from({
                    type: UInt8.from(MODULE_CRAFTER),
                    installed: ServerContract.Types.packed_module.from({
                        item_id: UInt16.from(10601),
                        stats: UInt64.from(0),
                    }),
                }),
            ],
        })
    }

    test('returns owned crafter-capable entities at target coords sorted by ETA', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot()
        const target = mgr.getTarget(plot, [])!

        const fastCrafter = makeShipWithCrafter(30, OWNER, COORDS, 200)
        const slowCrafter = makeShipWithCrafter(31, OWNER, COORDS, 50)

        const finalizers = mgr.eligibleFinalizers(target, [slowCrafter, fastCrafter])
        expect(finalizers.map((f) => f.entityId.toString())).toEqual(['30', '31'])
        expect(finalizers[0].estimatedDuration.lt(finalizers[1].estimatedDuration)).toBe(true)
    })
})
