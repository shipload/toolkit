import type {Checksum256Type} from '@wharfkit/antelope'
import {hash512} from '../utils/hash'

// FROZEN INTERFACE — round count, key-derivation strings, and mixing constants must never change; per-game variation comes from the seed.
const ROUNDS = 4

export interface FeistelConfig {
    n: number
    halfBits: number
    label: string
}

const keyCache = new Map<string, number[]>()

function deriveRoundKeys(seed: Checksum256Type, label: string): number[] {
    const cacheKey = `${seed}:${label}`
    const cached = keyCache.get(cacheKey)
    if (cached) return cached
    const h = hash512(seed, `coord-keys-${label}`).array
    const keys: number[] = []
    for (let i = 0; i < ROUNDS; i++) {
        const o = i * 4
        keys.push(((h[o] << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) >>> 0)
    }
    keyCache.set(cacheKey, keys)
    return keys
}

function roundFn(r: number, key: number, halfBits: number): number {
    let x = (r ^ key) >>> 0
    x = Math.imul(x ^ (x >>> 16), 0x9e3779b1) >>> 0
    x = Math.imul(x ^ (x >>> 13), 0x7feb352d) >>> 0
    x = (x ^ (x >>> 16)) >>> 0
    return x & ((1 << halfBits) - 1)
}

function encryptBlock(x: number, halfBits: number, keys: number[]): number {
    const mask = (1 << halfBits) - 1
    let L = (x >>> halfBits) & mask
    let R = x & mask
    for (let i = 0; i < ROUNDS; i++) {
        const F = roundFn(R, keys[i], halfBits)
        const nL = R
        const nR = (L ^ F) & mask
        L = nL
        R = nR
    }
    return ((L << halfBits) | R) >>> 0
}

function decryptBlock(y: number, halfBits: number, keys: number[]): number {
    const mask = (1 << halfBits) - 1
    let L = (y >>> halfBits) & mask
    let R = y & mask
    for (let i = ROUNDS - 1; i >= 0; i--) {
        const F = roundFn(L, keys[i], halfBits)
        const nR = L
        const nL = (R ^ F) & mask
        L = nL
        R = nR
    }
    return ((L << halfBits) | R) >>> 0
}

export function permute(seed: Checksum256Type, x: number, cfg: FeistelConfig): number {
    const keys = deriveRoundKeys(seed, cfg.label)
    let v = encryptBlock(x, cfg.halfBits, keys)
    while (v >= cfg.n) v = encryptBlock(v, cfg.halfBits, keys)
    return v
}

export function unpermute(seed: Checksum256Type, y: number, cfg: FeistelConfig): number {
    const keys = deriveRoundKeys(seed, cfg.label)
    let v = decryptBlock(y, cfg.halfBits, keys)
    while (v >= cfg.n) v = decryptBlock(v, cfg.halfBits, keys)
    return v
}
