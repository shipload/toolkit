import {describe, expect, test} from 'bun:test'
import {
    computeEntityCapabilities,
    computeLauncherCapabilities,
    computeStorageCapabilities,
} from '../src/derivation/capabilities'
import {
    computeCargoBayDrain,
    computeEngineThrust,
    computeHaulerDrain,
    computeTravelDrain,
    supportDrainTierPercent,
} from '../src/nft/description'
import {computeEffectiveModuleStat} from '../src/derivation/stat-scaling'
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

function cargoBayCapacity(str: number, den: number, hrd: number): number {
    return 10_000_000 + Math.floor(((str + den + hrd) * 50_000_000) / 2997)
}

describe('computeEntityCapabilities', () => {
    test('computeLauncherCapabilities applies slot amp to rate and velocity only', () => {
        const caps = computeLauncherCapabilities({charge_rate: 500, velocity: 300, drain: 20}, 200)
        expect(caps).toEqual({chargeRate: 1000, velocity: 600, drain: 20})
    })

    test('logistics drain tier curve preserves T1 and improves T2 by ten percent', () => {
        expect(supportDrainTierPercent(1)).toBe(100)
        expect(supportDrainTierPercent(2)).toBe(90)
        expect(supportDrainTierPercent(6)).toBe(50)
        expect(supportDrainTierPercent(10)).toBe(50)
        expect(computeHaulerDrain(500, 1)).toBe(8_750)
        expect(computeHaulerDrain(500, 2)).toBe(7_875)
        expect(computeCargoBayDrain(500, 1)).toBe(6_562)
        expect(computeCargoBayDrain(500, 2)).toBe(5_906)
    })

    test('Cargo Hold capacity uses three stats while Cohesion only improves drain', () => {
        const low = computeStorageCapabilities(
            {strength: 999, density: 999, hardness: 999, cohesion: 1},
            1
        )
        const high = computeStorageCapabilities(
            {strength: 999, density: 999, hardness: 999, cohesion: 999},
            1
        )
        expect(low.capacity).toBe(60_000_000)
        expect(high.capacity).toBe(low.capacity)
        expect(high.drain).toBeLessThan(low.drain)
    })

    test('installed hold and beam drain aggregate once and ignore slot output percentage', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 500])},
            {slotIndex: 1, itemId: ITEM_GENERATOR_T1, stats: 0n},
            {
                slotIndex: 2,
                itemId: ITEM_STORAGE_T1,
                stats: encodeStats([500, 500, 500, 500]),
            },
            {slotIndex: 3, itemId: ITEM_HAULER_T1, stats: encodeStats([500, 500, 500])},
        ]
        const full = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        const taxedLayout = SHIP_LAYOUT.map((slot) => ({...slot, outputPct: 50}))
        const taxed = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            taxedLayout
        )

        const engineOnly = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules.slice(0, 2),
            SHIP_LAYOUT
        )
        expect(full.travelDrain).toEqual({
            engine: engineOnly.engines!.drain,
            cargoHolds: 6_562,
            tractorBeams: 8_750,
            total: engineOnly.engines!.drain + 15_312,
        })
        expect(full.engines?.drain).toBe(engineOnly.engines!.drain + 15_312)
        expect(taxed.travelDrain?.cargoHolds).toBe(6_562)
        expect(taxed.travelDrain?.tractorBeams).toBe(8_750)
        expect(taxed.capacity).toBeLessThan(full.capacity)
        expect(taxed.hauler?.efficiency).toBeLessThan(full.hauler?.efficiency ?? 0)
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
            base.capacity + Math.floor(cargoBayCapacity(500, 500, 500) / 2)
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

    test('single average engine yields power-to-weight drain', () => {
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
        const thrust = computeEngineThrust(computeEffectiveModuleStat(500))
        expect(r.engines!.thrust).toBe(thrust)
        expect(r.engines!.drain).toBe(computeTravelDrain(thrust, computeEffectiveModuleStat(500)))
    })

    test('two average engines halve the power-to-weight drain', () => {
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
        const thrust = 2 * computeEngineThrust(computeEffectiveModuleStat(500))
        expect(r.engines!.thrust).toBe(thrust)
        expect(r.engines!.drain).toBe(computeTravelDrain(thrust, computeEffectiveModuleStat(500)))
    })

    test('mixed thm averages: thm 300 + thm 700 behaves like thm 500', () => {
        const mixed: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 300])},
            {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 700])},
        ]
        const matched: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 500])},
            {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 500])},
        ]
        const r = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            mixed,
            SHIP_LAYOUT
        )
        const ref = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            matched,
            SHIP_LAYOUT
        )
        expect(r.engines!.drain).toBe(ref.engines!.drain)
    })
})
