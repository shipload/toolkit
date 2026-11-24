import {PRECISION} from '../types'
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
    nodeBudget?: number
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
    const bySquaredLength = new Map<number, {flight: number; recharge: number} | null>()
    return ({from, to, isDestination}) => {
        const squaredLength = (from.x - to.x) ** 2 + (from.y - to.y) ** 2
        let cost = bySquaredLength.get(squaredLength)
        if (cost === undefined) {
            cost = simulateLeg(movers, from, to)
            bySquaredLength.set(squaredLength, cost)
        }
        if (cost === null) return null
        return cost.flight + (isDestination ? 0 : cost.recharge)
    }
}

function simulateLeg(
    movers: readonly RouteMoverInput[],
    from: Coord,
    to: Coord
): {flight: number; recharge: number} | null {
    const sim = simulateRoute([...movers], [to], from, true)
    const leg = sim.legs[0]
    if (!sim.reachable || !leg) return null

    let recharge = 0
    for (const mover of movers) {
        if (!mover.hasMovement || !mover.generator) continue
        const cost = leg.energyCostByMover[String(mover.ref.entityId)] ?? 0
        recharge = Math.max(
            recharge,
            Number(
                calc_rechargetime(
                    mover.generator.capacity,
                    Math.max(0, mover.generator.capacity - cost),
                    mover.generator.recharge
                )
            )
        )
    }
    return {flight: leg.flightSeconds, recharge}
}

export function contractRouteHeuristic(movers: readonly RouteMoverInput[]): RouteHeuristicCost {
    const flight = (from: Coord, to: Coord): number =>
        simulateRoute([...movers], [to], from, true).legs[0]?.flightSeconds ?? 0
    const powered = movers.filter(
        (m) => m.hasMovement && m.engines && m.generator && m.engines.drain > 0
    )
    if (powered.length === 0) return flight

    // Upper bound on one leg's length, so the stop count below never overshoots.
    const reach = Math.min(
        ...powered.map(
            (m) => (m.generator!.capacity + 1 + m.engines!.drain / PRECISION) / m.engines!.drain
        )
    )
    const flightByCells = new Map<number, number>()
    const flightOver = (cells: number): number => {
        const whole = Math.floor(cells)
        let seconds = flightByCells.get(whole)
        if (seconds === undefined) {
            seconds = whole > 0 ? flight({x: 0, y: 0}, {x: whole, y: 0}) : 0
            flightByCells.set(whole, seconds)
        }
        return seconds
    }

    return (from, dest) => {
        const distance = Math.hypot(dest.x - from.x, dest.y - from.y)
        if (distance <= reach) return flight(from, dest)

        const fullLegs = Math.floor(distance / reach)
        const stops = Math.ceil(distance / reach) - 1
        const flights =
            fullLegs * flightOver(reach) + flightOver(distance - fullLegs * reach) - (fullLegs + 1)

        let recharge = stops
        for (const m of powered) {
            const drain = m.engines!.drain
            const spent = (distance - reach) * drain - stops * (drain / PRECISION + 1)
            recharge = Math.max(recharge, spent / m.generator!.recharge - stops)
        }
        return Math.max(0, flights) + recharge
    }
}
