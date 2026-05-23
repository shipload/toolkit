import {getItem} from '../data/catalog'

export type ReserveTier = 'small' | 'medium' | 'large' | 'massive' | 'motherlode'

export interface TierRange {
    min: number
    max: number
}

export const RESERVE_TIERS: Record<ReserveTier, TierRange> = {
    small: {min: 3_600_000, max: 14_400_000},
    medium: {min: 24_000_000, max: 48_000_000},
    large: {min: 96_000_000, max: 168_000_000},
    massive: {min: 240_000_000, max: 600_000_000},
    motherlode: {min: 960_000_000, max: 2_400_000_000},
}

const SHALLOW_THRESHOLDS = {
    small: 0.8,
    medium: 0.991946,
    large: 0.999946,
    massive: 0.999996,
}

const DEEP_THRESHOLDS = {
    small: 0.5,
    medium: 0.95892,
    large: 0.99892,
    massive: 0.99992,
}

export const TIER_ROLL_MAX = 0x10000 // 65536

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

export function rollTier(tierRoll: number, stratum: number): ReserveTier {
    const d = Math.min(stratum, 65535) / 65535
    const smallMax = lerp(SHALLOW_THRESHOLDS.small, DEEP_THRESHOLDS.small, d) * TIER_ROLL_MAX
    const mediumMax = lerp(SHALLOW_THRESHOLDS.medium, DEEP_THRESHOLDS.medium, d) * TIER_ROLL_MAX
    const largeMax = lerp(SHALLOW_THRESHOLDS.large, DEEP_THRESHOLDS.large, d) * TIER_ROLL_MAX
    const massiveMax = lerp(SHALLOW_THRESHOLDS.massive, DEEP_THRESHOLDS.massive, d) * TIER_ROLL_MAX

    if (tierRoll < smallMax) return 'small'
    if (tierRoll < mediumMax) return 'medium'
    if (tierRoll < largeMax) return 'large'
    if (tierRoll < massiveMax) return 'massive'
    return 'motherlode'
}

export function rollWithinTier(
    withinRoll: number,
    range: TierRange,
    resourceUnitMass: number
): number {
    const u = withinRoll / 65535
    const skewed = u * u
    const depositMass = range.min + skewed * (range.max - range.min)
    return Math.max(1, Math.floor(depositMass / resourceUnitMass))
}

const RESERVE_TIER_ENTRIES = Object.entries(RESERVE_TIERS) as Array<[ReserveTier, TierRange]>

export function tierOfReserve(reserve: number, itemId: number): ReserveTier | null {
    if (reserve <= 0) return null
    const unitMass = getItem(itemId).mass
    if (unitMass <= 0) return null
    const impliedMassLow = reserve * unitMass
    const impliedMassHigh = impliedMassLow + unitMass
    for (const [tier, range] of RESERVE_TIER_ENTRIES) {
        if (impliedMassHigh > range.min && impliedMassLow <= range.max) return tier
    }
    return null
}
