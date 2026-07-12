import {describe, expect, test} from 'bun:test'
import {Bytes, Checksum256} from '@wharfkit/antelope'
import {
    MAX_LEGS,
    planRoute,
    sdkSystemGraph,
    type Coord,
    type SystemGraph,
} from '../../src/travel/route-planner'

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
            expect(
                Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y)
            ).toBeLessThanOrEqual(11)
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

    test('prefers the lower elapsed-time chain when leg costs are supplied', () => {
        const graph = gridGraph([
            {x: 10, y: 0},
            {x: 6, y: 9},
            {x: 14, y: 7},
            {x: 20, y: 0},
        ])
        let destinationEdges = 0
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 20, y: 0},
            perLegReach: 11,
            graph,
            legCost: ({to, isDestination}) => {
                if (isDestination) destinationEdges++
                return to.y === 0 ? 20 : 1
            },
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.legs).toBe(3)
        expect(result.waypoints).toEqual([
            {x: 6, y: 9},
            {x: 14, y: 7},
            {x: 20, y: 0},
        ])
        expect(destinationEdges).toBeGreaterThan(0)
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

describe('planRoute partial path on failure', () => {
    test('a no-path failure carries a partial path to the furthest reachable system', () => {
        // (3,0) is reachable from origin and within the corridor, but cannot bridge the gap to (40,0).
        const graph = gridGraph([
            {x: 3, y: 0},
            {x: 40, y: 0},
        ])
        const result = planRoute({origin: {x: 0, y: 0}, dest: {x: 40, y: 0}, perLegReach: 3, graph})
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.partialWaypoints?.length ?? 0).toBeGreaterThan(0)
        // the partial path ends at furthest, a real system
        const waypoints = result.partialWaypoints ?? []
        const last = waypoints[waypoints.length - 1]
        expect(graph.hasSystem(last)).toBe(true)
    })

    test('no progress yields an empty partial path', () => {
        const graph = gridGraph([{x: 100, y: 100}]) // nothing within reach of origin
        const result = planRoute({
            origin: {x: 0, y: 0},
            dest: {x: 100, y: 100},
            perLegReach: 3,
            graph,
        })
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.partialWaypoints?.length ?? 0).toBe(0)
    })
})

describe('MAX_LEGS', () => {
    test('is the single-trip hop cap of 12', () => {
        expect(MAX_LEGS).toBe(12)
    })
})

describe('sdkSystemGraph wormholes', () => {
    // Mirrors the contract is_travelable: a wormhole mouth is a travelable node even with no system.
    const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))
    const MOUTH = {x: 12, y: 295} // known wormhole mouth for SEED (see wormhole.test.ts)

    test('a wormhole mouth is a valid destination', () => {
        expect(sdkSystemGraph(SEED).hasSystem(MOUTH)).toBe(true)
    })

    test('nearby surfaces a wormhole mouth within reach', () => {
        const neighbors = sdkSystemGraph(SEED).nearby({x: MOUTH.x, y: MOUTH.y - 5}, 6)
        expect(neighbors.map((n) => n.coord)).toContainEqual(MOUTH)
    })
})
