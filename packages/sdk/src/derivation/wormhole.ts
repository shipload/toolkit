import type {Checksum256Type} from '@wharfkit/antelope'
import {hash512} from '../utils/hash'

export const WH = {
    RSIZE: 75,
    ZONE: 16384,
    THRESHOLD: 8192,
    MIN_REACH: 50000,
    TRANSIT_SPEED: 500,
} as const

const HALF = Math.round(Math.log2(WH.ZONE))
const MASK = WH.ZONE - 1

function roll16(seed: Checksum256Type, str: string): number {
    const h = hash512(seed, str).array
    return (h[0] << 8) | h[1]
}
function feistelF(seed: Checksum256Type, x: number, round: number, key: string): number {
    return roll16(seed, `feistel-${key}-${round}-${x}`) & MASK
}
export function feistel(seed: Checksum256Type, idx: number, key: string): number {
    let L = (idx >>> HALF) & MASK
    let R = idx & MASK
    for (let r = 0; r < 4; r++) {
        const nR = L ^ feistelF(seed, R, r, key)
        L = R
        R = nR
    }
    return (L << HALF) | R
}
export function feistelInv(seed: Checksum256Type, idx: number, key: string): number {
    let L = (idx >>> HALF) & MASK
    let R = idx & MASK
    for (let r = 3; r >= 0; r--) {
        const nL = R ^ feistelF(seed, L, r, key)
        R = L
        L = nL
    }
    return (L << HALF) | R
}

type Region = {rx: number; ry: number}

export function regionOf(x: number, y: number): Region {
    return {rx: Math.floor(x / WH.RSIZE), ry: Math.floor(y / WH.RSIZE)}
}
export function partnerRegion(seed: Checksum256Type, R: Region): Region {
    const qx = Math.floor(R.rx / WH.ZONE)
    const qy = Math.floor(R.ry / WH.ZONE)
    const zx = qx * WH.ZONE
    const zy = qy * WH.ZONE
    const key = `${qx}:${qy}`
    const idx = (R.ry - zy) * WH.ZONE + (R.rx - zx)
    const p = feistelInv(seed, feistel(seed, idx, key) ^ 1, key)
    return {rx: zx + (p % WH.ZONE), ry: zy + Math.floor(p / WH.ZONE)}
}
function regKey(R: Region): string {
    return `${R.rx}:${R.ry}`
}
function pairKey(a: Region, b: Region): string {
    const ka = regKey(a)
    const kb = regKey(b)
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}
function endpointInRegion(seed: Checksum256Type, R: Region, key: string): {x: number; y: number} {
    const h = hash512(seed, `wh-endpoint-${key}-${regKey(R)}`).array
    const ox = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0
    const oy = ((h[4] << 24) | (h[5] << 16) | (h[6] << 8) | h[7]) >>> 0
    return {x: R.rx * WH.RSIZE + (ox % WH.RSIZE), y: R.ry * WH.RSIZE + (oy % WH.RSIZE)}
}
function dist(a: {x: number; y: number}, b: {x: number; y: number}): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}
function wormholeOfRegion(
    seed: Checksum256Type,
    R: Region
): {A: {x: number; y: number}; B: {x: number; y: number}} | null {
    const P = partnerRegion(seed, R)
    if (P.rx === R.rx && P.ry === R.ry) return null
    const key = pairKey(R, P)
    if (roll16(seed, `wh-exists-${key}`) >= WH.THRESHOLD) return null
    const A = endpointInRegion(seed, R, key)
    const B = endpointInRegion(seed, P, key)
    if (dist(A, B) < WH.MIN_REACH) return null
    return {A, B}
}
export function wormholeAtRegionEndpoint(
    seed: Checksum256Type,
    rx: number,
    ry: number
): {from: {x: number; y: number}; to: {x: number; y: number}} | null {
    const w = wormholeOfRegion(seed, {rx, ry})
    if (!w) return null
    return {from: w.A, to: w.B}
}
export function wormholeAt(
    seed: Checksum256Type,
    x: number,
    y: number
): {x: number; y: number} | null {
    const w = wormholeOfRegion(seed, regionOf(x, y))
    if (!w || w.A.x !== x || w.A.y !== y) return null
    return w.B
}

// Wormhole mouths (the local A endpoint) within reachTiles of (x,y); regions are RSIZE-wide so only a few overlap.
export function nearbyWormholes(
    seed: Checksum256Type,
    x: number,
    y: number,
    reachTiles: number
): {x: number; y: number}[] {
    const min = regionOf(x - reachTiles, y - reachTiles)
    const max = regionOf(x + reachTiles, y + reachTiles)
    const out: {x: number; y: number}[] = []
    for (let rx = min.rx; rx <= max.rx; rx++) {
        for (let ry = min.ry; ry <= max.ry; ry++) {
            const w = wormholeOfRegion(seed, {rx, ry})
            if (!w) continue
            if (w.A.x === x && w.A.y === y) continue
            if (dist({x, y}, w.A) <= reachTiles) out.push(w.A)
        }
    }
    return out
}
export function isValidWormholePair(
    seed: Checksum256Type,
    ax: number,
    ay: number,
    bx: number,
    by: number
): boolean {
    const to = wormholeAt(seed, ax, ay)
    return to !== null && to.x === bx && to.y === by
}
