import {getEntityLayout} from '../data/recipes-runtime'
import {ENTITY_SHIP, getPackedEntityType} from '../data/kind-registry'
import {computeEffectiveModuleStat, computeGeneratorResonanceCapacity} from './stat-scaling'
import {resolveCapacityFnName, type CapacityFnName} from './capacity-fn-registry'

export const DEFAULT_BASE_HULLMASS = 1_000

export function getBaseHullmassFor(itemId: number): number {
    return getEntityLayout(itemId)?.baseHullmass ?? DEFAULT_BASE_HULLMASS
}

function isShipHull(itemId: number): boolean {
    return getPackedEntityType(itemId)?.equals(ENTITY_SHIP) ?? false
}

function sumHullStats(stats: Record<string, number>): number {
    return Object.values(stats).reduce((sum, value) => sum + value, 0)
}

export function computeBaseHullmassFromStats(
    itemId: number,
    stats: Record<string, number>
): number {
    if (isShipHull(itemId)) {
        return Math.floor((getBaseHullmassFor(itemId) * (10_000 - sumHullStats(stats))) / 10_000)
    }
    return Math.floor((getBaseHullmassFor(itemId) * (2000 - (stats.density ?? 0))) / 2000)
}

export function computeShipHullCapabilities(
    stats: Record<string, number>,
    itemId: number = ITEM_SHIP_T1_PACKED
): {
    hullmass: number
    capacity: number
} {
    const statSum = sumHullStats(stats)
    const exponent = statSum / 4995.0
    return {
        hullmass: computeBaseHullmassFromStats(itemId, stats),
        capacity: Math.floor(50000 * 6 ** exponent),
    }
}

export function computeEngineCapabilities(
    stats: Record<string, number>,
    tier: number
): {thrust: number; drain: number} {
    const thm = computeEffectiveModuleStat(stats.thermal)
    const rea = computeEffectiveModuleStat(stats.reactivity)
    return {
        thrust: Math.floor(
            ((400 + Math.floor((thm * 3) / 4)) * moduleTierPct(ENGINE_THRUST_TIER_PCT, tier)) / 100
        ),
        drain: 2 * Math.max(30, 50 - Math.floor(rea / 70)),
    }
}

export function computeGeneratorCapabilities(
    stats: Record<string, number>,
    tier: number
): {capacity: number; recharge: number} {
    const ref = computeGeneratorResonanceCapacity(stats.reflectivity)
    const res = computeEffectiveModuleStat(stats.resonance)
    return {
        capacity: Math.floor(
            ((1_300_000 + ref) * moduleTierPct(GENERATOR_CAPACITY_TIER_PCT, tier)) / 100
        ),
        recharge: Math.floor(
            ((2000 + res * 6) * moduleTierPct(GENERATOR_RECHARGE_TIER_PCT, tier)) / 100
        ),
    }
}

export const RANGE_FLOOR_LY = 5

export function rangeFloorDrainCap(generatorCapacity: number): number {
    return Math.floor(generatorCapacity / RANGE_FLOOR_LY)
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
    const str = stats.density
    const con = stats.thermal
    const tol = stats.tolerance

    return {
        yield: computeGathererYield(str, tier),
        drain: 2 * Math.max(250_000, 1_250_000 - con * 1250),
        depth: gathererDepthForTier(tol, tier),
    }
}

export function computeLoaderCapabilities(
    stats: Record<string, number>,
    tier: number
): {payload: number; thrust: number; quantity: number} {
    const hardness = stats.hardness
    const fineness = stats.fineness
    return {
        payload: computeLoaderPayload(hardness),
        thrust: Math.floor(
            ((1 + Math.floor((fineness * fineness) / 10000)) *
                moduleTierPct(LOADER_THRUST_TIER_PCT, tier)) /
                100
        ),
        quantity: 1,
    }
}

export function computeCrafterCapabilities(
    stats: Record<string, number>,
    tier: number
): {speed: number; drain: number} {
    const rea = stats.reactivity
    const ref = stats.reflectivity
    return {
        speed: Math.floor(
            ((100 + Math.floor((rea * 4) / 5)) * moduleTierPct(CRAFTER_SPEED_TIER_PCT, tier)) / 100
        ),
        drain: Math.max(5000, 30000 - Math.floor((ref * 1000) / 33)),
    }
}

export function computeBuilderCapabilities(
    stats: Record<string, number>,
    tier: number
): {speed: number; drain: number} {
    const hardness = stats.hardness
    const fineness = stats.fineness
    return {
        speed: Math.floor(
            ((100 + Math.floor((hardness * 4) / 5)) * moduleTierPct(BUILDER_SPEED_TIER_PCT, tier)) /
                100
        ),
        drain: Math.max(5000, 30000 - Math.floor((fineness * 1000) / 33)),
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
    const insulation = stats.insulation
    const reflectivity = stats.reflectivity
    const saturation = stats.saturation

    return {
        capacity: computeHaulerCapacity(insulation, tier),
        efficiency: 2000 + reflectivity * 6,
        drain: computeHaulerDrain(saturation, tier),
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
        capacity: computeCargoBayCapacity(stats.density ?? 0, tier),
        drain: computeCargoBayDrain(stats.tolerance ?? 0, tier),
    }
}

export function computeBatteryCapabilities(
    stats: Record<string, number>,
    tier: number
): {
    capacity: number
} {
    return {
        capacity: computeBatteryBankCapacity(stats.saturation ?? 0, tier),
    }
}

import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_DEPOT_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T2_PACKED,
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
    MODULE_BUILDER,
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
    computeBatteryBankCapacity,
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

export const GATHERER_YIELD_TIER_TABLE = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280] as const

export const MODULE_MAX_TIER = 10

export const ENGINE_THRUST_TIER_PCT = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280] as const
export const GENERATOR_CAPACITY_TIER_PCT = [
    100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
] as const
export const GENERATOR_RECHARGE_TIER_PCT = [
    100, 120, 140, 160, 180, 200, 220, 240, 260, 280,
] as const
export const CRAFTER_SPEED_TIER_PCT = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280] as const
export const BUILDER_SPEED_TIER_PCT = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280] as const
export const WARP_RANGE_TIER_PCT = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280] as const
export const LOADER_THRUST_TIER_PCT = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280] as const
export const LOADER_PAYLOAD_MIN_PERMILLE = 500
export const LOADER_PAYLOAD_MAX_PERMILLE = 910
export const LOADER_DOCKED_MASS = 20

export function computeLoaderPayload(insulation: number): number {
    const span = LOADER_PAYLOAD_MAX_PERMILLE - LOADER_PAYLOAD_MIN_PERMILLE
    return LOADER_PAYLOAD_MIN_PERMILLE + Math.floor((Math.min(insulation, 999) * span) / 999)
}

// Mirrors calc_shuttle_mass: the load plus its thermal container.
export function calcShuttleMass(load: number, payload: number): number {
    return Math.floor((load * 1000) / Math.max(payload, 1))
}
export const CARGO_BAY_CAPACITY_TIER_PCT = [
    100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
] as const
export const BATTERY_CAPACITY_TIER_PCT = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190] as const

export function moduleTierPct(table: readonly number[], tier: number): number {
    const clamped = Math.min(Math.max(tier, 1), MODULE_MAX_TIER)
    return table[clamped - 1]
}

export function computeGathererYield(str: number, tier: number): number {
    const clampedTier = Math.min(Math.max(tier, 1), GATHERER_YIELD_TIER_TABLE.length)
    const pct = GATHERER_YIELD_TIER_TABLE[clampedTier - 1]
    return Math.floor(((200 + str) * pct) / 100)
}

const CAPACITY_FN_BY_NAME: Partial<
    Record<CapacityFnName, (stats: Record<string, number>) => number>
> = {
    warehouse: (stats) => computeWarehouseHullCapabilities(stats).capacity,
    depot: (stats) => computeDepotHullCapabilities(stats).capacity,
    container: (stats) => computeContainerCapabilities(stats).capacity,
    structure: computeStructureBaseCapacity,
}

export const STRUCTURE_BASE_CAPACITY = 322_355
export const WAREHOUSE_BASE_CAPACITY = 1_465_251

export function computeStructureBaseCapacity(_stats: Record<string, number>): number {
    return STRUCTURE_BASE_CAPACITY
}

export function computeBaseCapacity(itemId: number, stats: Record<string, number>): number {
    let base: number
    if (isShipHull(itemId)) {
        base = computeShipHullCapabilities(stats, itemId).capacity
    } else {
        const fnName = resolveCapacityFnName(itemId)
        const capacityFn = fnName ? CAPACITY_FN_BY_NAME[fnName] : undefined
        if (!capacityFn) return 0
        base = capacityFn(stats)
        if (fnName === 'container') {
            const pct = moduleTierPct(CARGO_BAY_CAPACITY_TIER_PCT, getItem(itemId).tier)
            return clampUint32(Math.floor((base * pct) / 100))
        }
    }
    return applyCapacityTier(base, getItem(itemId).tier)
}

export function computeWarpCapabilities(
    stats: Record<string, number>,
    tier: number
): {range: number} {
    const reflectivity = stats.reflectivity
    return {
        range: Math.floor(
            ((100 + reflectivity * 3) * moduleTierPct(WARP_RANGE_TIER_PCT, tier)) / 100
        ),
    }
}

export function computeWarehouseHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    return {
        hullmass: computeBaseHullmassFromStats(ITEM_WAREHOUSE_T2_PACKED, stats),
        capacity: WAREHOUSE_BASE_CAPACITY,
    }
}

export function computeDepotHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const statSum = (stats.strength ?? 0) + (stats.hardness ?? 0)
    const exponent = statSum / 1998.0
    return {
        hullmass: computeBaseHullmassFromStats(ITEM_DEPOT_T1_PACKED, stats),
        capacity: Math.floor(500000 * 6 ** exponent),
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

export interface BuilderLaneEntry {
    slotIndex: number
    speed: number
    drain: number
    outputPct: number
}

export interface LoaderLaneEntry {
    slotIndex: number
    payload: number
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
    loaders?: {payload: number; thrust: number; quantity: number}
    loaderLanes?: LoaderLaneEntry[]
    crafter?: {speed: number; drain: number}
    crafterLanes?: CrafterLaneEntry[]
    builder?: {speed: number; drain: number}
    builderLanes?: BuilderLaneEntry[]
    hauler?: {
        capacity: number
        efficiency: number
        drain: number
        capacityByTier: {tier: number; capacity: number}[]
    }
    warp?: {range: number}
    launcher?: {chargeRate: number; velocity: number; drain: number}
}

export type ModuleCapabilities =
    | {kind: 'engine'; tier: number; thrust: number; thermal: number}
    | {kind: 'generator'; tier: number; capacity: number; recharge: number}
    | {kind: 'gatherer'; tier: number; yield: number; drain: number; depth: number}
    | {kind: 'loader'; tier: number; payload: number; thrust: number; quantity: number}
    | {kind: 'storage'; tier: number; capacity: number; drain: number}
    | {kind: 'crafter'; tier: number; speed: number; drain: number}
    | {kind: 'builder'; tier: number; speed: number; drain: number}
    | {kind: 'hauler'; tier: number; capacity: number; efficiency: number; drain: number}
    | {kind: 'warp'; tier: number; range: number}
    | {kind: 'launcher'; tier: number; chargeRate: number; velocity: number; drain: number}
    | {kind: 'battery'; tier: number; capacity: number}

export type ModuleCapabilityKind = ModuleCapabilities['kind']

export function withPositionalModuleStats(
    itemId: number,
    stats: bigint,
    decoded: Record<string, number>
): Record<string, number> {
    switch (getModuleCapabilityType(itemId)) {
        case MODULE_WARP:
            return {...decoded, reflectivity: decodeStat(stats, 0)}
        default:
            return decoded
    }
}

export function computeModuleCapabilities(
    itemId: number,
    stats: bigint,
    outputPct = 100
): ModuleCapabilities | undefined {
    const modType = getModuleCapabilityType(itemId)
    if (modType === 0xff) return undefined
    const tier = getItem(itemId).tier
    const decodedStats = withPositionalModuleStats(
        itemId,
        stats,
        decodeCraftedItemStats(itemId, stats)
    )

    switch (modType) {
        case MODULE_ENGINE: {
            const caps = computeEngineCapabilities(decodedStats, tier)
            return {
                kind: 'engine',
                tier,
                thrust: applySlotMultiplier(caps.thrust, outputPct),
                thermal: computeEffectiveModuleStat(decodedStats.reactivity ?? 0),
            }
        }
        case MODULE_GENERATOR: {
            const caps = computeGeneratorCapabilities(decodedStats, tier)
            return {
                kind: 'generator',
                tier,
                capacity: applySlotMultiplierUint32(caps.capacity, outputPct),
                recharge: applySlotMultiplierUint32(caps.recharge, outputPct),
            }
        }
        case MODULE_GATHERER: {
            const caps = computeGathererCapabilities(decodedStats, tier)
            return {
                kind: 'gatherer',
                tier,
                yield: applySlotMultiplier(caps.yield, outputPct),
                drain: caps.drain,
                depth: caps.depth,
            }
        }
        case MODULE_LOADER: {
            const caps = computeLoaderCapabilities(decodedStats, tier)
            return {
                kind: 'loader',
                tier,
                payload: caps.payload,
                thrust: Math.max(1, applySlotMultiplier(caps.thrust, outputPct)),
                quantity: caps.quantity,
            }
        }
        case MODULE_STORAGE: {
            const caps = computeStorageCapabilities(decodedStats, tier)
            return {
                kind: 'storage',
                tier,
                capacity: applySlotMultiplierUint32(caps.capacity, outputPct),
                drain: caps.drain,
            }
        }
        case MODULE_CRAFTER: {
            const caps = computeCrafterCapabilities(decodedStats, tier)
            return {
                kind: 'crafter',
                tier,
                speed: applySlotMultiplier(caps.speed, outputPct),
                drain: caps.drain,
            }
        }
        case MODULE_BUILDER: {
            const caps = computeBuilderCapabilities(decodedStats, tier)
            return {
                kind: 'builder',
                tier,
                speed: applySlotMultiplier(caps.speed, outputPct),
                drain: caps.drain,
            }
        }
        case MODULE_HAULER: {
            const caps = computeHaulerCapabilities(decodedStats, tier)
            return {
                kind: 'hauler',
                tier,
                capacity: caps.capacity,
                efficiency: applySlotMultiplier(caps.efficiency, outputPct),
                drain: caps.drain,
            }
        }
        case MODULE_WARP: {
            const caps = computeWarpCapabilities(decodedStats, tier)
            return {kind: 'warp', tier, range: applySlotMultiplier(caps.range, outputPct)}
        }
        case MODULE_LAUNCHER: {
            const caps = computeLauncherCapabilities(
                {
                    charge_rate: decodedStats.charge_rate ?? decodeStat(stats, 0),
                    velocity: decodedStats.velocity ?? decodeStat(stats, 1),
                    drain: decodedStats.drain ?? decodeStat(stats, 2),
                },
                outputPct
            )
            return {kind: 'launcher', tier, ...caps}
        }
        case MODULE_BATTERY: {
            const caps = computeBatteryCapabilities(decodedStats, tier)
            return {
                kind: 'battery',
                tier,
                capacity: applySlotMultiplierUint32(caps.capacity, outputPct),
            }
        }
        default:
            return undefined
    }
}

// Mirrors entity_capabilities::loader_mass(): a fixed docked weight per fitted bay.
export function computeLoaderDockedMass(bayCount: number): number {
    return LOADER_DOCKED_MASS * bayCount
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

    let totalLoaderPayload = 0
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

    let totalBuilderSpeed = 0
    let totalBuilderDrain = 0
    let hasBuilder = false

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
    const builderLanes: BuilderLaneEntry[] = []
    const loaderLanes: LoaderLaneEntry[] = []

    for (const mod of modules) {
        const amp = getSlotAmp(layout, mod.slotIndex)
        installedModuleMass += getItem(mod.itemId).mass
        const caps = computeModuleCapabilities(mod.itemId, mod.stats, amp)
        if (!caps) continue

        if (caps.kind === 'engine') {
            hasEngine = true
            totalThrust += caps.thrust
            totalEngineThm += caps.thermal
            engineCount += 1
        } else if (caps.kind === 'generator') {
            hasGenerator = true
            totalGenCapacity += caps.capacity
            totalGenRecharge += caps.recharge
        } else if (caps.kind === 'gatherer') {
            hasGatherer = true
            totalGathYield += caps.yield
            totalGathDrain += caps.drain
            if (caps.depth > maxGathDepth) maxGathDepth = caps.depth
            gathererLanes.push({
                slotIndex: mod.slotIndex,
                yield: caps.yield,
                drain: caps.drain,
                depth: caps.depth,
                outputPct: amp,
            })
        } else if (caps.kind === 'loader') {
            hasLoader = true
            totalLoaderPayload += caps.payload
            totalLoaderThrust += caps.thrust
            totalLoaderQuantity += caps.quantity
            loaderLanes.push({
                slotIndex: mod.slotIndex,
                payload: caps.payload,
                thrust: caps.thrust,
                outputPct: amp,
            })
        } else if (caps.kind === 'storage') {
            totalStorageCapacity += caps.capacity
            totalCargoHoldDrain += caps.drain
        } else if (caps.kind === 'crafter') {
            hasCrafter = true
            totalCrafterSpeed += caps.speed
            totalCrafterDrain += caps.drain
            crafterLanes.push({
                slotIndex: mod.slotIndex,
                speed: caps.speed,
                drain: caps.drain,
                outputPct: amp,
            })
        } else if (caps.kind === 'builder') {
            hasBuilder = true
            totalBuilderSpeed += caps.speed
            totalBuilderDrain += caps.drain
            builderLanes.push({
                slotIndex: mod.slotIndex,
                speed: caps.speed,
                drain: caps.drain,
                outputPct: amp,
            })
        } else if (caps.kind === 'hauler') {
            hasHauler = true
            totalHaulerCapacity += caps.capacity
            haulerCapByTier.set(caps.tier, (haulerCapByTier.get(caps.tier) ?? 0) + caps.capacity)
            weightedHaulerEffNum += BigInt(caps.efficiency) * BigInt(caps.capacity)
            totalHaulerDrain += caps.drain
        } else if (caps.kind === 'warp') {
            hasWarp = true
            totalWarpRange += caps.range
        } else if (caps.kind === 'launcher') {
            hasLauncher = true
            totalLauncherChargeRate = clampUint16(totalLauncherChargeRate + caps.chargeRate)
            totalLauncherVelocity = clampUint16(totalLauncherVelocity + caps.velocity)
            totalLauncherDrain = clampUint16(totalLauncherDrain + caps.drain)
        } else if (caps.kind === 'battery') {
            totalBatteryCapacity += caps.capacity
        }
    }

    if (hasGenerator && totalBatteryCapacity > 0) {
        totalGenCapacity += totalBatteryCapacity
    }

    const result: ComputedCapabilities = {
        hullmass: computeBaseHullmassFromStats(itemId, stats) + installedModuleMass,
        capacity: clampUint32(baseCapacity + totalStorageCapacity),
    }

    if (hasEngine) {
        const avgThm = engineCount > 0 ? Math.trunc(totalEngineThm / engineCount) : 0
        const engineDrain = computeTravelDrain(totalThrust, avgThm)
        const uncappedDrain = clampUint32(engineDrain + totalCargoHoldDrain + totalHaulerDrain)
        const totalDrain = hasGenerator
            ? Math.min(uncappedDrain, rangeFloorDrainCap(clampUint32(totalGenCapacity)))
            : uncappedDrain
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
            payload: Math.floor(totalLoaderPayload / loaderLanes.length),
            thrust: clampUint16(totalLoaderThrust),
            quantity: totalLoaderQuantity,
        }
        result.loaderLanes = loaderLanes
    }
    if (hasCrafter) {
        result.crafter = {speed: clampUint16(totalCrafterSpeed), drain: totalCrafterDrain}
        result.crafterLanes = crafterLanes
    }
    if (hasBuilder) {
        result.builder = {speed: clampUint16(totalBuilderSpeed), drain: totalBuilderDrain}
        result.builderLanes = builderLanes
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

export function computeContainerCapabilities(
    stats: Record<string, number>,
    itemId: number = ITEM_CONTAINER_T1_PACKED
): {
    hullmass: number
    capacity: number
} {
    const statSum = (stats.strength ?? 0) + (stats.hardness ?? 0)
    const exponent = statSum / 1998.0
    return {
        hullmass: computeBaseHullmassFromStats(itemId, stats),
        capacity: Math.floor(141000 * 6 ** exponent),
    }
}
