import {assert} from 'chai'
import {AnyInt, Int64, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {Coordinates, Item, makeShip, ServerContract, TaskType} from '$lib'
import {getItem, registerItem} from 'src/items'

function ensureTestItem(itemId: number, mass?: number): void {
    try {
        getItem(itemId)
        return
    } catch {
        /* fall through */
    }
    registerItem(
        Item.from({
            id: UInt16.from(itemId),
            name: `TestItem-${itemId}`,
            description: 'Synthetic item registered for tests.',
            mass: UInt32.from(mass ?? 10),
            category: 'metal',
            tier: 't1',
            color: '#FF00FF',
        })
    )
}

export function assertEq(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.equal(Number(actual), Number(expected), msg)
}

export function assertAbove(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isAbove(Number(actual), Number(expected), msg)
}

export function assertAtLeast(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isAtLeast(Number(actual), Number(expected), msg)
}

export function assertBelow(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isBelow(Number(actual), Number(expected), msg)
}

export function assertAtMost(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isAtMost(Number(actual), Number(expected), msg)
}

export function makeShipFixture(
    overrides: {
        cargo?: Array<{item_id: number; quantity: number; seed?: number; mass?: number}>
        capacity?: number
        hullmass?: number
        energy?: number
    } = {}
) {
    const cargoItems = (overrides.cargo ?? []).map((item) => {
        ensureTestItem(item.item_id, item.mass)
        return ServerContract.Types.cargo_item.from({
            item_id: UInt16.from(item.item_id),
            quantity: UInt32.from(item.quantity),
            seed: item.seed !== undefined ? UInt64.from(item.seed) : undefined,
            modules: [],
        })
    })

    return makeShip({
        id: 1,
        owner: 'teamgreymass',
        name: 'Test Ship',
        coordinates: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
        hullmass: overrides.hullmass ?? 1000,
        capacity: overrides.capacity ?? 1000000,
        energy: overrides.energy ?? 1000,
        engines: ServerContract.Types.movement_stats.from({
            thrust: 100000,
            drain: 250,
        }),
        generator: ServerContract.Types.energy_stats.from({
            capacity: 5000,
            recharge: 100,
        }),
        loaders: ServerContract.Types.loader_stats.from({
            mass: 100000,
            quantity: 1,
            thrust: 100,
        }),
        cargo: cargoItems,
    })
}

export function makeTask(
    type: TaskType,
    overrides: {
        cargo?: Array<{item_id: number; quantity: number; seed?: number}>
        coordinates?: {x: number; y: number; z?: number}
        duration?: number
        energy_cost?: number
    } = {}
): ServerContract.Types.task {
    const cargoItems = (overrides.cargo ?? []).map((item) => {
        ensureTestItem(item.item_id)
        return ServerContract.Types.cargo_item.from({
            item_id: UInt16.from(item.item_id),
            quantity: UInt32.from(item.quantity),
            seed: item.seed !== undefined ? UInt64.from(item.seed) : undefined,
            modules: [],
        })
    })

    return ServerContract.Types.task.from({
        type: UInt16.from(type),
        duration: UInt32.from(overrides.duration ?? 60),
        cancelable: 0,
        coordinates: overrides.coordinates
            ? {x: overrides.coordinates.x, y: overrides.coordinates.y}
            : undefined,
        cargo: cargoItems,
        energy_cost: overrides.energy_cost ? UInt16.from(overrides.energy_cost) : undefined,
    })
}
