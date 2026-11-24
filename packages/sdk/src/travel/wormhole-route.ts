import type {Checksum256Type} from '@wharfkit/antelope'
import {regionOf, WH, wormholeAtRegionEndpoint} from '../derivation/wormhole'
import {calc_transit_duration} from './travel'
import type {
    Coord,
    RouteFailure,
    RouteHeuristicCost,
    RouteLegCost,
    RoutePlan,
    SystemGraph,
} from './route-planner'
import {contractRouteHeuristic, planRouteWithRetry} from './route-build'
import {simulateRoute} from './route-simulator'
import type {RouteMoverInput, RouteSim} from './route-simulator'

export interface RouteJump {
    entrance: Coord
    exit: Coord
    seconds: number
    legsBefore: number
}

export interface WormholeRoutePlan extends RoutePlan {
    seconds: number
    jump?: RouteJump
}

export type WormholeRouteResult = WormholeRoutePlan | RouteFailure

export interface WormholeTrip {
    entrance: Coord
    exit: Coord
    seconds: number
    legs: number
    distance: number
}

const dist = (a: Coord, b: Coord): number => Math.hypot(a.x - b.x, a.y - b.y)
const sameCoord = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y
const legsOver = (distance: number, perLegReach: number): number =>
    distance === 0 ? 0 : Math.ceil(distance / perLegReach)

function mouthsNear(
    seed: Checksum256Type,
    center: Coord,
    radius: number
): {mouth: Coord; partner: Coord}[] {
    const min = regionOf(center.x - radius, center.y - radius)
    const max = regionOf(center.x + radius, center.y + radius)
    const out: {mouth: Coord; partner: Coord}[] = []
    for (let rx = min.rx; rx <= max.rx; rx++) {
        for (let ry = min.ry; ry <= max.ry; ry++) {
            const w = wormholeAtRegionEndpoint(seed, rx, ry)
            if (w && dist(center, w.from) <= radius) out.push({mouth: w.from, partner: w.to})
        }
    }
    return out
}

// A pair within budget has one side within half of it, so each end is searched to half the radius.
export function wormholeTrips(
    seed: Checksum256Type,
    origin: Coord,
    dest: Coord,
    perLegReach: number,
    maxLegs: number
): WormholeTrip[] {
    if (!(perLegReach > 0) || maxLegs < 0) return []
    const budget = maxLegs * perLegReach
    if (dist(origin, dest) + budget < WH.MIN_REACH) return []

    const seen = new Set<string>()
    const trips: WormholeTrip[] = []
    const consider = (entrance: Coord, exit: Coord): void => {
        const key = `${entrance.x},${entrance.y}>${exit.x},${exit.y}`
        if (seen.has(key)) return
        seen.add(key)
        const before = dist(origin, entrance)
        const after = dist(exit, dest)
        const legs = legsOver(before, perLegReach) + legsOver(after, perLegReach)
        if (legs > maxLegs) return
        trips.push({
            entrance,
            exit,
            seconds: calc_transit_duration(entrance.x, entrance.y, exit.x, exit.y).toNumber(),
            legs,
            distance: before + after,
        })
    }
    for (const {mouth, partner} of mouthsNear(seed, dest, budget / 2)) consider(partner, mouth)
    for (const {mouth, partner} of mouthsNear(seed, origin, budget / 2)) consider(mouth, partner)
    return trips.sort((a, b) => a.distance - b.distance || a.legs - b.legs)
}

function pathSeconds(
    from: Coord,
    waypoints: readonly Coord[],
    legCost: RouteLegCost,
    endsAtDestination: boolean
): number {
    let total = 0
    let prev = from
    for (let i = 0; i < waypoints.length; i++) {
        const to = waypoints[i]
        const cost = legCost({
            from: prev,
            to,
            distance: dist(prev, to),
            isDestination: endsAtDestination && i === waypoints.length - 1,
        })
        if (cost === null || !Number.isFinite(cost)) return Number.POSITIVE_INFINITY
        total += cost
        prev = to
    }
    return total
}

function pathDistance(from: Coord, waypoints: readonly Coord[]): number {
    let total = 0
    let prev = from
    for (const to of waypoints) {
        total += dist(prev, to)
        prev = to
    }
    return total
}

export interface PlanWormholeRouteParams {
    seed: Checksum256Type
    origin: Coord
    dest: Coord
    perLegReach: number
    graph: SystemGraph
    maxLegs: number
    legCost: RouteLegCost
    heuristicCost?: RouteHeuristicCost
}

function planJumpTrip(
    params: PlanWormholeRouteParams,
    trip: WormholeTrip
): WormholeRoutePlan | null {
    const {origin, dest, perLegReach, graph, maxLegs, legCost, heuristicCost} = params
    // The ship arrives at the entrance mid-trip, so that leg pays its recharge like any other stop.
    const enRoute: RouteLegCost = (leg) => legCost({...leg, isDestination: false})
    let before: Coord[] = []
    if (!sameCoord(origin, trip.entrance)) {
        const plan = planRouteWithRetry({
            origin,
            dest: trip.entrance,
            perLegReach,
            graph,
            maxLegs,
            legCost: enRoute,
            heuristicCost,
        })
        if (!plan.ok) return null
        before = plan.waypoints
    }
    let after: Coord[] = []
    if (!sameCoord(trip.exit, dest)) {
        const remaining = maxLegs - before.length
        if (remaining < 1) return null
        const plan = planRouteWithRetry({
            origin: trip.exit,
            dest,
            perLegReach,
            graph,
            maxLegs: remaining,
            legCost,
            heuristicCost,
        })
        if (!plan.ok) return null
        after = plan.waypoints
    }
    const seconds =
        pathSeconds(origin, before, enRoute, false) +
        trip.seconds +
        pathSeconds(trip.exit, after, legCost, true)
    const waypoints = [...before, ...after]
    return {
        ok: true,
        waypoints,
        legs: waypoints.length,
        totalDistance: pathDistance(origin, before) + pathDistance(trip.exit, after),
        seconds,
        jump: {
            entrance: trip.entrance,
            exit: trip.exit,
            seconds: trip.seconds,
            legsBefore: before.length,
        },
    }
}

// At most one jump; the plain route is kept when it is at least as fast.
export function planWormholeRoute(params: PlanWormholeRouteParams): WormholeRouteResult {
    const {seed, origin, dest, perLegReach, graph, maxLegs, legCost, heuristicCost} = params
    if (!graph.hasSystem(dest)) return {ok: false, reason: 'empty-destination'}

    let plain: WormholeRouteResult = {ok: false, reason: 'max-legs'}
    if (legsOver(dist(origin, dest), perLegReach) <= maxLegs) {
        const result = planRouteWithRetry({
            origin,
            dest,
            perLegReach,
            graph,
            maxLegs,
            legCost,
            heuristicCost,
        })
        plain = result.ok
            ? {...result, seconds: pathSeconds(origin, result.waypoints, legCost, true)}
            : result
    }

    for (const trip of wormholeTrips(seed, origin, dest, perLegReach, maxLegs)) {
        const jumped = planJumpTrip(params, trip)
        if (!jumped) continue
        return plain.ok && plain.seconds <= jumped.seconds ? plain : jumped
    }
    return plain
}

export interface TripEstimate {
    legs: number
    seconds: number
    jump?: RouteJump
}

function straightWaypoints(from: Coord, to: Coord, legs: number): Coord[] {
    const out: Coord[] = []
    for (let i = 1; i <= legs; i++) {
        out.push({
            x: from.x + ((to.x - from.x) * i) / legs,
            y: from.y + ((to.y - from.y) * i) / legs,
        })
    }
    return out
}

function carriedMovers(
    movers: readonly RouteMoverInput[],
    sim: RouteSim,
    elapsed: number
): RouteMoverInput[] {
    return movers.map((m) => {
        let energy = m.energy
        const key = String(m.ref.entityId)
        for (const leg of sim.legs) {
            if (leg.rechargeBefore && m.generator) energy = m.generator.capacity
            energy = Math.max(0, energy - (leg.energyCostByMover[key] ?? 0))
        }
        return {
            ...m,
            energy,
            priorMobilityEnd: 0,
            narrowBarrierEnd: 0,
            allLanesEnd: Math.max(0, (m.allLanesEnd ?? 0) - elapsed),
            cargoEffects: m.cargoEffects?.map((e) => ({...e, atSeconds: e.atSeconds - elapsed})),
        }
    })
}

export interface JumpRouteSim {
    legs: RouteSim['legs']
    legsBefore: number
    jumpStartsAt: number
    jumpSeconds: number
    totalSeconds: number
    reachable: boolean
}

export function simulateJumpRoute(
    movers: readonly RouteMoverInput[],
    waypoints: readonly Coord[],
    jump: RouteJump,
    origin: Coord,
    recharge: boolean
): JumpRouteSim {
    const before = simulateRoute([...movers], waypoints.slice(0, jump.legsBefore), origin, recharge)
    const barrier = movers.reduce(
        (mx, m) => Math.max(mx, m.priorMobilityEnd, m.narrowBarrierEnd),
        0
    )
    const jumpStartsAt = jump.legsBefore > 0 ? before.totalSeconds : barrier
    const elapsed = jumpStartsAt + jump.seconds
    const after = simulateRoute(
        carriedMovers(movers, before, elapsed),
        waypoints.slice(jump.legsBefore),
        jump.exit,
        recharge
    )
    return {
        legs: [...before.legs, ...after.legs],
        legsBefore: jump.legsBefore,
        jumpStartsAt,
        jumpSeconds: jump.seconds,
        totalSeconds: elapsed + after.totalSeconds,
        reachable: before.reachable && after.reachable,
    }
}

export interface EstimateTripParams {
    seed: Checksum256Type | null
    origin: Coord
    dest: Coord
    perLegReach: number
    movers: readonly RouteMoverInput[]
    maxLegs: number
}

// Straight-line legs on each side; the faster of the direct line and the best one-jump trip within maxLegs.
export function estimateTrip(params: EstimateTripParams): TripEstimate {
    const {seed, origin, dest, perLegReach, movers, maxLegs} = params
    const legs = legsOver(dist(origin, dest), perLegReach)
    if (legs === 0) return {legs: 0, seconds: 0}

    let jumped: TripEstimate | null = null
    const [trip] = seed ? wormholeTrips(seed, origin, dest, perLegReach, maxLegs) : []
    if (trip) {
        const legsBefore = legsOver(dist(origin, trip.entrance), perLegReach)
        const jump = {entrance: trip.entrance, exit: trip.exit, seconds: trip.seconds, legsBefore}
        const sim = simulateJumpRoute(
            movers,
            [
                ...straightWaypoints(origin, trip.entrance, legsBefore),
                ...straightWaypoints(trip.exit, dest, trip.legs - legsBefore),
            ],
            jump,
            origin,
            true
        )
        jumped = {legs: trip.legs, seconds: sim.totalSeconds, jump}
        if (contractRouteHeuristic(movers)(origin, dest) >= jumped.seconds) return jumped
    }

    const seconds = simulateRoute(
        [...movers],
        straightWaypoints(origin, dest, legs),
        origin,
        true
    ).totalSeconds
    return jumped && jumped.seconds < seconds ? jumped : {legs, seconds}
}
