export const STAR_STEP = 250
export const MAX_STARS_PER_STAT = 3
export const MAX_STAR_RATING = MAX_STARS_PER_STAT * 3

export function starsForStat(value: number): number {
    return Math.max(0, Math.min(MAX_STARS_PER_STAT, Math.floor(value / STAR_STEP)))
}

export function starRating(stat1: number, stat2: number, stat3: number): number {
    return starsForStat(stat1) + starsForStat(stat2) + starsForStat(stat3)
}

export function statMagnitude(stat1: number, stat2: number, stat3: number): number {
    return stat1 + stat2 + stat3
}
