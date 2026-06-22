import {describe, expect, test} from 'bun:test'
import {Name, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {PlotManager} from '../../src/managers/plot'
import {ServerContract} from '../../src/contracts'
import {ITEM_PLATE, ITEM_CERAMIC, ITEM_WAREHOUSE_T1_PACKED} from '../../src/data/item-ids'
import type {ScheduledBuild} from '../../src/managers/construction-types'

let cargoIdSeq = 1

function makePlotRow(itemId: number): ServerContract.Types.entity_row {
    return ServerContract.Types.entity_row.from({
        id: UInt64.from(101),
        owner: Name.from('alice.gm'),
        kind: Name.from('plot'),
        name: '',
        stats: UInt64.from(0),
        coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
        cargomass: UInt32.from(0),
        capacity: UInt32.from(140),
        modules: [],
        item_id: UInt16.from(itemId),
        lanes: [],
        holds: [],
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

function scheduledBuild(hasStarted: boolean): ScheduledBuild {
    return {
        shipId: UInt64.from(4),
        shipName: 'Ship #4',
        hasStarted,
        startsAt: 0,
        completesAt: 1,
        cancelable: true,
        blockingTaskCount: 0,
    }
}

const manager = new PlotManager({} as any)

describe('PlotManager.buildableTarget', () => {
    test('returns BuildableTarget for plot entity with target item and recipe', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED)

        const target = manager.buildableTarget(plot, [])

        expect(target.entityId.equals(UInt64.from(101))).toBe(true)
        expect(target.state).toBe('accepting')
        expect(target.finalizeAction.equals(Name.from('buildplot'))).toBe(true)
        expect(target.finalizerCapability).toBe('crafter')
        expect(target.progress.isComplete).toBe(false)
        expect(target.recipe).toBeDefined()
    })

    test('state is "ready" when all recipe inputs are deposited', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED)
        const cargo = [makeCargoRow(101n, ITEM_PLATE, 1000), makeCargoRow(101n, ITEM_CERAMIC, 1000)]

        const target = manager.buildableTarget(plot, cargo)

        expect(target.progress.isComplete).toBe(true)
        expect(target.state).toBe('ready')
    })

    test('state is "scheduled" when a queued build targets the plot', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED)
        const cargo = [makeCargoRow(101n, ITEM_PLATE, 1000), makeCargoRow(101n, ITEM_CERAMIC, 1000)]
        const target = manager.buildableTarget(plot, cargo, undefined, scheduledBuild(false))
        expect(target.state).toBe('scheduled')
        expect(target.scheduledBuild?.shipName).toBe('Ship #4')
    })

    test('state is "finalizing" when the build has started', () => {
        const plot = makePlotRow(ITEM_WAREHOUSE_T1_PACKED)
        const cargo = [makeCargoRow(101n, ITEM_PLATE, 1000), makeCargoRow(101n, ITEM_CERAMIC, 1000)]
        const target = manager.buildableTarget(plot, cargo, undefined, scheduledBuild(true))
        expect(target.state).toBe('finalizing')
    })
})
