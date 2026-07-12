export const MODULE_STAT_SCALING_ANCHOR = 213
export const MODULE_STAT_SCALING_POST_ANCHOR_PERCENT = 40

export function computeEffectiveModuleStat(stat: number): number {
    if (stat <= MODULE_STAT_SCALING_ANCHOR) return stat
    return (
        MODULE_STAT_SCALING_ANCHOR +
        Math.floor(
            ((stat - MODULE_STAT_SCALING_ANCHOR) * MODULE_STAT_SCALING_POST_ANCHOR_PERCENT) / 100
        )
    )
}
