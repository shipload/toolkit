import type {Checksum256Type} from '@wharfkit/antelope'
import {REGION_FEISTEL, REGION_PER_AXIS} from './constants'
import {permute, unpermute} from './permutation'

// FROZEN INTERFACE — phoneme tables; tune aesthetics before launch, then never reorder.
const ONSETS = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't'] // 12
const VOWELS = ['a', 'e', 'i', 'o', 'u'] // 5
const CODAS = ['n', 'r', 'l', 's', 'k', 'm', 't', 'x'] // 8
const SYL_BASE = ONSETS.length * VOWELS.length * CODAS.length // 480

function syllable(digit: number): string {
    const onset = Math.floor(digit / (VOWELS.length * CODAS.length))
    const rem = digit % (VOWELS.length * CODAS.length)
    const vowel = Math.floor(rem / CODAS.length)
    const coda = rem % CODAS.length
    return ONSETS[onset] + VOWELS[vowel] + CODAS[coda]
}

function unsyllable(chunk: string): number {
    const onset = ONSETS.indexOf(chunk[0])
    const vowel = VOWELS.indexOf(chunk[1])
    const coda = CODAS.indexOf(chunk[2])
    if (onset < 0 || vowel < 0 || coda < 0) throw new Error(`invalid region token chunk: ${chunk}`)
    return onset * (VOWELS.length * CODAS.length) + vowel * CODAS.length + coda
}

export function encodeRegion(seed: Checksum256Type, rx: number, ry: number): string {
    const index = rx * REGION_PER_AXIS + ry
    let n = permute(seed, index, REGION_FEISTEL)
    const d0 = n % SYL_BASE
    n = Math.floor(n / SYL_BASE)
    const d1 = n % SYL_BASE
    const d2 = Math.floor(n / SYL_BASE)
    const token = syllable(d2) + syllable(d1) + syllable(d0)
    return token.charAt(0).toUpperCase() + token.slice(1)
}

export function decodeRegion(seed: Checksum256Type, token: string): {rx: number; ry: number} {
    if (token.length !== 9) throw new Error(`invalid region token length: ${token}`)
    const lower = token.toLowerCase()
    const d2 = unsyllable(lower.slice(0, 3))
    const d1 = unsyllable(lower.slice(3, 6))
    const d0 = unsyllable(lower.slice(6, 9))
    const scrambled = (d2 * SYL_BASE + d1) * SYL_BASE + d0
    if (scrambled >= REGION_FEISTEL.n) throw new Error(`invalid region token: ${token}`)
    const index = unpermute(seed, scrambled, REGION_FEISTEL)
    return {rx: Math.floor(index / REGION_PER_AXIS), ry: index % REGION_PER_AXIS}
}
