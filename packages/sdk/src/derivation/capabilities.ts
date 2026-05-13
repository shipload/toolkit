export function computeBaseHullmass(stats: Record<string, number>): number {
    return 100000 - 75 * stats.density
}

export function computeShipHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const statSum = stats.strength + stats.hardness + stats.saturation
    const exponent = statSum / 2997.0
    return {
        hullmass: computeBaseHullmass(stats),
        capacity: Math.floor(1000000 * 10 ** exponent),
    }
}

export function computeEngineCapabilities(stats: Record<string, number>): {
    thrust: number
    drain: number
} {
    const vol = stats.volatility
    const thm = stats.thermal

    return {
        thrust: 400 + Math.floor((vol * 3) / 4),
        drain: Math.max(30, 50 - Math.floor(thm / 70)),
    }
}

export function computeGeneratorCapabilities(stats: Record<string, number>): {
    capacity: number
    recharge: number
} {
    const com = stats.composition
    const fin = stats.fineness

    return {
        capacity: 300 + Math.floor(com / 6),
        recharge: 1 + Math.floor((fin * 3) / 1000),
    }
}

export interface GathererDepthParams {
    readonly floor: number
    readonly slope: number
}

export const GATHERER_DEPTH_TABLE: readonly GathererDepthParams[] = [
    {floor: 500, slope: 5},
    {floor: 2000, slope: 11},
    {floor: 7000, slope: 16},
    {floor: 15000, slope: 18},
    {floor: 25000, slope: 19},
    {floor: 35000, slope: 16},
    {floor: 46000, slope: 12},
    {floor: 53500, slope: 10},
    {floor: 60000, slope: 5},
    {floor: 63500, slope: 2},
]

export const GATHERER_DEPTH_MAX_TIER = 10

export function gathererDepthForTier(tol: number, tier: number): number {
    if (tier < 1 || tier > GATHERER_DEPTH_MAX_TIER) {
        throw new Error(`gatherer tier out of range: ${tier}`)
    }
    const p = GATHERER_DEPTH_TABLE[tier - 1]
    return p.floor + tol * p.slope
}

export function computeGathererCapabilities(
    stats: Record<string, number>,
    tier: number
): {
    yield: number
    drain: number
    depth: number
    speed: number
} {
    const str = stats.strength
    const con = stats.conductivity
    const ref = stats.reflectivity
    const tol = stats.tolerance

    return {
        yield: 200 + str,
        drain: Math.max(250, 1250 - Math.floor((con * 25) / 20)),
        depth: gathererDepthForTier(tol, tier),
        speed: 100 + Math.floor((ref * 4) / 5),
    }
}

export function computeLoaderCapabilities(stats: Record<string, number>): {
    mass: number
    thrust: number
    quantity: number
} {
    const insulation = stats.insulation
    const plasticity = stats.plasticity

    return {
        mass: Math.max(200, 2000 - Math.floor(insulation * 2)),
        thrust: 1 + Math.floor(plasticity / 500),
        quantity: 1,
    }
}

export function computeCrafterCapabilities(stats: Record<string, number>): {
    speed: number
    drain: number
} {
    const rea = stats.reactivity
    const fin = stats.fineness

    return {
        speed: 100 + Math.floor((rea * 4) / 5),
        drain: Math.max(5, 30 - Math.floor(fin / 33)),
    }
}

export function computeHaulerCapabilities(stats: Record<string, number>): {
    capacity: number
    efficiency: number
    drain: number
} {
    const fineness = stats.fineness
    const conductivity = stats.conductivity
    const composition = stats.composition

    return {
        capacity: Math.max(1, 1 + Math.floor(fineness / 400)),
        efficiency: 2000 + conductivity * 6,
        drain: Math.max(3, 15 - Math.floor(composition / 80)),
    }
}

export function computeStorageCapabilities(
    stats: Record<string, number>,
    baseCapacity: number
): {
    capacityBonus: number
} {
    const strength = stats.strength
    const density = stats.density
    const hardness = stats.hardness
    const saturation = stats.saturation

    const statSum = strength + density + hardness + saturation
    const capacityBonus = Math.floor(
        (baseCapacity * (10 + Math.floor((statSum * 10) / 2997))) / 100
    )

    return {capacityBonus}
}

import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../data/item-ids'
import {
    getModuleCapabilityType,
    MODULE_ENGINE,
    MODULE_GENERATOR,
    MODULE_GATHERER,
    MODULE_LOADER,
    MODULE_STORAGE,
    MODULE_CRAFTER,
    MODULE_HAULER,
    MODULE_WARP,
} from '../capabilities/modules'
import {getItem} from '../data/catalog'
import {decodeCraftedItemStats} from './crafting'
import {applySlotMultiplier, clampUint16, getSlotAmp, type InstalledModule} from '../entities/slot-multiplier'
import type {EntitySlot} from '../data/recipes-runtime'

export function computeBaseCapacity(itemId: number, stats: Record<string, number>): number {
    switch (itemId) {
        case ITEM_SHIP_T1_PACKED:
        case ITEM_EXTRACTOR_T1_PACKED:
        case ITEM_FACTORY_T1_PACKED:
        case ITEM_CONTAINER_T1_PACKED:
            return computeShipHullCapabilities(stats).capacity
        case ITEM_WAREHOUSE_T1_PACKED:
            return computeWarehouseHullCapabilities(stats).capacity
        case ITEM_CONTAINER_T2_PACKED:
            return computeContainerT2Capabilities(stats).capacity
        default:
            return 0
    }
}

export function computeWarpCapabilities(stats: Record<string, number>): {
    range: number
} {
    const res = stats.resonance
    return {range: 100 + res * 3}
}

export function computeWarehouseHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const statSum = stats.strength + stats.hardness + stats.saturation
    const exponent = statSum / 2997.0
    return {
        hullmass: computeBaseHullmass(stats),
        capacity: Math.floor(20000000 * 10 ** exponent),
    }
}

export interface ComputedCapabilities {
    hullmass: number
    capacity: number
    engines?: {thrust: number; drain: number}
    generator?: {capacity: number; recharge: number}
    gatherer?: {yield: number; drain: number; depth: number; speed: number}
    loaders?: {mass: number; thrust: number; quantity: number}
    crafter?: {speed: number; drain: number}
    hauler?: {capacity: number; efficiency: number; drain: number}
    warp?: {range: number}
}

export function computeEntityCapabilities(
    stats: Record<string, number>,
    itemId: number,
    modules: InstalledModule[],
    layout: EntitySlot[],
): ComputedCapabilities {
    let totalThrust = 0
    let totalEngineDrain = 0
    let hasEngine = false

    let totalGenCapacity = 0
    let totalGenRecharge = 0
    let hasGenerator = false

    let totalLoaderMass = 0
    let totalLoaderThrust = 0
    let totalLoaderQuantity = 0
    let hasLoader = false

    let totalGathYield = 0
    let totalGathDrain = 0
    let maxGathDepth = 0
    let totalGathSpeed = 0
    let hasGatherer = false

    let totalStorageBonus = 0
    const baseCapacity = computeBaseCapacity(itemId, stats)
    let installedModuleMass = 0

    let totalCrafterSpeed = 0
    let totalCrafterDrain = 0
    let hasCrafter = false

    let totalHaulerCapacity = 0
    let weightedHaulerEffNum = 0n
    let totalHaulerDrain = 0
    let hasHauler = false

    let totalWarpRange = 0
    let hasWarp = false

    for (const mod of modules) {
        const item = getItem(mod.itemId)
        const modType = getModuleCapabilityType(mod.itemId)
        const amp = getSlotAmp(layout, mod.slotIndex)
        const decodedStats = decodeCraftedItemStats(mod.itemId, mod.stats)
        installedModuleMass += item.mass

        if (modType === MODULE_ENGINE) {
            hasEngine = true
            const caps = computeEngineCapabilities(decodedStats)
            totalThrust += applySlotMultiplier(caps.thrust, amp)
            totalEngineDrain += caps.drain
        } else if (modType === MODULE_GENERATOR) {
            hasGenerator = true
            const caps = computeGeneratorCapabilities(decodedStats)
            totalGenCapacity += applySlotMultiplier(caps.capacity, amp)
            totalGenRecharge += applySlotMultiplier(caps.recharge, amp)
        } else if (modType === MODULE_GATHERER) {
            hasGatherer = true
            const tier = item.tier
            const caps = computeGathererCapabilities(decodedStats, tier)
            totalGathYield += applySlotMultiplier(caps.yield, amp)
            totalGathDrain += caps.drain
            if (caps.depth > maxGathDepth) maxGathDepth = caps.depth
            totalGathSpeed += applySlotMultiplier(caps.speed, amp)
        } else if (modType === MODULE_LOADER) {
            hasLoader = true
            const caps = computeLoaderCapabilities(decodedStats)
            totalLoaderMass += caps.mass
            totalLoaderThrust += applySlotMultiplier(caps.thrust, amp)
            totalLoaderQuantity += caps.quantity
        } else if (modType === MODULE_STORAGE) {
            const caps = computeStorageCapabilities(decodedStats, baseCapacity)
            totalStorageBonus += caps.capacityBonus
        } else if (modType === MODULE_CRAFTER) {
            hasCrafter = true
            const caps = computeCrafterCapabilities(decodedStats)
            totalCrafterSpeed += applySlotMultiplier(caps.speed, amp)
            totalCrafterDrain += caps.drain
        } else if (modType === MODULE_HAULER) {
            hasHauler = true
            const caps = computeHaulerCapabilities(decodedStats)
            const eff = applySlotMultiplier(caps.efficiency, amp)
            totalHaulerCapacity += caps.capacity
            weightedHaulerEffNum += BigInt(eff) * BigInt(caps.capacity)
            totalHaulerDrain += caps.drain
        } else if (modType === MODULE_WARP) {
            hasWarp = true
            const caps = computeWarpCapabilities(decodedStats)
            totalWarpRange += applySlotMultiplier(caps.range, amp)
        }
    }

    const result: ComputedCapabilities = {
        hullmass: computeBaseHullmass(stats) + installedModuleMass,
        capacity: baseCapacity + totalStorageBonus,
    }

    if (hasEngine) {
        result.engines = {thrust: totalThrust, drain: totalEngineDrain}
    }
    if (hasGenerator) {
        result.generator = {
            capacity: clampUint16(totalGenCapacity),
            recharge: clampUint16(totalGenRecharge),
        }
    }
    if (hasGatherer) {
        result.gatherer = {
            yield: clampUint16(totalGathYield),
            drain: totalGathDrain,
            depth: maxGathDepth,
            speed: clampUint16(totalGathSpeed),
        }
    }
    if (hasLoader) {
        result.loaders = {
            mass: totalLoaderMass,
            thrust: clampUint16(totalLoaderThrust),
            quantity: totalLoaderQuantity,
        }
    }
    if (hasCrafter) {
        result.crafter = {speed: clampUint16(totalCrafterSpeed), drain: totalCrafterDrain}
    }
    if (hasHauler) {
        const efficiency =
            totalHaulerCapacity > 0
                ? Number(weightedHaulerEffNum / BigInt(totalHaulerCapacity))
                : 0
        result.hauler = {
            capacity: totalHaulerCapacity,
            efficiency: clampUint16(efficiency),
            drain: totalHaulerDrain,
        }
    }
    if (hasWarp) {
        result.warp = {range: totalWarpRange}
    }

    return result
}

export function computeContainerCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    return computeShipHullCapabilities(stats)
}

export function computeContainerT2Capabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const strength = stats.strength
    const density = stats.density
    const hardness = stats.hardness
    const saturation = stats.saturation

    const hullmass = 70000 - 50 * density

    const statSum = strength + hardness + saturation
    const exponent = statSum / 2500
    const capacity = Math.floor(1500000 * 10 ** exponent)

    return {hullmass, capacity}
}
