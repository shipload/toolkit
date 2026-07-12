import {getEntityLayout} from '../data/recipes-runtime'
import {computeEffectiveModuleStat} from './stat-scaling'

export const DEFAULT_BASE_HULLMASS = 100_000

export function getBaseHullmassFor(itemId: number): number {
    return getEntityLayout(itemId)?.baseHullmass ?? DEFAULT_BASE_HULLMASS
}

export function computeBaseHullmass(itemId: number, stats: Record<string, number>): number {
    return Math.floor((getBaseHullmassFor(itemId) * (2000 - stats.density)) / 2000)
}

export function computeShipHullCapabilities(
    stats: Record<string, number>,
    itemId: number = ITEM_SHIP_T1_PACKED
): {
    hullmass: number
    capacity: number
} {
    const statSum = (stats.strength ?? 0) + (stats.hardness ?? 0)
    const exponent = statSum / 1998.0
    return {
        hullmass: computeBaseHullmass(itemId, stats),
        capacity: Math.floor(5000000 * 6 ** exponent),
    }
}

export function computeEngineCapabilities(stats: Record<string, number>): {
    thrust: number
    drain: number
} {
    const vol = computeEffectiveModuleStat(stats.volatility)
    const thm = computeEffectiveModuleStat(stats.thermal)

    return {
        thrust: 400 + Math.floor((vol * 3) / 4),
        drain: 2 * Math.max(30, 50 - Math.floor(thm / 70)),
    }
}

export function computeGeneratorCapabilities(stats: Record<string, number>): {
    capacity: number
    recharge: number
} {
    const res = computeEffectiveModuleStat(stats.resonance)
    const ref = computeEffectiveModuleStat(stats.reflectivity)

    return {
        capacity: 1_300_000 + res * 500,
        recharge: 2000 + ref * 6,
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
    {floor: 63537, slope: 2},
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
} {
    const str = stats.strength
    const con = stats.saturation
    // Gatherer capabilities are positional in the contract: packed slot 1 is tolerance.
    // T1 recipe presentation historically labels that blended slot as hardness, so retain
    // that fallback for callers that only have recipe-decoded named stats.
    const tol = stats.tolerance ?? stats.hardness

    return {
        yield: 200 + str,
        drain: 2 * Math.max(250_000, 1_250_000 - con * 1250),
        depth: gathererDepthForTier(tol, tier),
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
        thrust: 1 + Math.floor((plasticity * plasticity) / 10000),
        quantity: 1,
    }
}

export function computeCrafterCapabilities(stats: Record<string, number>): {
    speed: number
    drain: number
} {
    const fin = stats.fineness
    const con = stats.conductivity

    return {
        speed: 100 + Math.floor((fin * 4) / 5),
        drain: Math.max(5000, 30000 - Math.floor((con * 1000) / 33)),
    }
}

export function computeHaulerCapabilities(
    stats: Record<string, number>,
    tier: number
): {
    capacity: number
    efficiency: number
    drain: number
} {
    const resonance = stats.resonance
    const plasticity = stats.plasticity
    const conductivity = stats.conductivity

    return {
        capacity: computeHaulerCapacity(resonance, tier),
        efficiency: 2000 + plasticity * 6,
        drain: computeHaulerDrain(conductivity, tier),
    }
}

export function computeLauncherCapabilities(
    stats: {charge_rate: number; velocity: number; drain: number},
    amp = 100
): {chargeRate: number; velocity: number; drain: number} {
    return {
        chargeRate: Math.floor((stats.charge_rate * amp) / 100),
        velocity: Math.floor((stats.velocity * amp) / 100),
        drain: stats.drain,
    }
}

export function computeStorageCapabilities(
    stats: Record<string, number>,
    tier: number
): {
    capacity: number
    drain: number
} {
    return {
        capacity: computeCargoBayCapacity(
            stats.strength ?? 0,
            stats.density ?? 0,
            stats.hardness ?? 0
        ),
        drain: computeCargoBayDrain(stats.cohesion ?? 0, tier),
    }
}

export function computeBatteryCapabilities(stats: Record<string, number>): {
    capacity: number
} {
    const volatility = stats.volatility ?? 0
    const thermal = stats.thermal ?? 0
    const plasticity = stats.plasticity ?? 0
    const insulation = stats.insulation ?? 0

    const statSum = volatility + thermal + plasticity + insulation
    return {capacity: 2_500_000 + Math.floor((statSum * 7_500_000) / 3996)}
}

import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_HAULER_SHIP_T2_PACKED,
    ITEM_MASS_CATCHER_T1_PACKED,
    ITEM_MASS_DRIVER_T1_PACKED,
    ITEM_PROSPECTOR_T1_PACKED,
    ITEM_PROSPECTOR_T2_PACKED,
    ITEM_ROUSTABOUT_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_TENDER_T1_PACKED,
    ITEM_TUG_T1_PACKED,
    ITEM_PORTER_T1_PACKED,
    ITEM_WRANGLER_T1_PACKED,
    ITEM_DREDGER_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../data/item-ids'
import {
    getModuleCapabilityType,
    MODULE_BATTERY,
    MODULE_ENGINE,
    MODULE_GENERATOR,
    MODULE_GATHERER,
    MODULE_LOADER,
    MODULE_STORAGE,
    MODULE_CRAFTER,
    MODULE_HAULER,
    MODULE_WARP,
    MODULE_LAUNCHER,
} from '../capabilities/modules'
import {getItem} from '../data/catalog'
import {decodeCraftedItemStats, decodeStat} from './crafting'
import {
    applySlotMultiplier,
    applySlotMultiplierUint32,
    clampUint16,
    clampUint32,
    getSlotAmp,
    type InstalledModule,
} from '../entities/slot-multiplier'
import type {EntitySlot} from '../data/recipes-runtime'
import {
    computeCargoBayCapacity,
    computeCargoBayDrain,
    computeHaulerCapacity,
    computeHaulerDrain,
    computeTravelDrain,
} from '../nft/description'

export const CAPACITY_TIER_TABLE = [1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8, 4.2, 4.6]

export function capacityTierMultiplier(tier: number): number {
    const clampedTier = tier >= 1 && tier <= 10 ? tier : 1
    return CAPACITY_TIER_TABLE[clampedTier - 1]
}

export function applyCapacityTier(baseCapacity: number, tier: number): number {
    return clampUint32(Math.floor(baseCapacity * capacityTierMultiplier(tier)))
}

export function computeBaseCapacity(itemId: number, stats: Record<string, number>): number {
    let base: number
    switch (itemId) {
        case ITEM_SHIP_T1_PACKED:
        case ITEM_ROUSTABOUT_T1_PACKED:
        case ITEM_PROSPECTOR_T1_PACKED:
        case ITEM_TENDER_T1_PACKED:
        case ITEM_TUG_T1_PACKED:
        case ITEM_PORTER_T1_PACKED:
        case ITEM_WRANGLER_T1_PACKED:
        case ITEM_DREDGER_T1_PACKED:
        case ITEM_PROSPECTOR_T2_PACKED:
        case ITEM_HAULER_SHIP_T2_PACKED:
            base = computeShipHullCapabilities(stats, itemId).capacity
            break
        case ITEM_EXTRACTOR_T1_PACKED:
        case ITEM_FACTORY_T1_PACKED:
        case ITEM_MASS_DRIVER_T1_PACKED:
        case ITEM_MASS_CATCHER_T1_PACKED:
        case ITEM_CONTAINER_T1_PACKED:
        case ITEM_CONTAINER_T2_PACKED:
            base = computeContainerCapabilities(stats).capacity
            break
        case ITEM_WAREHOUSE_T1_PACKED:
            base = computeWarehouseHullCapabilities(stats).capacity
            break
        default:
            return 0
    }
    return applyCapacityTier(base, getItem(itemId).tier)
}

export function computeWarpCapabilities(stats: Record<string, number>): {
    range: number
} {
    const reflectivity = stats.reflectivity
    return {range: 100 + reflectivity * 3}
}

export function computeWarehouseHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const statSum = (stats.strength ?? 0) + (stats.hardness ?? 0)
    const exponent = statSum / 1998.0
    return {
        hullmass: computeBaseHullmass(ITEM_WAREHOUSE_T1_PACKED, stats),
        capacity: Math.floor(100000000 * 6 ** exponent),
    }
}

export interface GathererLaneEntry {
    slotIndex: number
    yield: number
    drain: number
    depth: number
    outputPct: number
}

export interface CrafterLaneEntry {
    slotIndex: number
    speed: number
    drain: number
    outputPct: number
}

export interface LoaderLaneEntry {
    slotIndex: number
    mass: number
    thrust: number
    outputPct: number
}

export interface TravelDrainBreakdown {
    engine: number
    cargoHolds: number
    tractorBeams: number
    total: number
}

export interface ComputedCapabilities {
    hullmass: number
    capacity: number
    engines?: {thrust: number; drain: number}
    travelDrain?: TravelDrainBreakdown
    generator?: {capacity: number; recharge: number}
    gatherer?: {yield: number; drain: number; depth: number}
    gathererLanes?: GathererLaneEntry[]
    loaders?: {mass: number; thrust: number; quantity: number}
    loaderLanes?: LoaderLaneEntry[]
    crafter?: {speed: number; drain: number}
    crafterLanes?: CrafterLaneEntry[]
    hauler?: {
        capacity: number
        efficiency: number
        drain: number
        capacityByTier: {tier: number; capacity: number}[]
    }
    warp?: {range: number}
    launcher?: {chargeRate: number; velocity: number; drain: number}
}

export function computeEntityCapabilities(
    stats: Record<string, number>,
    itemId: number,
    modules: InstalledModule[],
    layout: EntitySlot[]
): ComputedCapabilities {
    let totalThrust = 0
    let totalEngineThm = 0
    let engineCount = 0
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
    let hasGatherer = false

    let totalStorageCapacity = 0
    let totalCargoHoldDrain = 0
    const baseCapacity = computeBaseCapacity(itemId, stats)
    let installedModuleMass = 0

    let totalCrafterSpeed = 0
    let totalCrafterDrain = 0
    let hasCrafter = false

    let totalHaulerCapacity = 0
    let weightedHaulerEffNum = 0n
    let totalHaulerDrain = 0
    let hasHauler = false
    const haulerCapByTier = new Map<number, number>()

    let totalWarpRange = 0
    let hasWarp = false

    let totalLauncherChargeRate = 0
    let totalLauncherVelocity = 0
    let totalLauncherDrain = 0
    let hasLauncher = false

    let totalBatteryCapacity = 0

    const gathererLanes: GathererLaneEntry[] = []
    const crafterLanes: CrafterLaneEntry[] = []
    const loaderLanes: LoaderLaneEntry[] = []

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
            totalEngineThm += computeEffectiveModuleStat(decodedStats.thermal ?? 0)
            engineCount += 1
        } else if (modType === MODULE_GENERATOR) {
            hasGenerator = true
            const caps = computeGeneratorCapabilities(decodedStats)
            totalGenCapacity += applySlotMultiplierUint32(caps.capacity, amp)
            totalGenRecharge += applySlotMultiplierUint32(caps.recharge, amp)
        } else if (modType === MODULE_GATHERER) {
            hasGatherer = true
            const tier = item.tier
            const caps = computeGathererCapabilities(
                {
                    strength: decodeStat(mod.stats, 0),
                    tolerance: decodeStat(mod.stats, 1),
                    saturation: decodeStat(mod.stats, 2),
                },
                tier
            )
            const scaledYield = applySlotMultiplier(caps.yield, amp)
            totalGathYield += scaledYield
            totalGathDrain += caps.drain
            if (caps.depth > maxGathDepth) maxGathDepth = caps.depth
            gathererLanes.push({
                slotIndex: mod.slotIndex,
                yield: scaledYield,
                drain: caps.drain,
                depth: caps.depth,
                outputPct: amp,
            })
        } else if (modType === MODULE_LOADER) {
            hasLoader = true
            const caps = computeLoaderCapabilities(decodedStats)
            totalLoaderMass += caps.mass
            totalLoaderThrust += applySlotMultiplier(caps.thrust, amp)
            totalLoaderQuantity += caps.quantity
            loaderLanes.push({
                slotIndex: mod.slotIndex,
                mass: caps.mass,
                thrust: applySlotMultiplier(caps.thrust, amp),
                outputPct: amp,
            })
        } else if (modType === MODULE_STORAGE) {
            const caps = computeStorageCapabilities(decodedStats, item.tier)
            totalStorageCapacity += applySlotMultiplierUint32(caps.capacity, amp)
            totalCargoHoldDrain += caps.drain
        } else if (modType === MODULE_CRAFTER) {
            hasCrafter = true
            const caps = computeCrafterCapabilities(decodedStats)
            const scaledSpeed = applySlotMultiplier(caps.speed, amp)
            totalCrafterSpeed += scaledSpeed
            totalCrafterDrain += caps.drain
            crafterLanes.push({
                slotIndex: mod.slotIndex,
                speed: scaledSpeed,
                drain: caps.drain,
                outputPct: amp,
            })
        } else if (modType === MODULE_HAULER) {
            hasHauler = true
            const caps = computeHaulerCapabilities(decodedStats, item.tier)
            const eff = applySlotMultiplier(caps.efficiency, amp)
            totalHaulerCapacity += caps.capacity
            haulerCapByTier.set(item.tier, (haulerCapByTier.get(item.tier) ?? 0) + caps.capacity)
            weightedHaulerEffNum += BigInt(eff) * BigInt(caps.capacity)
            totalHaulerDrain += caps.drain
        } else if (modType === MODULE_WARP) {
            hasWarp = true
            const caps = computeWarpCapabilities(decodedStats)
            totalWarpRange += applySlotMultiplier(caps.range, amp)
        } else if (modType === MODULE_LAUNCHER) {
            hasLauncher = true
            const caps = computeLauncherCapabilities(
                {
                    charge_rate: decodedStats.charge_rate ?? decodeStat(mod.stats, 0),
                    velocity: decodedStats.velocity ?? decodeStat(mod.stats, 1),
                    drain: decodedStats.drain ?? decodeStat(mod.stats, 2),
                },
                amp
            )
            totalLauncherChargeRate = clampUint16(totalLauncherChargeRate + caps.chargeRate)
            totalLauncherVelocity = clampUint16(totalLauncherVelocity + caps.velocity)
            totalLauncherDrain = clampUint16(totalLauncherDrain + caps.drain)
        } else if (modType === MODULE_BATTERY) {
            const caps = computeBatteryCapabilities(decodedStats)
            totalBatteryCapacity += applySlotMultiplierUint32(caps.capacity, amp)
        }
    }

    if (hasGenerator && totalBatteryCapacity > 0) {
        totalGenCapacity += totalBatteryCapacity
    }

    const result: ComputedCapabilities = {
        hullmass: computeBaseHullmass(itemId, stats) + installedModuleMass,
        capacity: clampUint32(baseCapacity + totalStorageCapacity),
    }

    if (hasEngine) {
        const avgThm = engineCount > 0 ? Math.trunc(totalEngineThm / engineCount) : 0
        const engineDrain = computeTravelDrain(totalThrust, avgThm)
        const totalDrain = clampUint32(engineDrain + totalCargoHoldDrain + totalHaulerDrain)
        result.engines = {thrust: totalThrust, drain: totalDrain}
        result.travelDrain = {
            engine: engineDrain,
            cargoHolds: totalCargoHoldDrain,
            tractorBeams: totalHaulerDrain,
            total: totalDrain,
        }
    }
    if (hasGenerator) {
        result.generator = {
            capacity: clampUint32(totalGenCapacity),
            recharge: clampUint32(totalGenRecharge),
        }
    }
    if (hasGatherer) {
        result.gatherer = {
            yield: clampUint16(totalGathYield),
            drain: totalGathDrain,
            depth: maxGathDepth,
        }
        result.gathererLanes = gathererLanes
    }
    if (hasLoader) {
        result.loaders = {
            mass: totalLoaderMass,
            thrust: clampUint16(totalLoaderThrust),
            quantity: totalLoaderQuantity,
        }
        result.loaderLanes = loaderLanes
    }
    if (hasCrafter) {
        result.crafter = {speed: clampUint16(totalCrafterSpeed), drain: totalCrafterDrain}
        result.crafterLanes = crafterLanes
    }
    if (hasHauler) {
        const efficiency =
            totalHaulerCapacity > 0 ? Number(weightedHaulerEffNum / BigInt(totalHaulerCapacity)) : 0
        result.hauler = {
            capacity: totalHaulerCapacity,
            efficiency: clampUint16(efficiency),
            drain: totalHaulerDrain,
            capacityByTier: [...haulerCapByTier.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([tier, capacity]) => ({tier, capacity})),
        }
    }
    if (hasWarp) {
        result.warp = {range: totalWarpRange}
    }
    if (hasLauncher) {
        result.launcher = {
            chargeRate: totalLauncherChargeRate,
            velocity: totalLauncherVelocity,
            drain: totalLauncherDrain,
        }
    }

    return result
}

export function computeContainerCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const statSum = (stats.strength ?? 0) + (stats.hardness ?? 0)
    const exponent = statSum / 1998.0
    return {
        hullmass: computeBaseHullmass(ITEM_CONTAINER_T1_PACKED, stats),
        capacity: Math.floor(22000000 * 6 ** exponent),
    }
}
