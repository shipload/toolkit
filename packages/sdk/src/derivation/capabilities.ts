export function computeShipHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const density = stats.density
    const strength = stats.strength
    const hardness = stats.hardness
    const saturation = stats.saturation

    const hullmass = 100000 - 75 * density
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

export function computeWarehouseHullCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const density = stats.density
    const strength = stats.strength
    const hardness = stats.hardness
    const saturation = stats.saturation

    const hullmass = 100000 - 75 * density
    const statSum = strength + hardness + saturation
    const exponent = statSum / 2997.0
    const capacity = Math.floor(20000000 * 10 ** exponent)

    return {hullmass, capacity}
}
