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
        thrust: 100 + Math.floor(vol * 4 / 10),
        drain: Math.max(10, 50 - Math.floor(thm * 4 / 100)),
    }
}

export function computeGeneratorCapabilities(stats: Record<string, number>): {
    capacity: number
    recharge: number
} {
    const res = stats.resonance ?? 500
    const clr = stats.clarity ?? 500

    return {
        capacity: 150 + Math.floor(res * 45 / 100),
        recharge: 5 + Math.floor(clr * 15 / 1000),
    }
}
