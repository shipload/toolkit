export type ReserveTier = 'small' | 'medium' | 'large' | 'massive' | 'motherlode'

export interface TierRange {
    min: number
    max: number
}

export const RESERVE_TIERS: Record<ReserveTier, TierRange> = {
    small: {min: 15, max: 60},
    medium: {min: 100, max: 200},
    large: {min: 400, max: 700},
    massive: {min: 1000, max: 2500},
    motherlode: {min: 4000, max: 10000},
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

export function rollWithinTier(withinRoll: number, range: TierRange): number {
    const u = withinRoll / 65535
    const skewed = u * u
    return Math.floor(range.min + skewed * (range.max - range.min))
}
