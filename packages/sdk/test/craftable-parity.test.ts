import {describe, expect, test} from 'bun:test'
import {
    ITEM_CRAFTER_T1,
    ITEM_GENERATOR_T1,
    ITEM_RESONATOR,
    ServerContract,
    TaskType,
    getRecipe,
    maxCraftable,
} from '../src'
import {factory12, FACTORY_12_CRAFTER_SPEED, FACTORY_12_NOW} from './fixtures/factory-12'

const CRAFTER_SPEED = 270
const NOW = new Date('2026-06-11T17:06:40.000Z')

const CARGO = [
    {item_id: 101, quantity: 46, stats: 131408152, modules: []},
    {item_id: 101, quantity: 23, stats: 512775321, modules: []},
    {item_id: 101, quantity: 1900, stats: 458292414, modules: []},
    {item_id: 101, quantity: 1400, stats: 227964179, modules: []},
    {item_id: 201, quantity: 3600, stats: 316058715, modules: []},
]

const PENDING_CRAFT_LANE = {
    lane_key: 2,
    schedule: {
        started: '2026-06-11T17:06:38.000',
        tasks: [
            {
                type: TaskType.CRAFT,
                duration: 55,
                cancelable: 2,
                coordinates: null,
                cargo: [
                    {item_id: 201, stats: 316058715, modules: [], quantity: 6, entity_id: null},
                    {item_id: 101, stats: 458292414, modules: [], quantity: 9, entity_id: null},
                    {
                        item_id: ITEM_RESONATOR,
                        stats: 308651,
                        modules: [],
                        quantity: 1,
                        entity_id: null,
                    },
                ],
                couplings: [],
                entitygroup: null,
                energy_cost: null,
            },
        ],
    },
}

const MODULES = [
    {
        type: 0,
        installed: {
            item_id: ITEM_GENERATOR_T1,
            stats: 218325,
        },
    },
    {
        type: 0,
        installed: {
            item_id: ITEM_CRAFTER_T1,
            stats: 218325,
        },
    },
]

function fixture(pendingCraft: boolean) {
    return {
        cargo: CARGO.map((c) => ServerContract.Types.cargo_item.from(c)),
        modules: MODULES.map((m) => ServerContract.Types.module_entry.from(m)),
        lanes: pendingCraft ? [ServerContract.Types.lane.from(PENDING_CRAFT_LANE)] : [],
    }
}

describe('maxCraftable', () => {
    test('matches factory-12 craftable capacity with and without a pending craft', () => {
        const recipe = getRecipe(ITEM_RESONATOR)!

        expect(maxCraftable(fixture(false), recipe, CRAFTER_SPEED, NOW)).toBe(673)
        expect(maxCraftable(fixture(true), recipe, CRAFTER_SPEED, NOW)).toBe(672)
    })

    test('counts completed-but-unsettled crafts as already spent (cargo drained to 3x 101)', () => {
        const recipe = getRecipe(ITEM_RESONATOR)!
        expect(maxCraftable(factory12(), recipe, FACTORY_12_CRAFTER_SPEED, FACTORY_12_NOW)).toBe(0)
    })

    test('credits an in-transit load by delaying the craft until inputs are ready', () => {
        const recipe = getRecipe(ITEM_RESONATOR)!
        // Symmetric 5+5 recipe makes crystal (201) the binding input here: 271 craftable.
        expect(
            maxCraftable(
                factory12({incomingLoad: true}),
                recipe,
                FACTORY_12_CRAFTER_SPEED,
                FACTORY_12_NOW
            )
        ).toBe(271)
    })
})
