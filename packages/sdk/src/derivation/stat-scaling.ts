export const MODULE_STAT_SCALING_ANCHOR = 213
export const MODULE_STAT_SCALING_POST_ANCHOR_PERCENT = 40

export const GENERATOR_RESONANCE_BASE_SLOPE = 500
export const GENERATOR_RESONANCE_POST_ANCHOR_SLOPE = 1_000

export function computeGeneratorResonanceCapacity(resonance: number): number {
    const below = Math.min(resonance, MODULE_STAT_SCALING_ANCHOR)
    const above = Math.max(0, resonance - MODULE_STAT_SCALING_ANCHOR)
    return below * GENERATOR_RESONANCE_BASE_SLOPE + above * GENERATOR_RESONANCE_POST_ANCHOR_SLOPE
}

export function computeEffectiveModuleStat(stat: number): number {
    if (stat <= MODULE_STAT_SCALING_ANCHOR) return stat
    return (
        MODULE_STAT_SCALING_ANCHOR +
        Math.floor(
            ((stat - MODULE_STAT_SCALING_ANCHOR) * MODULE_STAT_SCALING_POST_ANCHOR_PERCENT) / 100
        )
    )
}
