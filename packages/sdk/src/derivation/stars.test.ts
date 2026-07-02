import {expect, test} from 'bun:test'
import {
    compareByStars,
    MAX_STARS_PER_STAT,
    MAX_STAR_RATING,
    starRating,
    starsForStat,
    statMagnitude,
    STAR_STEP,
} from './stars'

test('starsForStat bands at the 250 boundaries', () => {
    expect(starsForStat(0)).toBe(0)
    expect(starsForStat(1)).toBe(0)
    expect(starsForStat(249)).toBe(0)
    expect(starsForStat(250)).toBe(1)
    expect(starsForStat(499)).toBe(1)
    expect(starsForStat(500)).toBe(2)
    expect(starsForStat(749)).toBe(2)
    expect(starsForStat(750)).toBe(3)
})

test('starsForStat clamps to MAX_STARS_PER_STAT', () => {
    expect(starsForStat(999)).toBe(MAX_STARS_PER_STAT)
    expect(starsForStat(1000)).toBe(MAX_STARS_PER_STAT)
    expect(starsForStat(10_000)).toBe(MAX_STARS_PER_STAT)
})

test('starsForStat never goes negative', () => {
    expect(starsForStat(-50)).toBe(0)
})

test('starRating sums per-stat stars to a 0-9 grade', () => {
    expect(starRating(0, 0, 0)).toBe(0)
    expect(starRating(250, 0, 0)).toBe(1)
    expect(starRating(750, 750, 750)).toBe(MAX_STAR_RATING)
    expect(starRating(999, 999, 999)).toBe(MAX_STAR_RATING)
    expect(starRating(599, 599, 599)).toBe(6)
    expect(starRating(251, 251, 251)).toBe(3)
})

test('statMagnitude sums raw values for tiebreaking', () => {
    expect(statMagnitude(599, 599, 599)).toBe(1797)
    expect(statMagnitude(251, 251, 251)).toBe(753)
    expect(statMagnitude(599, 599, 599)).toBeGreaterThan(statMagnitude(251, 251, 251))
})

test('compareByStars orders by rating desc, then magnitude desc', () => {
    const rows = [
        {key: 'low-rating', rating: 3, magnitude: 9000},
        {key: 'high-rating', rating: 6, magnitude: 300},
        {key: 'tie-small', rating: 6, magnitude: 600},
        {key: 'tie-big', rating: 6, magnitude: 900},
    ]
    const ordered = [...rows].sort(compareByStars).map((r) => r.key)
    expect(ordered).toEqual(['tie-big', 'tie-small', 'high-rating', 'low-rating'])
})

test('compareByStars returns 0 when rating and magnitude are equal', () => {
    expect(compareByStars({rating: 4, magnitude: 500}, {rating: 4, magnitude: 500})).toBe(0)
})

test('constants hold their documented values', () => {
    expect(STAR_STEP).toBe(250)
    expect(MAX_STARS_PER_STAT).toBe(3)
    expect(MAX_STAR_RATING).toBe(9)
})
