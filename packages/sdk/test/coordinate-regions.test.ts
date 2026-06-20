import {Bytes, Checksum256} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import {decodeRegion, encodeRegion} from '../src/coordinates/regions'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

test('region tokens are 9-character title-case strings', () => {
    const token = encodeRegion(SEED, 0, 0)
    expect(token).toMatch(/^[A-Z][a-z]{8}$/)
})

test('region cells round-trip on boundaries and samples', () => {
    const cells: Array<[number, number]> = [
        [0, 0],
        [0, 9999],
        [9999, 0],
        [9999, 9999],
        [1, 1],
        [4827, 1190],
        [1234, 5678],
        [9998, 4],
    ]
    for (const [rx, ry] of cells) {
        expect(decodeRegion(SEED, encodeRegion(SEED, rx, ry))).toEqual({rx, ry})
    }
})

test('region encoding is unique across a dense sample', () => {
    const seen = new Set<string>()
    for (let rx = 0; rx < 60; rx++) {
        for (let ry = 0; ry < 60; ry++) {
            const token = encodeRegion(SEED, rx, ry)
            expect(decodeRegion(SEED, token)).toEqual({rx, ry})
            expect(seen.has(token)).toBe(false)
            seen.add(token)
        }
    }
})

test('adjacent regions produce distinct tokens', () => {
    for (let ry = 0; ry < 200; ry++) {
        expect(encodeRegion(SEED, 10, ry)).not.toBe(encodeRegion(SEED, 10, ry + 1))
    }
})

test('decodeRegion rejects malformed tokens', () => {
    expect(() => decodeRegion(SEED, 'Short')).toThrow()
    expect(() => decodeRegion(SEED, 'Aeiouaeio')).toThrow()
})

test('decodeRegion rejects valid-phoneme tokens that decode out of range', () => {
    expect(() => decodeRegion(SEED, 'Tuxtuxtux')).toThrow()
})
