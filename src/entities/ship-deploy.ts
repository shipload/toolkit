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
        thrust: 400 + Math.floor(vol * 3 / 4),
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
        recharge: 5 + Math.floor(clr * 15 / 1000),
    }
}

export function computeExtractorCapabilities(stats: Record<string, number>): {
    rate: number
    drain: number
    depth: number
    drill: number
} {
    const str = stats.strength ?? 500
    const con = stats.conductivity ?? 500
    const ref = stats.reflectivity ?? 500
    const tol = stats.tolerance ?? 500

    return {
        rate: 200 + str,
        drain: Math.max(10, 50 - Math.floor(con / 20)),
        depth: 200 + Math.floor(tol * 3 / 2),
        drill: 100 + Math.floor(ref * 4 / 5),
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
        speed: 100 + Math.floor(rea * 4 / 5),
        drain: Math.max(5, 30 - Math.floor(clr / 33)),
    }
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
