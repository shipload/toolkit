import {describe, expect, test} from 'bun:test'
import {
    computeEntityCapabilities,
    type EntityCapabilities,
} from '../src/derivation/capabilities'
import type {InstalledModule} from '../src/entities/slot-multiplier'
import {
    ITEM_SHIP_T1_PACKED,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_WARP_T1,
    ITEM_STORAGE_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_CRAFTER_T1,
    ITEM_GATHERER_T1,
} from '../src/data/item-ids'
import {computeShipCapabilities} from '../src/entities/ship-deploy'
import type {EntitySlot} from '../src/data/recipes-runtime'

const SHIP_LAYOUT: EntitySlot[] = [
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
]

const ZERO_STATS = 0n

const SAMPLE_STATS_RECORD = {strength: 100, density: 100, hardness: 100, saturation: 100}

describe('computeEntityCapabilities', () => {
    test('returns hullmass and capacity for ship with no modules', () => {
        const result = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, [], SHIP_LAYOUT)
        expect(result.hullmass).toBeGreaterThan(0)
        expect(result.capacity).toBeGreaterThan(0)
        expect(result.engines).toBeUndefined()
        expect(result.generator).toBeUndefined()
        expect(result.gatherer).toBeUndefined()
        expect(result.loaders).toBeUndefined()
        expect(result.crafter).toBeUndefined()
        expect(result.hauler).toBeUndefined()
        expect(result.warp).toBeUndefined()
    })

    test('engines field populated when ship has engine module installed', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: ZERO_STATS},
        ]
        const result = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        expect(result.engines).toBeDefined()
        expect(result.generator).toBeUndefined()
    })

    test('generator field populated when ship has generator module installed', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: ZERO_STATS},
        ]
        const result = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        expect(result.generator).toBeDefined()
        expect(result.engines).toBeUndefined()
    })

    test('warp field populated when warp module installed', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_WARP_T1, stats: ZERO_STATS},
        ]
        const result = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        expect(result.warp).toBeDefined()
    })

    test('storage module increases capacity but has no storage field', () => {
        const base = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, [], SHIP_LAYOUT)
        const withStorage = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_STORAGE_T1, stats: ZERO_STATS}],
            SHIP_LAYOUT,
        )
        expect(withStorage.capacity).toBeGreaterThan(base.capacity)
        expect((withStorage as any).storage).toBeUndefined()
    })

    test('parity with computeShipCapabilities — engine and generator', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: ZERO_STATS},
            {slotIndex: 1, itemId: ITEM_GENERATOR_T1, stats: ZERO_STATS},
        ]
        const unified = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        const ship = computeShipCapabilities(modules, SHIP_LAYOUT)
        expect(unified.engines).toEqual(ship.engines)
        expect(unified.generator).toEqual(ship.generator)
    })

    test('parity with computeShipCapabilities — gatherer', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_GATHERER_T1, stats: ZERO_STATS},
        ]
        const unified = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        const ship = computeShipCapabilities(modules, SHIP_LAYOUT)
        expect(unified.gatherer).toEqual(ship.gatherer)
    })

    test('parity with computeShipCapabilities — hauler', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_HAULER_T1, stats: ZERO_STATS},
        ]
        const unified = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        const ship = computeShipCapabilities(modules, SHIP_LAYOUT)
        expect(unified.hauler).toEqual(ship.hauler)
    })

    test('parity with computeShipCapabilities — crafter', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_CRAFTER_T1, stats: ZERO_STATS},
        ]
        const unified = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        const ship = computeShipCapabilities(modules, SHIP_LAYOUT)
        expect(unified.crafter).toEqual(ship.crafter)
    })

    test('hullmass increases with each installed module (mass accumulates)', () => {
        const baseResult = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, [], SHIP_LAYOUT)
        const withEngine = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: ZERO_STATS}],
            SHIP_LAYOUT,
        )
        expect(withEngine.hullmass).toBeGreaterThan(baseResult.hullmass)
    })

    test('loader: single module parity with computeShipCapabilities', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_LOADER_T1, stats: ZERO_STATS},
        ]
        const unified = computeEntityCapabilities(SAMPLE_STATS_RECORD, ITEM_SHIP_T1_PACKED, modules, SHIP_LAYOUT)
        const ship = computeShipCapabilities(modules, SHIP_LAYOUT)
        expect(unified.loaders?.thrust).toEqual(ship.loaders?.thrust)
        expect(unified.loaders?.count).toEqual(ship.loaders?.quantity)
        expect(unified.loaders?.mass).toEqual(ship.loaders?.mass)
    })
})
