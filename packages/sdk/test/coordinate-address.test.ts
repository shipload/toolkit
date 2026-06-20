import {Bytes, Checksum256} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import {COORD_MAX, COORD_MIN} from '../src/coordinates/constants'
import {addressFromCoordinates, decodeAddress, encodeAddress} from '../src/coordinates/address'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

test('coordinates round-trip through the address', () => {
    const coords: Array<[number, number]> = [
        [0, 0],
        [1, -1],
        [COORD_MIN, COORD_MIN],
        [COORD_MAX, COORD_MAX],
        [COORD_MIN, COORD_MAX],
        [174_314_901, 1_818_291_214],
        [-5, 42],
        [123456, -987654],
    ]
    for (const [x, y] of coords) {
        const addr = encodeAddress(SEED, x, y)
        expect(addr.localX).toBeGreaterThanOrEqual(0)
        expect(addr.localX).toBeLessThanOrEqual(9999)
        expect(decodeAddress(SEED, addr)).toEqual({x, y})
    }
})

test('global origin maps to local (0,0)', () => {
    const addr = encodeAddress(SEED, 0, 0)
    expect(addr.localX).toBe(0)
    expect(addr.localY).toBe(0)
    expect(decodeAddress(SEED, addr)).toEqual({x: 0, y: 0})
})

test('encodeAddress returns a typed object that round-trips', () => {
    const addr = encodeAddress(SEED, 174_314_901, 1_818_291_214)
    expect(addr).toEqual({
        sector: expect.any(String),
        region: expect.any(String),
        localX: expect.any(Number),
        localY: expect.any(Number),
    })
    expect(decodeAddress(SEED, addr)).toEqual({x: 174_314_901, y: 1_818_291_214})
})

test('encodeAddress rejects out-of-range coordinates', () => {
    expect(() => encodeAddress(SEED, COORD_MAX + 1, 0)).toThrow()
    expect(() => encodeAddress(SEED, 0, COORD_MIN - 1)).toThrow()
})

test('addressFromCoordinates accepts wharfkit-style Int objects', () => {
    const coords = {x: {toNumber: () => 4827}, y: {toNumber: () => 1190}}
    expect(addressFromCoordinates(SEED, coords)).toEqual(encodeAddress(SEED, 4827, 1190))
})

test('different seeds name the same coordinate differently but keep structure', () => {
    const SEED2 = Checksum256.hash(Bytes.from('another-game-seed', 'utf8'))
    const a = encodeAddress(SEED, 0, 0)
    const b = encodeAddress(SEED2, 0, 0)
    expect(`${a.sector}|${a.region}`).not.toBe(`${b.sector}|${b.region}`)
    expect(a.localX).toBe(b.localX) // structural: both 0
    expect(a.localY).toBe(b.localY)
})
