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

export function computeShipHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const density = stats.density ?? 500
    const strength = stats.strength ?? 500
    const ductility = stats.ductility ?? 500
    const purity = stats.purity ?? 500

    const hullmass = 25000 + 75 * density
    const statSum = strength + ductility + purity
    const exponent = statSum / 2997.0
    const capacity = Math.floor(1000000 * Math.pow(10, exponent))

    return {hullmass, capacity}
}

export function computeEngineCapabilities(stats: Record<string, number>): {
    thrust: number
    drain: number
} {
    const vol = stats.volatility ?? 500
    const thm = stats.thermal ?? 500

    return {
        thrust: 400 + Math.floor((vol * 3) / 4),
        drain: Math.max(30, 50 - Math.floor(thm / 70)),
    }
}

export function computeGeneratorCapabilities(stats: Record<string, number>): {
    capacity: number
    recharge: number
} {
    const res = stats.resonance ?? 500
    const clr = stats.clarity ?? 500

    return {
        capacity: 300 + Math.floor(res / 6),
        recharge: 1 + Math.floor((clr * 3) / 1000),
    }
}

export function computeGathererCapabilities(stats: Record<string, number>): {
    yield: number
    drain: number
    depth: number
    speed: number
} {
    const str = stats.strength ?? 500
    const con = stats.conductivity ?? 500
    const ref = stats.reflectivity ?? 500
    const tol = stats.tolerance ?? 500

    return {
        yield: 200 + str,
        drain: Math.max(250, 1250 - Math.floor((con * 25) / 20)),
        depth: 200 + Math.floor((tol * 3) / 2),
        speed: 100 + Math.floor((ref * 4) / 5),
    }
}

export function computeLoaderCapabilities(stats: Record<string, number>): {
    mass: number
    thrust: number
    quantity: number
} {
    const duc = stats.ductility ?? 500
    const pla = stats.plasticity ?? 500

    return {
        mass: Math.max(200, 2000 - Math.floor(duc * 2)),
        thrust: 1 + Math.floor(pla / 500),
        quantity: 1,
    }
}

export function computeManufacturingCapabilities(stats: Record<string, number>): {
    speed: number
    drain: number
} {
    const rea = stats.reactivity ?? 500
    const clr = stats.clarity ?? 500

    return {
        speed: 100 + Math.floor((rea * 4) / 5),
        drain: Math.max(5, 30 - Math.floor(clr / 33)),
    }
}

export function computeHaulerCapabilities(stats: Record<string, number>): {
    capacity: number
    efficiency: number
    drain: number
} {
    const res = stats.resonance ?? 500
    const con = stats.conductivity ?? 500
    const clr = stats.clarity ?? 500

    return {
        capacity: Math.max(1, 1 + Math.floor(res / 400)),
        efficiency: 2000 + con * 6,
        drain: Math.max(3, 15 - Math.floor(clr / 80)),
    }
}

export function computeStorageCapabilities(
    stats: Record<string, number>,
    baseCapacity: number
): {
    capacityBonus: number
} {
    const strength = stats.strength ?? 500
    const ductility = stats.ductility ?? 500
    const purity = stats.purity ?? 500

    const statSum = strength + ductility + purity
    const capacityBonus = Math.floor(
        (baseCapacity * (10 + Math.floor((statSum * 10) / 2997))) / 100
    )

    return {capacityBonus}
}

export function computeWarehouseHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const density = stats.density ?? 500
    const strength = stats.strength ?? 500
    const ductility = stats.ductility ?? 500
    const purity = stats.purity ?? 500

    const hullmass = 25000 + 75 * density
    const statSum = strength + ductility + purity
    const exponent = statSum / 2997.0
    const capacity = Math.floor(20000000 * Math.pow(10, exponent))

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
    modules: {itemId: number; seed: bigint}[]
): ShipCapabilities {
    const ship: ShipCapabilities = {}

    const engineModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_ENGINE)
    if (engineModules.length > 0) {
        let totalThrust = 0
        let totalDrain = 0
        for (const m of engineModules) {
            const caps = computeEngineCapabilities(decodeCraftedItemStats(m.itemId, m.seed))
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
            const caps = computeGeneratorCapabilities(decodeCraftedItemStats(m.itemId, m.seed))
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
        let totalDepth = 0
        let totalSpeed = 0
        for (const m of gathererModules) {
            const caps = computeGathererCapabilities(decodeCraftedItemStats(m.itemId, m.seed))
            totalYield += caps.yield
            totalDrain += caps.drain
            totalDepth += caps.depth
            totalSpeed += caps.speed
        }
        ship.gatherer = {yield: totalYield, drain: totalDrain, depth: totalDepth, speed: totalSpeed}
    }

    const haulerModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_HAULER)
    if (haulerModules.length > 0) {
        let totalCapacity = 0
        let weightedEffNum = 0
        let totalDrain = 0
        for (const m of haulerModules) {
            const decoded = decodeCraftedItemStats(m.itemId, m.seed)
            const caps = computeHaulerCapabilities({
                resonance: decoded.capacity,
                conductivity: decoded.efficiency,
                clarity: decoded.drain,
            })
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
            const caps = computeLoaderCapabilities(decodeCraftedItemStats(m.itemId, m.seed))
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
            const caps = computeManufacturingCapabilities(decodeCraftedItemStats(m.itemId, m.seed))
            totalSpeed += caps.speed
            totalDrain += caps.drain
        }
        ship.crafter = {speed: totalSpeed, drain: totalDrain}
    }

    return ship
}
