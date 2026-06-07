import {distanceBetweenPoints, findNearbyPlanets, hasSystem, PRECISION} from '@shipload/sdk'
import {Checksum256, type Checksum256Type} from '@wharfkit/antelope'

export interface Coord {
    x: number
    y: number
}

export interface Neighbor {
    coord: Coord
    dist: number
}

export interface SystemGraph {
    hasSystem(c: Coord): boolean
    nearby(c: Coord, reachTiles: number): Neighbor[]
}

export interface RoutePlan {
    ok: true
    waypoints: Coord[]
    legs: number
    totalDistance: number
}

export type RouteFailureReason = 'empty-destination' | 'no-path' | 'max-legs'

export interface RouteFailure {
    ok: false
    reason: RouteFailureReason
    furthest?: Coord
    legsNeeded?: number
}

export type RouteResult = RoutePlan | RouteFailure

export interface PlanRouteParams {
    origin: Coord
    dest: Coord
    perLegReach: number
    graph: SystemGraph
    corridorSlack?: number
    nodeBudget?: number
    maxLegs?: number
}

const key = (c: Coord): string => `${c.x},${c.y}`
const sameCoord = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y
const dist = (a: Coord, b: Coord): number => Math.hypot(a.x - b.x, a.y - b.y)

export function planRoute(params: PlanRouteParams): RouteResult {
    const {origin, dest, perLegReach, graph} = params
    const corridorSlack = params.corridorSlack ?? perLegReach
    const nodeBudget = params.nodeBudget ?? 5000
    const maxLegs = params.maxLegs ?? 12

    if (!graph.hasSystem(dest)) {
        return {ok: false, reason: 'empty-destination'}
    }

    const straightLine = dist(origin, dest)
    const heuristic = (c: Coord): number => Math.ceil(dist(c, dest) / perLegReach)

    const gScore = new Map<string, number>([[key(origin), 0]])
    const cameFrom = new Map<string, Coord>()
    const frontier: {coord: Coord; g: number; f: number; remaining: number}[] = [
        {coord: origin, g: 0, f: heuristic(origin), remaining: straightLine},
    ]

    let furthest = origin
    let furthestRemaining = dist(origin, dest)
    let expansions = 0
    let cappedByMaxLegs = false

    while (frontier.length > 0) {
        let bestIdx = 0
        for (let i = 1; i < frontier.length; i++) {
            const a = frontier[i]
            const b = frontier[bestIdx]
            if (a.f < b.f || (a.f === b.f && a.remaining < b.remaining)) {
                bestIdx = i
            }
        }
        const current = frontier.splice(bestIdx, 1)[0]

        if (sameCoord(current.coord, dest)) {
            return reconstruct(cameFrom, origin, dest)
        }

        if (current.remaining < furthestRemaining) {
            furthestRemaining = current.remaining
            furthest = current.coord
        }

        if (++expansions > nodeBudget) break

        for (const n of graph.nearby(current.coord, perLegReach)) {
            const inCorridor =
                dist(origin, n.coord) + dist(n.coord, dest) <= straightLine + corridorSlack
            if (!inCorridor) continue

            const tentativeG = current.g + 1
            if (tentativeG > maxLegs) {
                cappedByMaxLegs = true
                continue
            }
            const nk = key(n.coord)
            if (tentativeG < (gScore.get(nk) ?? Infinity)) {
                gScore.set(nk, tentativeG)
                cameFrom.set(nk, current.coord)
                const remaining = dist(n.coord, dest)
                frontier.push({
                    coord: n.coord,
                    g: tentativeG,
                    f: tentativeG + Math.ceil(remaining / perLegReach),
                    remaining,
                })
            }
        }
    }

    if (cappedByMaxLegs) {
        return {ok: false, reason: 'max-legs', furthest}
    }
    return {ok: false, reason: 'no-path', furthest}
}

function reconstruct(cameFrom: Map<string, Coord>, origin: Coord, dest: Coord): RoutePlan {
    const path: Coord[] = [dest]
    let cur = dest
    let totalDistance = 0
    while (!sameCoord(cur, origin)) {
        const prev = cameFrom.get(key(cur))
        if (!prev) break
        totalDistance += dist(prev, cur)
        path.unshift(prev)
        cur = prev
    }
    const waypoints = path.slice(1)
    return {ok: true, waypoints, legs: waypoints.length, totalDistance}
}

export function sdkSystemGraph(seed: Checksum256Type): SystemGraph {
    const s = Checksum256.from(seed)
    return {
        hasSystem: (c) => hasSystem(s, {x: c.x, y: c.y}),
        nearby: (c, reachTiles) =>
            findNearbyPlanets(s, {x: c.x, y: c.y}, reachTiles * PRECISION)
                .map((d) => ({
                    coord: {x: Number(d.destination.x), y: Number(d.destination.y)},
                    dist: Number(d.distance) / PRECISION,
                }))
                .filter((n) => !(n.coord.x === c.x && n.coord.y === c.y)),
    }
}
