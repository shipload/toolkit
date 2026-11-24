import {nearbyWormholes, wormholeAt} from '../derivation/wormhole'
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

    const keyOf = searchKey(origin)
    const corridorBound = straightLine + corridorSlack
    const inCorridor = (c: Coord): boolean => {
        if (corridorBound === Number.POSITIVE_INFINITY) return true
        const ox = c.x - origin.x
        const oy = c.y - origin.y
        const tx = c.x - dest.x
        const ty = c.y - dest.y
        const fast = Math.sqrt(ox * ox + oy * oy) + Math.sqrt(tx * tx + ty * ty)
        if (Math.abs(fast - corridorBound) > 1e-6 * (1 + Math.abs(corridorBound))) {
            return fast < corridorBound
        }
        return dist(origin, c) + dist(c, dest) <= corridorBound
    }
    const gScore = new Map<SearchKey, number>([[keyOf(origin), 0]])
    const cameFrom = new Map<SearchKey, Coord>()
    const frontier = new FrontierHeap()
    frontier.push({coord: origin, legs: 0, cost: 0, f: heuristic(origin), remaining: straightLine})

    let furthest = origin
    let furthestRemaining = dist(origin, dest)
    let expansions = 0
    let cappedByMaxLegs = false

    while (frontier.size > 0) {
        const current = frontier.pop()
        if (current.cost !== gScore.get(keyOf(current.coord))) continue

        if (sameCoord(current.coord, dest)) {
            return reconstruct(cameFrom, keyOf, origin, dest)
        }

        if (current.remaining < furthestRemaining) {
            furthestRemaining = current.remaining
            furthest = current.coord
        }

        if (++expansions > nodeBudget) break

        for (const n of graph.nearby(current.coord, perLegReach)) {
            if (!inCorridor(n.coord)) continue

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
            const nk = keyOf(n.coord)
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
            partialWaypoints: reconstructWaypoints(cameFrom, keyOf, origin, furthest),
        }
    }
    return {
        ok: false,
        reason: 'no-path',
        furthest,
        partialWaypoints: reconstructWaypoints(cameFrom, keyOf, origin, furthest),
    }
}

type SearchKey = number | string

const KEY_SPAN = 2 ** 25

// Exact numeric key for integer cells within 2^25 of the origin; anything else keeps the string key.
function searchKey(origin: Coord): (c: Coord) => SearchKey {
    return (c) => {
        const dx = c.x - origin.x
        const dy = c.y - origin.y
        if (
            Number.isInteger(dx) &&
            Number.isInteger(dy) &&
            dx > -KEY_SPAN &&
            dx < KEY_SPAN &&
            dy > -KEY_SPAN &&
            dy < KEY_SPAN
        ) {
            return (dx + KEY_SPAN) * 2 * KEY_SPAN + (dy + KEY_SPAN)
        }
        return key(c)
    }
}

interface FrontierNode {
    coord: Coord
    legs: number
    cost: number
    f: number
    remaining: number
}

type QueuedNode = FrontierNode & {seq: number}

const before = (a: QueuedNode, b: QueuedNode): boolean =>
    a.f < b.f ||
    (a.f === b.f && (a.remaining < b.remaining || (a.remaining === b.remaining && a.seq < b.seq)))

class FrontierHeap {
    private nodes: QueuedNode[] = []
    private nextSeq = 0

    get size(): number {
        return this.nodes.length
    }

    push(node: FrontierNode): void {
        const nodes = this.nodes
        let i = nodes.length
        const item = {...node, seq: this.nextSeq++}
        nodes.push(item)
        while (i > 0) {
            const parent = (i - 1) >> 1
            if (!before(item, nodes[parent])) break
            nodes[i] = nodes[parent]
            i = parent
        }
        nodes[i] = item
    }

    pop(): QueuedNode {
        const nodes = this.nodes
        const top = nodes[0]
        const last = nodes.pop()!
        const n = nodes.length
        if (n === 0) return top
        let i = 0
        for (;;) {
            const left = 2 * i + 1
            if (left >= n) break
            const right = left + 1
            const child = right < n && before(nodes[right], nodes[left]) ? right : left
            if (!before(nodes[child], last)) break
            nodes[i] = nodes[child]
            i = child
        }
        nodes[i] = last
        return top
    }
}

function reconstructWaypoints(
    cameFrom: Map<SearchKey, Coord>,
    keyOf: (c: Coord) => SearchKey,
    origin: Coord,
    target: Coord
): Coord[] {
    if (sameCoord(target, origin)) return []
    const path: Coord[] = [target]
    let cur = target
    while (!sameCoord(cur, origin)) {
        const prev = cameFrom.get(keyOf(cur))
        if (!prev) break
        path.unshift(prev)
        cur = prev
    }
    return path.slice(1)
}

function reconstruct(
    cameFrom: Map<SearchKey, Coord>,
    keyOf: (c: Coord) => SearchKey,
    origin: Coord,
    dest: Coord
): RoutePlan {
    const path: Coord[] = [dest]
    let cur = dest
    let totalDistance = 0
    while (!sameCoord(cur, origin)) {
        const prev = cameFrom.get(keyOf(cur))
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

// Keyed by provider identity, so pass a stable one (the `@shipload/sdk/scan` namespace).
const graphCache = new WeakMap<ScanProvider, Map<string, SystemGraph>>()

export function sdkSystemGraph(seed: Checksum256Type, scan: ScanProvider): SystemGraph {
    const s = Checksum256.from(seed)
    const seedHex = s.toString()
    let bySeed = graphCache.get(scan)
    if (!bySeed) {
        bySeed = new Map()
        graphCache.set(scan, bySeed)
    }
    const cached = bySeed.get(seedHex)
    if (cached) return cached
    const graph = wasmSystemGraph(s, seedHex, scan)
    bySeed.set(seedHex, graph)
    return graph
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
            const outside = (reachTiles + 1) ** 2
            const out: Neighbor[] = []
            const bx0 = Math.floor((c.x - r) / SCAN_BUCKET)
            const bx1 = Math.floor((c.x + r) / SCAN_BUCKET)
            const by0 = Math.floor((c.y - r) / SCAN_BUCKET)
            const by1 = Math.floor((c.y + r) / SCAN_BUCKET)
            const xLow = c.x - r - 1
            const xHigh = c.x + r + 1
            for (let bx = bx0; bx <= bx1; bx++) {
                const bxMin = bx * SCAN_BUCKET
                const gapX = Math.max(0, bxMin - c.x, c.x - (bxMin + SCAN_BUCKET - 1))
                for (let by = by0; by <= by1; by++) {
                    const byMin = by * SCAN_BUCKET
                    const gapY = Math.max(0, byMin - c.y, c.y - (byMin + SCAN_BUCKET - 1))
                    if (gapX * gapX + gapY * gapY > outside) continue
                    const cells = bucketSystems(bx, by)
                    let lo = 0
                    let hi = cells.length
                    while (lo < hi) {
                        const mid = (lo + hi) >> 1
                        if (cells[mid].x < xLow) lo = mid + 1
                        else hi = mid
                    }
                    for (let i = lo; i < cells.length; i++) {
                        const cell = cells[i]
                        if (cell.x > xHigh) break
                        const dx = cell.x - c.x
                        const dy = cell.y - c.y
                        if (dx * dx + dy * dy > outside) continue
                        if (dx === 0 && dy === 0) continue
                        const dist = Math.hypot(dx, dy)
                        if (dist > reachTiles) continue
                        out.push({coord: {x: cell.x, y: cell.y}, dist})
                    }
                }
            }
            const wormholes = nearbyWormholes(s, c.x, c.y, reachTiles)
            if (wormholes.length === 0) return out
            const seen = new Set<string>([`${c.x},${c.y}`])
            for (const n of out) seen.add(`${n.coord.x},${n.coord.y}`)
            for (const coord of wormholes) {
                const k = `${coord.x},${coord.y}`
                if (seen.has(k)) continue
                seen.add(k)
                out.push({coord, dist: Math.hypot(coord.x - c.x, coord.y - c.y)})
            }
            return out
        },
    }
}
