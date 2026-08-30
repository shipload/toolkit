import {calc_rechargetime} from './travel'
import {MAX_LEGS, planRoute} from './route-planner'
import type {
    Coord,
    RouteHeuristicCost,
    RouteLegCost,
    RouteResult,
    SystemGraph,
} from './route-planner'
import {simulateRoute} from './route-simulator'
import type {RouteMoverInput} from './route-simulator'

export function planRouteWithRetry(input: {
    origin: Coord
    dest: Coord
    perLegReach: number
    graph: SystemGraph
    maxLegs?: number
    legCost?: RouteLegCost
    heuristicCost?: RouteHeuristicCost
}): RouteResult {
    const args = {...input, maxLegs: input.maxLegs ?? MAX_LEGS}
    const first = planRoute(args)
    if (first.ok || first.reason !== 'no-path') return first
    const widened = planRoute({...args, corridorSlack: input.perLegReach * 3})
    if (widened.ok || widened.reason !== 'no-path') return widened
    // The chain imposes no corridor, only per-hop reach, so exhaust the graph (nodeBudget-bounded) before declaring no-path.
    return planRoute({...args, corridorSlack: Number.POSITIVE_INFINITY})
}

export function contractRouteLegCost(movers: readonly RouteMoverInput[]): RouteLegCost {
    return ({from, to, isDestination}) => {
        const sim = simulateRoute([...movers], [to], from, true)
        const leg = sim.legs[0]
        if (!sim.reachable || !leg) return null

        let rechargeAfter = 0
        for (const mover of movers) {
            if (!mover.hasMovement || !mover.generator) continue
            const cost = leg.energyCostByMover[String(mover.ref.entityId)] ?? 0
            rechargeAfter = Math.max(
                rechargeAfter,
                Number(
                    calc_rechargetime(
                        mover.generator.capacity,
                        Math.max(0, mover.generator.capacity - cost),
                        mover.generator.recharge
                    )
                )
            )
        }

        return leg.flightSeconds + (isDestination ? 0 : rechargeAfter)
    }
}

export function contractRouteHeuristic(movers: readonly RouteMoverInput[]): RouteHeuristicCost {
    return (from, dest) =>
        simulateRoute([...movers], [dest], from, true).legs[0]?.flightSeconds ?? 0
}
