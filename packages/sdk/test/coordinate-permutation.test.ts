import {Bytes, Checksum256} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import {type FeistelConfig, permute, unpermute} from '../src/coordinates/permutation'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

const SECTOR: FeistelConfig = {n: 1849, halfBits: 6, label: 'sector'}
const REGION: FeistelConfig = {n: 100_000_000, halfBits: 14, label: 'region'}

test('permutation round-trips over the full sector domain', () => {
    for (let i = 0; i < SECTOR.n; i++) {
        expect(unpermute(SEED, permute(SEED, i, SECTOR), SECTOR)).toBe(i)
    }
})

test('permutation is a bijection over the sector domain (no collisions)', () => {
    const seen = new Set<number>()
    for (let i = 0; i < SECTOR.n; i++) {
        const v = permute(SEED, i, SECTOR)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(SECTOR.n)
        expect(seen.has(v)).toBe(false)
        seen.add(v)
    }
    expect(seen.size).toBe(SECTOR.n)
})

test('permutation round-trips on region-domain samples and boundaries', () => {
    const samples = [0, 1, 9_999, 10_000, 99_999_999, 12_345_678, 50_000_000]
    for (const i of samples) {
        expect(unpermute(SEED, permute(SEED, i, REGION), REGION)).toBe(i)
    }
})

test('permutation scrambles adjacent inputs far apart', () => {
    let adjacentOutputs = 0
    for (let i = 0; i < 200; i++) {
        if (Math.abs(permute(SEED, i + 1, REGION) - permute(SEED, i, REGION)) <= 1)
            adjacentOutputs++
    }
    expect(adjacentOutputs).toBe(0)
})
