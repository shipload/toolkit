import {assert} from 'chai'
import {AnyInt, Int64, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    Coordinates,
    encodeStats,
    Item,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T1,
    makeShip,
    ServerContract,
    TaskType,
} from '$lib'
import {getItem} from 'src/items'
import {registerMockItem} from './item-mock'

function ensureTestItem(itemId: number, mass?: number): void {
    try {
        getItem(itemId)
        return
    } catch {
        /* fall through */
    }
    registerMockItem(
        Item.from({
            id: UInt16.from(itemId),
            name: `TestItem-${itemId}`,
            description: 'Synthetic item registered for tests.',
            mass: UInt32.from(mass ?? 10),
            category: 'ore',
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
        cargo?: Array<{item_id: number; quantity: number; stats?: number; mass?: number}>
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
            stats: item.stats !== undefined ? UInt64.from(item.stats) : UInt64.from(0),
            modules: [],
        })
    })

    const seed = encodeStats([500, 500, 500, 500])
    return makeShip({
        id: UInt64.from(1),
        owner: 'teamgreymass',
        name: 'Test Ship',
        coordinates: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
        hullmass: overrides.hullmass ?? 1000,
        capacity: overrides.capacity ?? 1000000,
        energy: overrides.energy ?? 1000,
        modules: [
            {itemId: ITEM_ENGINE_T1, stats: seed},
            {itemId: ITEM_GENERATOR_T1, stats: seed},
            {itemId: ITEM_LOADER_T1, stats: seed},
        ],
        cargo: cargoItems,
    })
}

export function makeTask(
    type: TaskType,
    overrides: {
        cargo?: Array<{item_id: number; quantity: number; stats?: number}>
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
            stats: item.stats !== undefined ? UInt64.from(item.stats) : UInt64.from(0),
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
