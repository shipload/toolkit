import {describe, expect, test} from 'bun:test'
import {
    computeEntityCapabilities,
    computeEngineCapabilities,
    computeGathererCapabilities,
    computeGathererYield,
    computeGeneratorCapabilities,
    computeCrafterCapabilities,
    computeBuilderCapabilities,
    computeLoaderCapabilities,
    computeBaseCapacity,
    computeContainerCapabilities,
    GATHERER_YIELD_TIER_TABLE,
    ENGINE_THRUST_TIER_PCT,
    GENERATOR_CAPACITY_TIER_PCT,
    GENERATOR_RECHARGE_TIER_PCT,
    CRAFTER_SPEED_TIER_PCT,
    BUILDER_SPEED_TIER_PCT,
    WARP_RANGE_TIER_PCT,
    LOADER_THRUST_TIER_PCT,
    moduleTierPct,
} from './capabilities'
import {
    computeEngineThrust,
    computeGeneratorCap,
    computeGeneratorRech,
    computeCrafterSpeed,
    computeBuilderSpeed,
    computeWarpRange,
    computeLoaderThrust,
} from '../nft/description'
import {applySlotMultiplier, U16_MAX} from '../entities/slot-multiplier'
import {encodeStats} from './crafting'
import {
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_MASS_DRIVER_T1_PACKED,
    ITEM_MASS_CATCHER_T1_PACKED,
    ITEM_GATHERER_T1,
    ITEM_CRAFTER_T1,
    ITEM_LOADER_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_PROSPECTOR_T1A_PACKED,
    ITEM_TENDER_T1A_PACKED,
    ITEM_TUG_T1A_PACKED,
    ITEM_PORTER_T1A_PACKED,
    ITEM_SMITH_T1A_PACKED,
    ITEM_WRIGHT_T1A_PACKED,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_BUILDER_T1,
} from '../data/item-ids'
import type {InstalledModule} from '../entities/slot-multiplier'
import type {EntitySlot} from '../data/recipes-runtime'
import {computeTravelDrain} from '../nft/description'
import {computeEffectiveModuleStat} from './stat-scaling'

function makeGathererStats(strength: number, tolerance: number, saturation: number): bigint {
    return encodeStats([strength, tolerance, saturation, 0])
}

function makeCrafterStats(fineness: number, conductivity: number): bigint {
    return encodeStats([fineness, conductivity])
}

function makeLoaderStats(insulation: number, plasticity: number): bigint {
    return encodeStats([insulation, plasticity])
}

function makeBuilderStats(resonance: number, fineness: number): bigint {
    return encodeStats([resonance, fineness])
}

test('computeBaseCapacity uses container formula for all container-class entities', () => {
    const stats = {strength: 300, hardness: 400, density: 100}
    const expected = computeContainerCapabilities(stats).capacity
    for (const itemId of [
        ITEM_EXTRACTOR_T1_PACKED,
        ITEM_FACTORY_T1_PACKED,
        ITEM_MASS_DRIVER_T1_PACKED,
        ITEM_MASS_CATCHER_T1_PACKED,
    ]) {
        expect(computeBaseCapacity(itemId, stats)).toBe(expected)
    }
})

test('computeBaseCapacity uses ship-hull formula for every ship-class entity', () => {
    const stats = {strength: 300, hardness: 400, density: 100}
    const expected = computeBaseCapacity(ITEM_SHIP_T1_PACKED, stats)
    expect(expected).toBeGreaterThan(0)
    for (const itemId of [
        ITEM_ROUSTABOUT_T1A_PACKED,
        ITEM_PROSPECTOR_T1A_PACKED,
        ITEM_TENDER_T1A_PACKED,
        ITEM_TUG_T1A_PACKED,
        ITEM_PORTER_T1A_PACKED,
        ITEM_SMITH_T1A_PACKED,
        ITEM_WRIGHT_T1A_PACKED,
    ]) {
        expect(computeBaseCapacity(itemId, stats)).toBe(expected)
    }
})

test('computeEntityCapabilities emits gathererLanes alongside legacy gatherer sum', () => {
    // Two gatherers with distinct stats in separate slots, amp=100 for both
    const gathStats1 = makeGathererStats(300, 200, 400)
    const gathStats2 = makeGathererStats(500, 100, 300)

    const modules: InstalledModule[] = [
        {slotIndex: 0, itemId: ITEM_GATHERER_T1, stats: gathStats1},
        {slotIndex: 1, itemId: ITEM_GATHERER_T1, stats: gathStats2},
    ]

    const layout: EntitySlot[] = [
        {type: 'gatherer', outputPct: 100, maxTier: 1},
        {type: 'gatherer', outputPct: 100, maxTier: 1},
    ]

    const result = computeEntityCapabilities({}, ITEM_EXTRACTOR_T1_PACKED, modules, layout)

    // Lane lists must exist
    expect(result.gathererLanes).toBeDefined()
    expect(result.gathererLanes!.length).toBe(2)

    // Each lane has the right slotIndex
    expect(result.gathererLanes![0].slotIndex).toBe(0)
    expect(result.gathererLanes![1].slotIndex).toBe(1)

    // Yields are amp-scaled and distinct
    const caps1 = computeGathererCapabilities({strength: 300, tolerance: 200, saturation: 400}, 1)
    const caps2 = computeGathererCapabilities({strength: 500, tolerance: 100, saturation: 300}, 1)
    const expectedYield1 = applySlotMultiplier(caps1.yield, 100)
    const expectedYield2 = applySlotMultiplier(caps2.yield, 100)
    expect(result.gathererLanes![0].yield).toBe(expectedYield1)
    expect(result.gathererLanes![1].yield).toBe(expectedYield2)
    expect(result.gathererLanes![0].yield).not.toBe(result.gathererLanes![1].yield)

    // Unscaled per-module drain and depth carried verbatim from the compute helper
    expect(result.gathererLanes![0].drain).toBe(caps1.drain)
    expect(result.gathererLanes![1].drain).toBe(caps2.drain)
    expect(result.gathererLanes![0].depth).toBe(caps1.depth)
    expect(result.gathererLanes![1].depth).toBe(caps2.depth)

    // outputPct reflects the slot amp
    expect(result.gathererLanes![0].outputPct).toBe(100)
    expect(result.gathererLanes![1].outputPct).toBe(100)

    // Legacy sum still equals sum of both lane yields
    expect(result.gatherer).toBeDefined()
    expect(result.gatherer!.yield).toBe(expectedYield1 + expectedYield2)
})

test('computeEntityCapabilities emits crafterLanes alongside legacy crafter sum', () => {
    const crafterStats = makeCrafterStats(400, 300)

    const modules: InstalledModule[] = [
        {slotIndex: 0, itemId: ITEM_CRAFTER_T1, stats: crafterStats},
    ]

    const layout: EntitySlot[] = [{type: 'crafter', outputPct: 120, maxTier: 1}]

    const result = computeEntityCapabilities({}, ITEM_EXTRACTOR_T1_PACKED, modules, layout)

    expect(result.crafterLanes).toBeDefined()
    expect(result.crafterLanes!.length).toBe(1)
    expect(result.crafterLanes![0].slotIndex).toBe(0)

    const caps = computeCrafterCapabilities({fineness: 400, conductivity: 300}, 1)
    const expectedSpeed = applySlotMultiplier(caps.speed, 120)
    expect(result.crafterLanes![0].speed).toBe(expectedSpeed)
    expect(result.crafterLanes![0].drain).toBe(caps.drain)
    expect(result.crafterLanes![0].outputPct).toBe(120)

    // Legacy crafter speed equals single-lane speed
    expect(result.crafter).toBeDefined()
    expect(result.crafter!.speed).toBe(expectedSpeed)
})

test('builder capabilities read canonical resonance and fineness slots', () => {
    expect(computeBuilderCapabilities({resonance: 500, fineness: 330}, 1)).toEqual({
        speed: 500,
        drain: 20_000,
    })
})

test('computeEntityCapabilities emits a Builder lane from resonance and fineness', () => {
    const modules: InstalledModule[] = [
        {slotIndex: 0, itemId: ITEM_BUILDER_T1, stats: makeBuilderStats(500, 330)},
    ]
    const layout: EntitySlot[] = [{type: 'builder', outputPct: 80, maxTier: 1}]
    const result = computeEntityCapabilities({}, ITEM_EXTRACTOR_T1_PACKED, modules, layout)

    expect(result.builderLanes).toEqual([{slotIndex: 0, speed: 400, drain: 20_000, outputPct: 80}])
    expect(result.builder).toEqual({speed: 400, drain: 20_000})
})

test('computeEntityCapabilities emits loaderLanes alongside legacy loaders sum', () => {
    const loaderStats = makeLoaderStats(600, 500)

    const modules: InstalledModule[] = [{slotIndex: 0, itemId: ITEM_LOADER_T1, stats: loaderStats}]

    const layout: EntitySlot[] = [{type: 'loader', outputPct: 80, maxTier: 1}]

    const result = computeEntityCapabilities({}, ITEM_EXTRACTOR_T1_PACKED, modules, layout)

    expect(result.loaderLanes).toBeDefined()
    expect(result.loaderLanes!.length).toBe(1)
    expect(result.loaderLanes![0].slotIndex).toBe(0)

    const caps = computeLoaderCapabilities({insulation: 600, plasticity: 500}, 1)
    // mass is unscaled (raw); thrust is amp-scaled
    expect(result.loaderLanes![0].mass).toBe(caps.mass)
    expect(result.loaderLanes![0].thrust).toBe(applySlotMultiplier(caps.thrust, 80))
    expect(result.loaderLanes![0].outputPct).toBe(80)

    // Legacy loaders.mass is total (same as single-lane raw mass here)
    expect(result.loaders).toBeDefined()
    expect(result.loaders!.mass).toBe(caps.mass)
})

test('per-lane amp-scaled stats clamp to UInt16, matching the contract clamp_to_uint16', () => {
    expect(applySlotMultiplier(60000, 200)).toBe(U16_MAX)
    expect(applySlotMultiplier(1000, 150)).toBe(1500)
})

test('generator capacity and recharge are denominated to milli-energy', () => {
    const caps = computeGeneratorCapabilities({resonance: 213, reflectivity: 213}, 1)
    expect(caps.capacity).toBe(1_406_500)
    expect(caps.recharge).toBe(3_278)
})

test('engine and generator capabilities use tapered quality consistently', () => {
    const modules: InstalledModule[] = [
        {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([500, 500])},
        {slotIndex: 1, itemId: ITEM_GENERATOR_T1, stats: encodeStats([500, 500])},
    ]
    const layout: EntitySlot[] = [
        {type: 'engine', outputPct: 100, maxTier: 1},
        {type: 'generator', outputPct: 100, maxTier: 1},
    ]

    const result = computeEntityCapabilities({}, ITEM_ROUSTABOUT_T1A_PACKED, modules, layout)
    const engines = computeEngineCapabilities({volatility: 500, thermal: 500}, 1)

    expect(result.engines).toEqual({
        thrust: engines.thrust,
        drain: computeTravelDrain(engines.thrust, computeEffectiveModuleStat(500)),
    })
    expect(result.generator).toEqual(
        computeGeneratorCapabilities({resonance: 500, reflectivity: 500}, 1)
    )
})

test('gatherer/crafter/hauler drains are denominated', () => {
    expect(computeGathererCapabilities({strength: 0, hardness: 0, saturation: 213}, 1).drain).toBe(
        1_967_500
    )
    expect(computeCrafterCapabilities({fineness: 0, conductivity: 213}, 1).drain).toBe(23_546)
})

test('gatherer depth accepts canonical tolerance and legacy recipe-labelled hardness', () => {
    expect(computeGathererCapabilities({strength: 0, tolerance: 213, saturation: 0}, 2).depth).toBe(
        4_343
    )
    expect(computeGathererCapabilities({strength: 0, hardness: 213, saturation: 0}, 1).depth).toBe(
        1_565
    )
})

describe('computeGathererYield', () => {
    test('table is the k=0.2 integer-percent curve T1..T10', () => {
        expect([...GATHERER_YIELD_TIER_TABLE]).toEqual([
            100, 120, 140, 160, 180, 200, 220, 240, 260, 280,
        ])
    })

    test('T1 equals the base yield 200 + str (no change)', () => {
        expect(computeGathererYield(500, 1)).toBe(700)
        expect(computeGathererYield(0, 1)).toBe(200)
    })

    test('T2 scales base yield by 1.2, floored', () => {
        expect(computeGathererYield(500, 2)).toBe(840) // floor(700 * 120 / 100)
        expect(computeGathererYield(213, 2)).toBe(495) // floor(413 * 120 / 100) = floor(495.6)
    })

    test('T10 scales base yield by 2.8, floored', () => {
        expect(computeGathererYield(500, 10)).toBe(1960) // 700 * 280 / 100
    })

    test('tier is clamped to [1, 10]', () => {
        expect(computeGathererYield(500, 0)).toBe(700)
        expect(computeGathererYield(500, 99)).toBe(1960)
    })
})

describe('module tier tables', () => {
    const ALL_TABLES = [
        ENGINE_THRUST_TIER_PCT,
        GENERATOR_CAPACITY_TIER_PCT,
        GENERATOR_RECHARGE_TIER_PCT,
        CRAFTER_SPEED_TIER_PCT,
        BUILDER_SPEED_TIER_PCT,
        WARP_RANGE_TIER_PCT,
        LOADER_THRUST_TIER_PCT,
    ]
    test('every table has 10 rows and T1 = 100', () => {
        for (const table of ALL_TABLES) {
            expect(table.length).toBe(10)
            expect(table[0]).toBe(100)
        }
    })
    test('moduleTierPct clamps out-of-range tiers', () => {
        expect(moduleTierPct(ENGINE_THRUST_TIER_PCT, 0)).toBe(100)
        expect(moduleTierPct(ENGINE_THRUST_TIER_PCT, 11)).toBe(280)
    })
    test('engine thrust tiers (stat 500 pre-effective)', () => {
        expect(computeEngineThrust(500, 1)).toBe(775)
        expect(computeEngineThrust(500, 2)).toBe(930)
        expect(computeEngineThrust(500, 10)).toBe(2170)
    })
    test('generator capacity k=0.1, recharge k=0.2', () => {
        expect(computeGeneratorCap(500, 1)).toBe(1_550_000)
        expect(computeGeneratorCap(500, 2)).toBe(1_705_000)
        expect(computeGeneratorCap(500, 10)).toBe(2_945_000)
        expect(computeGeneratorRech(500, 1)).toBe(5000)
        expect(computeGeneratorRech(500, 2)).toBe(6000)
        expect(computeGeneratorRech(500, 10)).toBe(14000)
    })
    test('crafter/builder speed tiers', () => {
        expect(computeCrafterSpeed(500, 1)).toBe(500)
        expect(computeCrafterSpeed(500, 2)).toBe(600)
        expect(computeBuilderSpeed(500, 2)).toBe(600)
        expect(computeBuilderSpeed(500, 10)).toBe(1400)
    })
    test('warp range tiers', () => {
        expect(computeWarpRange(500, 1)).toBe(1600)
        expect(computeWarpRange(500, 2)).toBe(1920)
        expect(computeWarpRange(500, 10)).toBe(4480)
    })
    test('loader thrust tiers floor correctly', () => {
        expect(computeLoaderThrust(500, 1)).toBe(26)
        expect(computeLoaderThrust(500, 2)).toBe(31)
        expect(computeLoaderThrust(500, 10)).toBe(72)
        expect(computeLoaderThrust(0, 2)).toBe(1)
    })
})
