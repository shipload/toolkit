import {describe, expect, test} from 'bun:test'
import {planRoute, type Coord, type SystemGraph} from '../../src/lib/route-planner'

function gridGraph(systems: Coord[]): SystemGraph {
    const set = new Set(systems.map((s) => `${s.x},${s.y}`))
    return {
        hasSystem: (c) => set.has(`${c.x},${c.y}`),
        nearby: (c, reach) =>
            systems
                .filter((s) => !(s.x === c.x && s.y === c.y))
                .map((s) => ({coord: s, dist: Math.hypot(s.x - c.x, s.y - c.y)}))
                .filter((n) => n.dist <= reach),
    }
}

describe('planRoute', () => {
    test('single leg when destination is within one charge', () => {
        const graph = gridGraph([{x: 5, y: 0}])
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 5, y: 0},
            perLegReach: 6,
            graph,
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.legs).toBe(1)
        expect(result.waypoints).toEqual([{x: 5, y: 0}])
    })

    test('two legs through one intermediate system', () => {
        const graph = gridGraph([
            {x: 10, y: 0},
            {x: 20, y: 0},
        ])
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 20, y: 0},
            perLegReach: 11,
            graph,
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.legs).toBe(2)
        expect(result.waypoints).toEqual([
            {x: 10, y: 0},
            {x: 20, y: 0},
        ])
    })

    test('routes around a gap when no system lies on the straight line', () => {
        const graph = gridGraph([
            {x: 6, y: 9},
            {x: 14, y: 7},
            {x: 20, y: 0},
        ])
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 20, y: 0},
            perLegReach: 11,
            graph,
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.legs).toBe(3)
        expect(result.waypoints[result.waypoints.length - 1]).toEqual({x: 20, y: 0})
        const chain = [{x: 0, y: 0}, ...result.waypoints]
        for (let i = 1; i < chain.length; i++) {
            expect(Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y)).toBeLessThanOrEqual(11)
        }
    })

    test('prefers the shorter chain when two paths exist', () => {
        const graph = gridGraph([
            {x: 10, y: 0},
            {x: 6, y: 9},
            {x: 14, y: 7},
            {x: 20, y: 0},
        ])
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 20, y: 0},
            perLegReach: 11,
            graph,
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.legs).toBe(2)
        expect(result.waypoints).toEqual([
            {x: 10, y: 0},
            {x: 20, y: 0},
        ])
    })

    test('rejects an empty destination cell', () => {
        const graph = gridGraph([{x: 10, y: 0}])
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 20, y: 0},
            perLegReach: 11,
            graph,
        })
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.reason).toBe('empty-destination')
    })

    test('reports no-path with a furthest frontier when the gap is too wide', () => {
        const graph = gridGraph([{x: 20, y: 0}])
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 20, y: 0},
            perLegReach: 8,
            graph,
        })
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.reason).toBe('no-path')
        expect(result.furthest).toEqual({x: 0, y: 0})
    })

    test('reports max-legs when the chain would exceed the cap', () => {
        const graph = gridGraph([
            {x: 6, y: 9},
            {x: 14, y: 7},
            {x: 20, y: 0},
        ])
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 20, y: 0},
            perLegReach: 11,
            maxLegs: 2,
            graph,
        })
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.reason).toBe('max-legs')
    })
})
