import {expect, test} from 'bun:test'
import {
    chebyshevDistance,
    enumerateSpiral,
    type FindHit,
    renderFindResult,
} from '../../../src/commands/tools/find'

test('chebyshevDistance returns 0 for same coord', () => {
    expect(chebyshevDistance({x: 0, y: 0}, {x: 0, y: 0})).toBe(0)
})

test('chebyshevDistance returns max axis delta', () => {
    expect(chebyshevDistance({x: 0, y: 0}, {x: 3, y: 5})).toBe(5)
    expect(chebyshevDistance({x: 0, y: 0}, {x: -7, y: 2})).toBe(7)
    expect(chebyshevDistance({x: 10, y: 10}, {x: 12, y: 11})).toBe(2)
})

test('enumerateSpiral radius 0 returns single origin', () => {
    expect(enumerateSpiral(0)).toEqual([{x: 0, y: 0}])
})

test('enumerateSpiral sorts by ascending distance from origin', () => {
    const cells = enumerateSpiral(3)
    // First element is the origin (distance 0)
    expect(cells[0]).toEqual({x: 0, y: 0})
    // Distances should be monotonically non-decreasing
    for (let i = 1; i < cells.length; i++) {
        const prev = Math.max(Math.abs(cells[i - 1].x), Math.abs(cells[i - 1].y))
        const cur = Math.max(Math.abs(cells[i].x), Math.abs(cells[i].y))
        expect(cur).toBeGreaterThanOrEqual(prev)
    }
})

test('enumerateSpiral returns a square of (2R+1)^2 cells', () => {
    expect(enumerateSpiral(2).length).toBe(25)
    expect(enumerateSpiral(3).length).toBe(49)
})

test('enumerateSpiral with center offset produces distances relative to that center', () => {
    const cells = enumerateSpiral(1, {x: 10, y: 10})
    expect(cells[0]).toEqual({x: 10, y: 10})
    // All adjacent cells within Chebyshev 1 of (10,10) present
    expect(cells).toContainEqual({x: 11, y: 10})
    expect(cells).toContainEqual({x: 9, y: 10})
    expect(cells).toContainEqual({x: 10, y: 11})
    expect(cells).toContainEqual({x: 10, y: 9})
})

test('enumerateSpiral ordering is deterministic for ties', () => {
    const a = enumerateSpiral(2)
    const b = enumerateSpiral(2)
    expect(a).toEqual(b)
})

function makeHit(overrides: Partial<FindHit> = {}): FindHit {
    return {
        coord: {x: 0, y: 0},
        stratumIndex: 0,
        itemId: 101,
        itemName: 'Crude Ore',
        reserve: 100,
        richness: 500,
        distance: 0,
        ...overrides,
    }
}

test('renderFindResult with zero hits reports no strata message', () => {
    const out = renderFindResult([], 101, {x: 0, y: 0}, 'ship:1', 100, 30)
    expect(out).toContain('ship:1')
    expect(out).toContain('(no reachable strata found within radius)')
})

test('renderFindResult with hits includes each coord, stratum, reserve, and distance', () => {
    const hits = [
        makeHit({coord: {x: -3, y: 3}, stratumIndex: 45, reserve: 46, distance: 3}),
        makeHit({coord: {x: 8, y: -4}, stratumIndex: 235, reserve: 181, distance: 8}),
    ]
    const out = renderFindResult(hits, 101, {x: 0, y: 0}, 'ship:1', 240, 30)
    expect(out).toContain('(-3, 3)')
    expect(out).toContain('stratum [45]')
    expect(out).toContain('reserve 46')
    expect(out).toContain('dist 3')
    expect(out).toContain('(8, -4)')
    expect(out).toContain('stratum [235]')
    expect(out).toContain('dist 8')
})

test('renderFindResult header contains entity label and depth', () => {
    const out = renderFindResult([], 101, {x: 0, y: 0}, 'ship:42', 120, 25)
    expect(out).toContain('ship:42')
    expect(out).toContain('gatherer depth 120')
    expect(out).toContain('radius 25')
})
