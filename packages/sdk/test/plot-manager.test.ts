import {describe, expect, test} from 'bun:test'
import {Name, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../src/contracts'
import {PlotManager} from '../src/managers/plot'
import {ITEM_PLATE, ITEM_FRAME, ITEM_WAREHOUSE_T1_PACKED} from '../src/data/item-ids'

let cargoIdSeq = 1

function makePlotRow(
    itemId: number,
    cargomass: number,
    capacity?: number
): ServerContract.Types.entity_row {
    return ServerContract.Types.entity_row.from({
        id: UInt64.from(42),
        owner: Name.from('alice'),
        kind: Name.from('plot'),
        name: '',
        stats: UInt64.from(0),
        coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
        cargomass: UInt32.from(cargomass),
        capacity: capacity !== undefined ? UInt32.from(capacity) : undefined,
        modules: [],
        item_id: UInt16.from(itemId),
    })
}

function makePlotInfo(
    itemId: number,
    cargomass: number,
    capacity?: number
): ServerContract.Types.entity_info {
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(42),
        owner: Name.from('alice'),
        type: Name.from('plot'),
        entity_name: '',
        coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
        cargomass: UInt32.from(cargomass),
        cargo: [],
        capacity: capacity !== undefined ? UInt32.from(capacity) : undefined,
        modules: [],
        item_id: UInt16.from(itemId),
        is_idle: true,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
    })
}

function makeCargoRow(
    entityId: bigint,
    itemId: number,
    quantity: number
): ServerContract.Types.cargo_row {
    return ServerContract.Types.cargo_row.from({
        id: UInt64.from(cargoIdSeq++),
        entity_id: UInt64.from(entityId),
        item_id: UInt64.from(itemId),
        quantity: UInt64.from(quantity),
        stats: UInt64.from(0),
        modules: [],
    })
}

const manager = new PlotManager({} as any)

describe('PlotManager.progress', () => {
    test('empty plot — all missing', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED, 0)
        const result = manager.progress(plot, [])
        expect(result.targetItemId).toBe(ITEM_WAREHOUSE_T1_PACKED)
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0]).toMatchObject({
            itemId: ITEM_PLATE,
            required: 2000,
            provided: 0,
            missing: 2000,
        })
        expect(result.rows[1]).toMatchObject({
            itemId: ITEM_FRAME,
            required: 1000,
            provided: 0,
            missing: 1000,
        })
        expect(result.isComplete).toBeFalse()
    })

    test('partial deposit — some missing', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED, 0)
        const cargo = [makeCargoRow(42n, ITEM_PLATE, 1000)]
        const result = manager.progress(plot, cargo)
        expect(result.rows[0]).toMatchObject({required: 2000, provided: 1000, missing: 1000})
        expect(result.rows[1]).toMatchObject({required: 1000, provided: 0, missing: 1000})
        expect(result.isComplete).toBeFalse()
    })

    test('fully loaded plot — isComplete', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED, 0)
        const cargo = [makeCargoRow(42n, ITEM_PLATE, 2000), makeCargoRow(42n, ITEM_FRAME, 1000)]
        const result = manager.progress(plot, cargo)
        expect(result.rows.every((r) => r.missing === 0)).toBeTrue()
        expect(result.isComplete).toBeTrue()
    })

    test('cargo from other entities is ignored', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED, 0)
        const cargo = [makeCargoRow(99n, ITEM_PLATE, 2000), makeCargoRow(42n, ITEM_FRAME, 1000)]
        const result = manager.progress(plot, cargo)
        expect(result.rows[0].provided).toBe(0)
        expect(result.rows[1].provided).toBe(1000)
        expect(result.isComplete).toBeFalse()
    })

    test('throws when no recipe for item id', () => {
        const plot = makePlotRow(101, 0)
        expect(() => manager.progress(plot, [])).toThrow()
    })
})

describe('PlotManager.canBuild', () => {
    test('false when incomplete', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED, 0)
        expect(manager.canBuild(plot, [])).toBeFalse()
    })

    test('true when fully loaded', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED, 0)
        const cargo = [makeCargoRow(42n, ITEM_PLATE, 2000), makeCargoRow(42n, ITEM_FRAME, 1000)]
        expect(manager.canBuild(plot, cargo)).toBeTrue()
    })
})

describe('PlotManager.timeToComplete', () => {
    test('divides capacity by speed, minimum 1', () => {
        const plot = makePlotInfo(ITEM_WAREHOUSE_T1_PACKED, 0, 14400000)
        const crafter = ServerContract.Types.crafter_stats.from({
            speed: UInt16.from(14400),
            drain: UInt16.from(0),
        })
        expect(manager.timeToComplete(plot, crafter)).toBe(1000)
    })

    test('minimum result is 1', () => {
        const plot = makePlotInfo(ITEM_WAREHOUSE_T1_PACKED, 0, 1)
        const crafter = ServerContract.Types.crafter_stats.from({
            speed: UInt16.from(65535),
            drain: UInt16.from(0),
        })
        expect(manager.timeToComplete(plot, crafter)).toBe(1)
    })
})
