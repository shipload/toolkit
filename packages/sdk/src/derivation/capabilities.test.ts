import {expect, test} from 'bun:test'
import {
    computeEntityCapabilities,
    computeGathererCapabilities,
    computeGeneratorCapabilities,
    computeCrafterCapabilities,
    computeLoaderCapabilities,
    computeBaseCapacity,
    computeContainerCapabilities,
} from './capabilities'
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
    ITEM_ROUSTABOUT_T1_PACKED,
    ITEM_PROSPECTOR_T1_PACKED,
    ITEM_TENDER_T1_PACKED,
    ITEM_TUG_T1_PACKED,
    ITEM_PORTER_T1_PACKED,
    ITEM_WRANGLER_T1_PACKED,
    ITEM_DREDGER_T1_PACKED,
} from '../data/item-ids'
import type {InstalledModule} from '../entities/slot-multiplier'
import type {EntitySlot} from '../data/recipes-runtime'

function makeGathererStats(strength: number, hardness: number, saturation: number): bigint {
    return encodeStats([strength, hardness, saturation, 0])
}

function makeCrafterStats(fineness: number, conductivity: number): bigint {
    return encodeStats([fineness, conductivity])
}

function makeLoaderStats(insulation: number, plasticity: number): bigint {
    return encodeStats([insulation, plasticity])
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
        ITEM_ROUSTABOUT_T1_PACKED,
        ITEM_PROSPECTOR_T1_PACKED,
        ITEM_TENDER_T1_PACKED,
        ITEM_TUG_T1_PACKED,
        ITEM_PORTER_T1_PACKED,
        ITEM_WRANGLER_T1_PACKED,
        ITEM_DREDGER_T1_PACKED,
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
    const caps1 = computeGathererCapabilities({strength: 300, hardness: 200, saturation: 400}, 1)
    const caps2 = computeGathererCapabilities({strength: 500, hardness: 100, saturation: 300}, 1)
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

    const caps = computeCrafterCapabilities({fineness: 400, conductivity: 300})
    const expectedSpeed = applySlotMultiplier(caps.speed, 120)
    expect(result.crafterLanes![0].speed).toBe(expectedSpeed)
    expect(result.crafterLanes![0].drain).toBe(caps.drain)
    expect(result.crafterLanes![0].outputPct).toBe(120)

    // Legacy crafter speed equals single-lane speed
    expect(result.crafter).toBeDefined()
    expect(result.crafter!.speed).toBe(expectedSpeed)
})

test('computeEntityCapabilities emits loaderLanes alongside legacy loaders sum', () => {
    const loaderStats = makeLoaderStats(600, 500)

    const modules: InstalledModule[] = [{slotIndex: 0, itemId: ITEM_LOADER_T1, stats: loaderStats}]

    const layout: EntitySlot[] = [{type: 'loader', outputPct: 80, maxTier: 1}]

    const result = computeEntityCapabilities({}, ITEM_EXTRACTOR_T1_PACKED, modules, layout)

    expect(result.loaderLanes).toBeDefined()
    expect(result.loaderLanes!.length).toBe(1)
    expect(result.loaderLanes![0].slotIndex).toBe(0)

    const caps = computeLoaderCapabilities({insulation: 600, plasticity: 500})
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
    const caps = computeGeneratorCapabilities({resonance: 213, reflectivity: 213})
    expect(caps.capacity).toBe(1_406_500)
    expect(caps.recharge).toBe(3_278)
})

test('gatherer/crafter/hauler drains are denominated', () => {
    expect(computeGathererCapabilities({strength: 0, hardness: 0, saturation: 213}, 1).drain).toBe(
        1_967_500
    )
    expect(computeCrafterCapabilities({fineness: 0, conductivity: 213}).drain).toBe(23_546)
})
