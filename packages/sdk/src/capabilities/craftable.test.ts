import {describe, expect, test} from 'bun:test'
import {ServerContract} from '../contracts'
import {UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_CRAFTER_T1,
    ITEM_PLASMA_CELL,
    ITEM_SHIP_T1_PACKED,
} from '../data/item-ids'
import {getRecipe} from '../data/recipes-runtime'
import {encodeStats} from '../derivation/crafting'
import {rollupCrafter} from '../derivation/rollups'
import {makeEntity} from '../entities/makers'
import type {IncomingSource} from '../scheduling/availability'
import {maxCraftable} from './craftable'

const NOW = new Date('2026-06-11T17:06:40.000Z')

function ship(cargo: ServerContract.Types.cargo_item[] = []) {
    return makeEntity(ITEM_SHIP_T1_PACKED, {
        id: 99,
        owner: 'tester.gm',
        name: 'Craft Tester',
        coordinates: {x: 0, y: 0},
        hullmass: 200_000,
        capacity: 8_000_000,
        cargomass: 0,
        energy: 500_000,
        modules: [
            {itemId: ITEM_GENERATOR_T1, stats: encodeStats([999, 999])},
            {itemId: ITEM_CRAFTER_T1, stats: encodeStats([999, 999])},
        ],
        cargo,
    })
}

function crafterSpeed(entity: ReturnType<typeof ship>): number {
    return rollupCrafter(entity.crafter_lanes)!.speed.toNumber()
}

function plasmaCell(quantity: number) {
    return ServerContract.Types.cargo_item.from({
        item_id: UInt16.from(ITEM_PLASMA_CELL),
        quantity: UInt32.from(quantity),
        stats: UInt64.from(0),
        modules: [],
    })
}

describe('maxCraftable — incoming', () => {
    test('on-hand-only baseline stays 0 for an empty-cargo entity', () => {
        const recipe = getRecipe(ITEM_ENGINE_T1)!
        const entity = ship([])
        expect(maxCraftable(entity, recipe, crafterSpeed(entity), NOW)).toBe(0)
    })

    test('incoming source alone covers the recipe inputs', () => {
        const recipe = getRecipe(ITEM_ENGINE_T1)!
        const entity = ship([])
        const incoming: IncomingSource[] = [
            {holdId: '1', until: new Date(NOW.getTime() - 1000), items: [plasmaCell(1800)]},
        ]

        expect(maxCraftable(entity, recipe, crafterSpeed(entity), NOW)).toBe(0)
        expect(maxCraftable(entity, recipe, crafterSpeed(entity), NOW, incoming)).toBe(3)
    })

    test('an incoming source arriving well after craft completion still resolves (eventually craftable)', () => {
        const recipe = getRecipe(ITEM_ENGINE_T1)!
        const entity = ship([])
        const farFuture: IncomingSource[] = [
            {
                holdId: '1',
                until: new Date(NOW.getTime() + 1_000_000_000),
                items: [plasmaCell(1800)],
            },
        ]

        expect(maxCraftable(entity, recipe, crafterSpeed(entity), NOW, farFuture)).toBe(3)
    })
})
