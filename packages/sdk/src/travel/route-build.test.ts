import {expect, test} from 'bun:test'
import {planRoute} from './route-planner'
import type {Coord, SystemGraph} from './route-planner'
import type {RouteMoverInput} from './route-simulator'
import {contractRouteHeuristic, contractRouteLegCost, planRouteWithRetry} from './route-build'

function countingGraph(opts: {
    reachable: boolean
    nearby: (c: Coord) => {coord: Coord; dist: number}[]
}): {graph: SystemGraph; hasSystemCalls: () => number} {
    let calls = 0
    const graph: SystemGraph = {
        hasSystem: () => {
            calls++
            return opts.reachable
        },
        nearby: opts.nearby,
    }
    return {graph, hasSystemCalls: () => calls}
}

test('a route found on the first attempt does not retry', () => {
    const origin: Coord = {x: 0, y: 0}
    const dest: Coord = {x: 3, y: 0}
    const {graph, hasSystemCalls} = countingGraph({reachable: true, nearby: () => []})

    const result = planRouteWithRetry({origin, dest, perLegReach: 5, graph})

    expect(result.ok).toBe(true)
    expect(hasSystemCalls()).toBe(1)
})

test('a no-path result widens the corridor and retries until a route is found', () => {
    const origin: Coord = {x: 0, y: 0}
    const dest: Coord = {x: 100, y: 0}
    const mid: Coord = {x: 50, y: 28.4}
    const perLegReach = 6.4

    const {graph, hasSystemCalls} = countingGraph({
        reachable: true,
        nearby: (c) => {
            if (c.x === origin.x && c.y === origin.y) return [{coord: mid, dist: 0}]
            if (c.x === mid.x && c.y === mid.y) return [{coord: dest, dist: 0}]
            return []
        },
    })

    const result = planRouteWithRetry({origin, dest, perLegReach, graph})

    expect(result.ok).toBe(true)
    // Excluded from the default corridor, found once corridorSlack widens to perLegReach * 3.
    expect(hasSystemCalls()).toBe(2)
})

test('a non-no-path failure returns immediately without retrying', () => {
    const origin: Coord = {x: 0, y: 0}
    const dest: Coord = {x: 100, y: 0}
    const {graph, hasSystemCalls} = countingGraph({reachable: false, nearby: () => []})

    const result = planRouteWithRetry({origin, dest, perLegReach: 5, graph})

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('empty-destination')
    expect(hasSystemCalls()).toBe(1)
})

test('the node budget reaches every attempt', () => {
    const graph = latticeGraph()
    const args = {origin: {x: 0, y: 0}, dest: {x: 40, y: 3}, perLegReach: 5, graph, maxLegs: 64}

    expect(planRouteWithRetry(args).ok).toBe(true)
    const starved = planRouteWithRetry({...args, nodeBudget: 1})
    expect(starved.ok).toBe(false)
    if (!starved.ok) expect(starved.reason).toBe('no-path')
})

function latticeGraph(): SystemGraph {
    return {
        hasSystem: () => true,
        nearby: (c, reach) => {
            const out: {coord: Coord; dist: number}[] = []
            const r = Math.floor(reach)
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    const dist = Math.hypot(dx, dy)
                    if (dist === 0 || dist > reach) continue
                    out.push({coord: {x: c.x + dx, y: c.y + dy}, dist})
                }
            }
            return out
        },
    }
}

function batteryMover(reach: number): RouteMoverInput {
    const capacity = 7417917
    return {
        ref: {entityType: 'ship', entityId: 74},
        hasMovement: true,
        engines: {thrust: 701, drain: Math.floor(capacity / reach)},
        generator: {capacity, recharge: 4851},
        mass: 309090,
        energy: capacity,
        priorMobilityEnd: 0,
        narrowBarrierEnd: 0,
    }
}

function routeCost(movers: RouteMoverInput[], origin: Coord, waypoints: Coord[]): number {
    const cost = contractRouteLegCost(movers)
    let total = 0
    let from = origin
    waypoints.forEach((to, i) => {
        total += cost({
            from,
            to,
            distance: Math.hypot(to.x - from.x, to.y - from.y),
            isDestination: i === waypoints.length - 1,
        })!
        from = to
    })
    return total
}

test('the contract heuristic never exceeds the cheapest route and counts its recharge stops', () => {
    const graph = latticeGraph()
    const origin: Coord = {x: 0, y: 0}
    for (const reach of [5, 9]) {
        const movers = [batteryMover(reach)]
        const heuristic = contractRouteHeuristic(movers)
        for (const dest of [
            {x: 3, y: 1},
            {x: 2 * reach, y: 3},
            {x: 4 * reach + 1, y: -2},
        ]) {
            const cheapest = planRoute({
                origin,
                dest,
                perLegReach: reach,
                graph,
                maxLegs: 64,
                corridorSlack: reach,
                legCost: contractRouteLegCost(movers),
            })
            expect(cheapest.ok).toBe(true)
            if (!cheapest.ok) continue
            const best = routeCost(movers, origin, cheapest.waypoints)
            const estimate = heuristic(origin, dest)
            expect(estimate).toBeLessThanOrEqual(best)
            expect(estimate).toBeGreaterThan(best * 0.8)
        }
    }
})

test('a long-range ship reaches a distant destination within the node budget', () => {
    const movers = [batteryMover(12)]
    const origin: Coord = {x: 0, y: 0}
    const dest: Coord = {x: 150, y: 20}
    let expansions = 0
    const lattice = latticeGraph()
    const graph: SystemGraph = {
        hasSystem: lattice.hasSystem,
        nearby: (c, reach) => {
            expansions++
            return lattice.nearby(c, reach)
        },
    }

    const result = planRouteWithRetry({
        origin,
        dest,
        perLegReach: 12,
        graph,
        maxLegs: 64,
        legCost: contractRouteLegCost(movers),
        heuristicCost: contractRouteHeuristic(movers),
    })

    expect(result.ok).toBe(true)
    expect(expansions).toBeLessThan(2500)
})
