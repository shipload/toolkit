import {expect, test} from 'bun:test'
import {
    enumerateCircle,
    filterLeaderboardByDepth,
    partitionLeaderboardByDepth,
} from '../../../src/commands/tools/scan'
import {renderLeaderboard} from '../../../src/lib/scan/report'
import type {LeaderboardEntry} from '../../../src/lib/scan/types'

const makeEntry = (stratum: number): LeaderboardEntry => ({
    coord: {x: 0, y: 0},
    locType: 1,
    subtype: 0,
    itemId: 101,
    itemName: 'Crude Ore',
    stratum,
    richness: 500,
    reserve: 100,
    stats: {stat1: 0, stat2: 0, stat3: 0},
})

test('enumerateCircle with radius 0 returns single origin', () => {
    expect(enumerateCircle(0)).toEqual([{x: 0, y: 0}])
})

test('enumerateCircle respects radius boundary', () => {
    const cells = enumerateCircle(2)
    expect(cells.every((c) => c.x * c.x + c.y * c.y <= 4)).toBe(true)
})

test('enumerateCircle radius 2 count matches disk area formula', () => {
    const cells = enumerateCircle(2)
    expect(cells.length).toBeGreaterThan(0)
    expect(cells.length).toBeLessThanOrEqual(25)
})

test('enumerateCircle centers on origin by default', () => {
    const cells = enumerateCircle(1)
    expect(cells).toContainEqual({x: 0, y: 0})
    expect(cells).toContainEqual({x: 1, y: 0})
    expect(cells).toContainEqual({x: -1, y: 0})
})

test('enumerateCircle applies a center offset', () => {
    const cells = enumerateCircle(1, {x: 10, y: 10})
    expect(cells).toContainEqual({x: 10, y: 10})
    expect(cells).toContainEqual({x: 11, y: 10})
    expect(cells).toContainEqual({x: 9, y: 10})
    expect(cells).not.toContainEqual({x: 0, y: 0})
})

test('renderLeaderboard includes stratum index column', () => {
    const out = renderLeaderboard(
        [
            {
                coord: {x: -1, y: -1},
                locType: 2,
                subtype: 0,
                itemId: 101,
                itemName: 'Crude Ore',
                stratum: 7284,
                richness: 497,
                reserve: 178,
                stats: {stat1: 538, stat2: 184, stat3: 189},
            },
        ],
        900
    )
    expect(out).toContain('index')
    expect(out).toContain('7284')
})

test('filterLeaderboardByDepth keeps only entries at-or-below depth', () => {
    const kept = filterLeaderboardByDepth([makeEntry(42), makeEntry(200)], 100)
    expect(kept.length).toBe(1)
    expect(kept[0].stratum).toBe(42)
})

test('filterLeaderboardByDepth is inclusive at the boundary', () => {
    const kept = filterLeaderboardByDepth([makeEntry(100), makeEntry(101)], 100)
    expect(kept.length).toBe(1)
    expect(kept[0].stratum).toBe(100)
})

test('renderLeaderboard with markDepth suffixes OOD and appends legend', () => {
    const out = renderLeaderboard([makeEntry(42), makeEntry(500)], 900, 100)
    expect(out).toMatch(/500.* OOD/)
    expect(out).not.toMatch(/42.* OOD/)
    expect(out).toContain('OOD = out of depth')
})

test('renderLeaderboard without markDepth does not emit OOD column or legend', () => {
    const out = renderLeaderboard([makeEntry(42), makeEntry(500)], 900)
    expect(out).not.toContain('OOD')
})

test('partitionLeaderboardByDepth puts in-depth entries first and keeps OOD entries', () => {
    const input = [makeEntry(500), makeEntry(42), makeEntry(700), makeEntry(80)]
    const out = partitionLeaderboardByDepth(input, 100)
    expect(out.length).toBe(4)
    expect(out.slice(0, 2).map((e) => e.stratum)).toEqual([42, 80])
    expect(out.slice(2).map((e) => e.stratum)).toEqual([500, 700])
})

test('partitionLeaderboardByDepth preserves input order within each group', () => {
    const input = [makeEntry(500), makeEntry(700), makeEntry(42), makeEntry(80)]
    const out = partitionLeaderboardByDepth(input, 100)
    expect(out.map((e) => e.stratum)).toEqual([42, 80, 500, 700])
})

test('partitionLeaderboardByDepth when all entries are OOD keeps them all and tags via renderLeaderboard', () => {
    const input = [makeEntry(500), makeEntry(700)]
    const out = partitionLeaderboardByDepth(input, 100)
    expect(out.length).toBe(2)
    const rendered = renderLeaderboard(out, 900, 100)
    expect(rendered).not.toContain('(no strata scanned)')
    expect(rendered).toMatch(/500.* OOD/)
    expect(rendered).toMatch(/700.* OOD/)
})

test('partitionLeaderboardByDepth when all entries are in-depth leaves them unchanged', () => {
    const input = [makeEntry(10), makeEntry(50), makeEntry(99)]
    const out = partitionLeaderboardByDepth(input, 100)
    expect(out.map((e) => e.stratum)).toEqual([10, 50, 99])
})
