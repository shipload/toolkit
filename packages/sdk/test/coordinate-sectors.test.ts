import {Bytes, Checksum256} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import {SECTORS_PER_AXIS} from '../src/coordinates/constants'
import {
    SECTOR_ADJECTIVES,
    SECTOR_NOUNS,
    decodeSector,
    encodeSector,
} from '../src/coordinates/sectors'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

test('word lists are exactly 43 unique entries each', () => {
    expect(SECTOR_ADJECTIVES.length).toBe(43)
    expect(SECTOR_NOUNS.length).toBe(43)
    expect(new Set(SECTOR_ADJECTIVES).size).toBe(43)
    expect(new Set(SECTOR_NOUNS).size).toBe(43)
})

test('every sector cell round-trips', () => {
    for (let sx = 0; sx < SECTORS_PER_AXIS; sx++) {
        for (let sy = 0; sy < SECTORS_PER_AXIS; sy++) {
            const name = encodeSector(SEED, sx, sy)
            expect(name).toMatch(/^[A-Za-z]+ [A-Za-z]+$/)
            expect(decodeSector(SEED, name)).toEqual({sx, sy})
        }
    }
})

test('encoding is unique across all sectors', () => {
    const seen = new Set<string>()
    for (let sx = 0; sx < SECTORS_PER_AXIS; sx++) {
        for (let sy = 0; sy < SECTORS_PER_AXIS; sy++) {
            const name = encodeSector(SEED, sx, sy)
            expect(seen.has(name)).toBe(false)
            seen.add(name)
        }
    }
    expect(seen.size).toBe(SECTORS_PER_AXIS * SECTORS_PER_AXIS)
})

test('spatial neighbors rarely share a word', () => {
    let pairs = 0
    let shared = 0
    const share = (a: string, b: string) => {
        const [a1, a2] = a.split(' ')
        const [b1, b2] = b.split(' ')
        return a1 === b1 || a2 === b2
    }
    for (let sx = 0; sx < SECTORS_PER_AXIS; sx++) {
        for (let sy = 0; sy < SECTORS_PER_AXIS; sy++) {
            const here = encodeSector(SEED, sx, sy)
            if (sx + 1 < SECTORS_PER_AXIS) {
                pairs++
                if (share(here, encodeSector(SEED, sx + 1, sy))) shared++
            }
            if (sy + 1 < SECTORS_PER_AXIS) {
                pairs++
                if (share(here, encodeSector(SEED, sx, sy + 1))) shared++
            }
        }
    }
    expect(shared / pairs).toBeLessThan(0.15)
})

test('decodeSector rejects unknown words', () => {
    expect(() => decodeSector(SEED, 'Notaword Noun')).toThrow()
    expect(() => decodeSector(SEED, 'Amber')).toThrow()
})
