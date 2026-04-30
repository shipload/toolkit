import {decodeCraftedItemStats} from '../derivation/crafting'
import {
    getModuleCapabilityType,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_HAULER,
    MODULE_LOADER,
} from '../capabilities/modules'
import {getItem} from '../data/catalog'

export function computeShipHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const density = stats.density
    const strength = stats.strength
    const hardness = stats.hardness
    const saturation = stats.saturation

    const hullmass = 25000 + 75 * density
    const statSum = strength + hardness + saturation
    const exponent = statSum / 2997.0
    const capacity = Math.floor(1000000 * 10 ** exponent)

    return {hullmass, capacity}
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
]

export const GATHERER_DEPTH_MAX_TIER = 5

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

export function computeWarehouseHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const density = stats.density
    const strength = stats.strength
    const hardness = stats.hardness
    const saturation = stats.saturation

    const hullmass = 25000 + 75 * density
    const statSum = strength + hardness + saturation
    const exponent = statSum / 2997.0
    const capacity = Math.floor(20000000 * 10 ** exponent)

    return {hullmass, capacity}
}

export interface ShipCapabilities {
    engines?: {thrust: number; drain: number}
    generator?: {capacity: number; recharge: number}
    gatherer?: {yield: number; drain: number; depth: number; speed: number}
    hauler?: {capacity: number; efficiency: number; drain: number}
    loaders?: {mass: number; thrust: number; quantity: number}
    crafter?: {speed: number; drain: number}
}

export function computeShipCapabilities(
    modules: {itemId: number; stats: bigint}[]
): ShipCapabilities {
    const ship: ShipCapabilities = {}

    const engineModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_ENGINE)
    if (engineModules.length > 0) {
        let totalThrust = 0
        let totalDrain = 0
        for (const m of engineModules) {
            const caps = computeEngineCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalThrust += caps.thrust
            totalDrain += caps.drain
        }
        ship.engines = {thrust: totalThrust, drain: totalDrain}
    }

    const generatorModules = modules.filter(
        (m) => getModuleCapabilityType(m.itemId) === MODULE_GENERATOR
    )
    if (generatorModules.length > 0) {
        let totalCapacity = 0
        let totalRecharge = 0
        for (const m of generatorModules) {
            const caps = computeGeneratorCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalCapacity += caps.capacity
            totalRecharge += caps.recharge
        }
        ship.generator = {capacity: totalCapacity, recharge: totalRecharge}
    }

    const gathererModules = modules.filter(
        (m) => getModuleCapabilityType(m.itemId) === MODULE_GATHERER
    )
    if (gathererModules.length > 0) {
        let totalYield = 0
        let totalDrain = 0
        let maxDepth = 0
        let totalSpeed = 0
        for (const m of gathererModules) {
            const tier = getItem(m.itemId).tier
            const caps = computeGathererCapabilities(
                decodeCraftedItemStats(m.itemId, m.stats),
                tier
            )
            totalYield += caps.yield
            totalDrain += caps.drain
            if (caps.depth > maxDepth) maxDepth = caps.depth
            totalSpeed += caps.speed
        }
        ship.gatherer = {yield: totalYield, drain: totalDrain, depth: maxDepth, speed: totalSpeed}
    }

    const haulerModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_HAULER)
    if (haulerModules.length > 0) {
        let totalCapacity = 0
        let weightedEffNum = 0
        let totalDrain = 0
        for (const m of haulerModules) {
            const caps = computeHaulerCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalCapacity += caps.capacity
            weightedEffNum += caps.efficiency * caps.capacity
            totalDrain += caps.drain
        }
        ship.hauler = {
            capacity: totalCapacity,
            efficiency: totalCapacity > 0 ? Math.floor(weightedEffNum / totalCapacity) : 0,
            drain: totalDrain,
        }
    }

    const loaderModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_LOADER)
    if (loaderModules.length > 0) {
        let totalMass = 0
        let totalThrust = 0
        let totalQuantity = 0
        for (const m of loaderModules) {
            const caps = computeLoaderCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalMass += caps.mass
            totalThrust += caps.thrust
            totalQuantity += caps.quantity
        }
        ship.loaders = {mass: totalMass, thrust: totalThrust, quantity: totalQuantity}
    }

    const crafterModules = modules.filter(
        (m) => getModuleCapabilityType(m.itemId) === MODULE_CRAFTER
    )
    if (crafterModules.length > 0) {
        let totalSpeed = 0
        let totalDrain = 0
        for (const m of crafterModules) {
            const caps = computeCrafterCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalSpeed += caps.speed
            totalDrain += caps.drain
        }
        ship.crafter = {speed: totalSpeed, drain: totalDrain}
    }

    return ship
}
