const BASE_HAUL_PENALTY_MILLI = 300
const HAULER_EFFICIENCY_DENOM = 10000
const PRECISION = 10000

export function computeHaulPenalty(
    totalThrust: number,
    haulCount: number,
    avgEfficiency: number
): number {
    if (haulCount === 0) return totalThrust
    const penaltyMilli =
        1000 +
        Math.floor(
            (haulCount * BASE_HAUL_PENALTY_MILLI * (HAULER_EFFICIENCY_DENOM - avgEfficiency)) /
                HAULER_EFFICIENCY_DENOM
        )
    return Math.floor((totalThrust * 1000) / penaltyMilli)
}

export function computeHaulerDrain(distance: number, drain: number, haulCount: number): number {
    return Math.floor(distance / PRECISION) * drain * haulCount
}
