import {describe, expect, test} from 'bun:test'
import {
    computeEntityCapabilities,
    computeLauncherCapabilities,
} from '../src/derivation/capabilities'
import type {InstalledModule} from '../src/entities/slot-multiplier'
import {
    ITEM_SHIP_T1_PACKED,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_WARP_T1,
    ITEM_STORAGE_T1,
    ITEM_HAULER_T1,
    ITEM_HAULER_T2,
    ITEM_LOADER_T1,
    ITEM_CRAFTER_T1,
    ITEM_GATHERER_T1,
    ITEM_MASS_DRIVER_T1_PACKED,
    ITEM_LAUNCHER_T1,
} from '../src/data/item-ids'
import type {EntitySlot} from '../src/data/recipes-runtime'
import {encodeStats} from '../src/derivation/crafting'

const SHIP_LAYOUT: EntitySlot[] = [
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
]

const ZERO_STATS = 0n

const SAMPLE_STATS_RECORD = {strength: 100, density: 100, hardness: 100, cohesion: 100}

function cargoBayStats(str: number, den: number, hrd: number, coh: number): bigint {
    let result = 0n
    for (const [i, value] of [str, den, hrd, coh].entries()) {
        result |= (BigInt(value) & 0x3ffn) << BigInt(i * 10)
    }
    return result
}

function cargoBayCapacity(str: number, den: number, hrd: number, coh: number): number {
    return 10_000_000 + Math.floor(((str + den + hrd + coh) * 50_000_000) / 3996)
}

describe('computeEntityCapabilities', () => {
    test('computeLauncherCapabilities applies slot amp to rate and velocity only', () => {
        const caps = computeLauncherCapabilities({charge_rate: 500, velocity: 300, drain: 20}, 200)
        expect(caps).toEqual({chargeRate: 1000, velocity: 600, drain: 20})
    })

    test('returns hullmass and capacity for ship with no modules', () => {
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [],
            SHIP_LAYOUT
        )
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
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.engines).toBeDefined()
        expect(result.generator).toBeUndefined()
    })

    test('generator field populated when ship has generator module installed', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: ZERO_STATS},
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.generator).toBeDefined()
        expect(result.engines).toBeUndefined()
    })

    test('warp field populated when warp module installed', () => {
        const modules: InstalledModule[] = [{slotIndex: 0, itemId: ITEM_WARP_T1, stats: ZERO_STATS}]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.warp).toBeDefined()
    })

    test('Cargo Bay adds raw cargo capacity but has no storage field', () => {
        const base = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [],
            SHIP_LAYOUT
        )
        const withCargoBay = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_STORAGE_T1, stats: cargoBayStats(0, 0, 0, 0)}],
            SHIP_LAYOUT
        )
        expect(withCargoBay.capacity).toBe(base.capacity + 10_000_000)
        expect((withCargoBay as any).storage).toBeUndefined()
    })

    test('excellent Cargo Bay adds 60,000,000 raw cargo capacity', () => {
        const base = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [],
            SHIP_LAYOUT
        )
        const withCargoBay = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_STORAGE_T1, stats: cargoBayStats(999, 999, 999, 999)}],
            SHIP_LAYOUT
        )
        expect(withCargoBay.capacity).toBe(base.capacity + 60_000_000)
    })

    test('Cargo Bay respects slot output percentage', () => {
        const halfOutputLayout: EntitySlot[] = [{type: 'any', outputPct: 50}]
        const base = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [],
            halfOutputLayout
        )
        const withCargoBay = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_STORAGE_T1, stats: cargoBayStats(500, 500, 500, 500)}],
            halfOutputLayout
        )
        expect(withCargoBay.capacity).toBe(
            base.capacity + Math.floor(cargoBayCapacity(500, 500, 500, 500) / 2)
        )
    })

    test('hullmass increases with each installed module (mass accumulates)', () => {
        const baseResult = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [],
            SHIP_LAYOUT
        )
        const withEngine = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: ZERO_STATS}],
            SHIP_LAYOUT
        )
        expect(withEngine.hullmass).toBeGreaterThan(baseResult.hullmass)
    })

    test('loader: single module populates loaders field', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_LOADER_T1, stats: ZERO_STATS},
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.loaders).toBeDefined()
        expect(result.loaders?.quantity).toBeGreaterThan(0)
        expect(result.loaders?.mass).toBeGreaterThan(0)
    })

    test('hauler: single T1 beam yields capacity 2 and a single capacityByTier entry', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_HAULER_T1, stats: encodeStats([500, 0, 0])},
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.hauler?.capacity).toBe(2)
        expect(result.hauler?.capacityByTier).toEqual([{tier: 1, capacity: 2}])
    })

    test('hauler: 2x T2 beams sum capacity into a single tier-2 capacityByTier bucket', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_HAULER_T2, stats: encodeStats([500, 0, 0])},
            {slotIndex: 1, itemId: ITEM_HAULER_T2, stats: encodeStats([500, 0, 0])},
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.hauler?.capacity).toBe(6)
        expect(result.hauler?.capacityByTier).toEqual([{tier: 2, capacity: 6}])
    })

    test('launcher modules aggregate charge and velocity with slot amp and flat drain', () => {
        const layout: EntitySlot[] = [
            {type: 'generator', outputPct: 200},
            {type: 'launcher', outputPct: 200},
        ]
        const modules: InstalledModule[] = [
            {
                slotIndex: 1,
                itemId: ITEM_LAUNCHER_T1,
                stats: encodeStats([500, 300, 20]),
            },
        ]

        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_MASS_DRIVER_T1_PACKED,
            modules,
            layout
        )

        expect(result.launcher).toEqual({chargeRate: 1000, velocity: 600, drain: 20})
    })

    test('single average engine yields power-to-weight drain 118', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 500])},
            {slotIndex: 1, itemId: ITEM_GENERATOR_T1, stats: 0n},
        ]
        const r = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(r.engines!.thrust).toBe(775)
        expect(r.engines!.drain).toBe(118_000)
    })

    test('two average engines yield drain 59', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 500])},
            {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 500])},
        ]
        const r = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(r.engines!.thrust).toBe(1550)
        expect(r.engines!.drain).toBe(59_000)
    })

    test('mixed thm averages: thm 300 + thm 700 behaves like thm 500', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 300])},
            {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 700])},
        ]
        const r = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(r.engines!.drain).toBe(59_000)
    })
})
