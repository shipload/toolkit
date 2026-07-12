import {distanceBetweenPoints, findNearbyPlanets} from './travel'
import {hasSystem} from '../utils/system'
import {nearbyWormholes, wormholeAt} from '../derivation/wormhole'
import {PRECISION} from '../types'
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

export interface RouteLegInput {
    from: Coord
    to: Coord
    distance: number
    isDestination: boolean
}

/**
 * Returns the elapsed-time search cost for a leg, or null when the leg is not contract-feasible.
 */
export type RouteLegCost = (leg: RouteLegInput) => number | null
export type RouteHeuristicCost = (from: Coord, dest: Coord) => number

export type RouteFailureReason = 'empty-destination' | 'no-path' | 'max-legs'

export interface RouteFailure {
    ok: false
    reason: RouteFailureReason
    furthest?: Coord
    legsNeeded?: number
    partialWaypoints?: Coord[]
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
    legCost?: RouteLegCost
    heuristicCost?: RouteHeuristicCost
}

const key = (c: Coord): string => `${c.x},${c.y}`
const sameCoord = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y
const dist = (a: Coord, b: Coord): number => Math.hypot(a.x - b.x, a.y - b.y)

export const MAX_LEGS = 12

export function planRoute(params: PlanRouteParams): RouteResult {
    const {origin, dest, perLegReach, graph} = params
    const corridorSlack = params.corridorSlack ?? perLegReach
    const nodeBudget = params.nodeBudget ?? 5000
    const maxLegs = params.maxLegs ?? MAX_LEGS

    if (!graph.hasSystem(dest)) {
        return {ok: false, reason: 'empty-destination'}
    }

    const straightLine = dist(origin, dest)
    if (straightLine <= perLegReach) {
        const directCost = params.legCost?.({
            from: origin,
            to: dest,
            distance: straightLine,
            isDestination: true,
        })
        if (directCost !== null) {
            return {ok: true, waypoints: [dest], legs: 1, totalDistance: straightLine}
        }
    }
    const heuristic = (c: Coord): number =>
        params.heuristicCost?.(c, dest) ??
        (params.legCost ? 0 : Math.ceil(dist(c, dest) / perLegReach))

    const gScore = new Map<string, number>([[key(origin), 0]])
    const cameFrom = new Map<string, Coord>()
    const frontier: {coord: Coord; legs: number; cost: number; f: number; remaining: number}[] = [
        {coord: origin, legs: 0, cost: 0, f: heuristic(origin), remaining: straightLine},
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
        if (current.cost !== gScore.get(key(current.coord))) continue

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

            const tentativeLegs = current.legs + 1
            if (tentativeLegs > maxLegs) {
                cappedByMaxLegs = true
                continue
            }
            const evaluatedCost = params.legCost?.({
                from: current.coord,
                to: n.coord,
                distance: n.dist,
                isDestination: sameCoord(n.coord, dest),
            })
            if (evaluatedCost === null) continue
            const legCost = evaluatedCost ?? 1
            if (!(legCost >= 0) || !Number.isFinite(legCost)) continue
            const nk = key(n.coord)
            const nextCost = current.cost + legCost
            if (nextCost < (gScore.get(nk) ?? Infinity)) {
                gScore.set(nk, nextCost)
                cameFrom.set(nk, current.coord)
                const remaining = dist(n.coord, dest)
                frontier.push({
                    coord: n.coord,
                    legs: tentativeLegs,
                    cost: nextCost,
                    f: nextCost + heuristic(n.coord),
                    remaining,
                })
            }
        }
    }

    if (cappedByMaxLegs) {
        return {
            ok: false,
            reason: 'max-legs',
            furthest,
            partialWaypoints: reconstructWaypoints(cameFrom, origin, furthest),
        }
    }
    return {
        ok: false,
        reason: 'no-path',
        furthest,
        partialWaypoints: reconstructWaypoints(cameFrom, origin, furthest),
    }
}

function reconstructWaypoints(cameFrom: Map<string, Coord>, origin: Coord, target: Coord): Coord[] {
    if (sameCoord(target, origin)) return []
    const path: Coord[] = [target]
    let cur = target
    while (!sameCoord(cur, origin)) {
        const prev = cameFrom.get(key(cur))
        if (!prev) break
        path.unshift(prev)
        cur = prev
    }
    return path.slice(1)
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

export interface ScanProvider {
    getLocationType(seedHex: string, x: number, y: number): number
    systemsInBox(
        seedHex: string,
        xMin: number,
        yMin: number,
        xMax: number,
        yMax: number
    ): {x: number; y: number; locType: number}[]
}

let scanProvider: ScanProvider | null = null
const graphCache = new Map<string, SystemGraph>()

// Inject a fast (e.g. wasm) location-type backend; null restores the pure-JS path. Clears the graph cache.
export function setScanProvider(provider: ScanProvider | null): void {
    scanProvider = provider
    graphCache.clear()
}

export function sdkSystemGraph(seed: Checksum256Type): SystemGraph {
    const s = Checksum256.from(seed)
    const seedHex = s.toString()
    const cached = graphCache.get(seedHex)
    if (cached) return cached
    const graph = scanProvider ? wasmSystemGraph(s, seedHex, scanProvider) : jsSystemGraph(s)
    graphCache.set(seedHex, graph)
    return graph
}

// Travelable nodes mirror the contract's is_travelable: systems plus wormhole mouths.
function jsSystemGraph(s: Checksum256): SystemGraph {
    return {
        hasSystem: (c) => hasSystem(s, {x: c.x, y: c.y}) || wormholeAt(s, c.x, c.y) !== null,
        nearby: (c, reachTiles) => {
            const seen = new Set<string>([`${c.x},${c.y}`])
            const out: Neighbor[] = []
            for (const d of findNearbyPlanets(s, {x: c.x, y: c.y}, reachTiles * PRECISION)) {
                const coord = {x: Number(d.destination.x), y: Number(d.destination.y)}
                const k = `${coord.x},${coord.y}`
                if (seen.has(k)) continue
                seen.add(k)
                out.push({coord, dist: Number(d.distance) / PRECISION})
            }
            for (const coord of nearbyWormholes(s, c.x, c.y, reachTiles)) {
                const k = `${coord.x},${coord.y}`
                if (seen.has(k)) continue
                seen.add(k)
                out.push({coord, dist: Math.hypot(coord.x - c.x, coord.y - c.y)})
            }
            return out
        },
    }
}

const SCAN_BUCKET = 48

function wasmSystemGraph(s: Checksum256, seedHex: string, scan: ScanProvider): SystemGraph {
    // Per-bucket system cache: reused across the overlapping node queries A* makes (and across routes).
    const bucketCache = new Map<string, {x: number; y: number}[]>()
    const bucketSystems = (bx: number, by: number): {x: number; y: number}[] => {
        const k = `${bx},${by}`
        let v = bucketCache.get(k)
        if (v === undefined) {
            const xMin = bx * SCAN_BUCKET
            const yMin = by * SCAN_BUCKET
            v = scan
                .systemsInBox(seedHex, xMin, yMin, xMin + SCAN_BUCKET - 1, yMin + SCAN_BUCKET - 1)
                .map((cell) => ({x: cell.x, y: cell.y}))
            bucketCache.set(k, v)
        }
        return v
    }
    return {
        hasSystem: (c) =>
            scan.getLocationType(seedHex, c.x, c.y) !== 0 || wormholeAt(s, c.x, c.y) !== null,
        nearby: (c, reachTiles) => {
            const r = Math.floor(reachTiles)
            const seen = new Set<string>([`${c.x},${c.y}`])
            const out: Neighbor[] = []
            const bx0 = Math.floor((c.x - r) / SCAN_BUCKET)
            const bx1 = Math.floor((c.x + r) / SCAN_BUCKET)
            const by0 = Math.floor((c.y - r) / SCAN_BUCKET)
            const by1 = Math.floor((c.y + r) / SCAN_BUCKET)
            for (let bx = bx0; bx <= bx1; bx++) {
                for (let by = by0; by <= by1; by++) {
                    for (const cell of bucketSystems(bx, by)) {
                        const dist = Math.hypot(cell.x - c.x, cell.y - c.y)
                        if (dist > reachTiles) continue
                        const k = `${cell.x},${cell.y}`
                        if (seen.has(k)) continue
                        seen.add(k)
                        out.push({coord: {x: cell.x, y: cell.y}, dist})
                    }
                }
            }
            for (const coord of nearbyWormholes(s, c.x, c.y, reachTiles)) {
                const k = `${coord.x},${coord.y}`
                if (seen.has(k)) continue
                seen.add(k)
                out.push({coord, dist: Math.hypot(coord.x - c.x, coord.y - c.y)})
            }
            return out
        },
    }
}
