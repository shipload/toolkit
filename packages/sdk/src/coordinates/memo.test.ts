import {describe, expect, test} from 'bun:test'
import {Checksum256} from '@wharfkit/antelope'
import {encodeAddress, decodeAddress} from './address'
import {encodeAddressMemo} from './memo'

const SEED = Checksum256.from('73e4385a2708e6d704883c670c50b0aa502ba1098072ed100ae1920eee3597d9')

describe('encodeAddressMemo', () => {
    test('matches encodeAddress', () => {
        for (const [x, y] of [
            [0, 0],
            [12, -9],
            [2_147_483_647, -2_147_483_648],
        ] as const) {
            expect(encodeAddressMemo(SEED, x, y)).toEqual(encodeAddress(SEED, x, y))
        }
    })

    test('returns the same cached object reference for repeat calls', () => {
        const a = encodeAddressMemo(SEED, 4827, 1190)
        const b = encodeAddressMemo(SEED, 4827, 1190)
        expect(a).toBe(b)
    })

    test('round-trips through decodeAddress', () => {
        const addr = encodeAddressMemo(SEED, -5, 7)
        expect(decodeAddress(SEED, addr)).toEqual({x: -5, y: 7})
    })

    test('origin is centered: raw (0,0) is local (0,0)', () => {
        const addr = encodeAddressMemo(SEED, 0, 0)
        expect([addr.localX, addr.localY]).toEqual([0, 0])
    })

    test('origin neighbors share the origin region', () => {
        const origin = encodeAddressMemo(SEED, 0, 0)
        for (const [x, y] of [
            [-1, -1],
            [4999, 4999],
            [-5000, -5000],
        ] as const) {
            expect(encodeAddressMemo(SEED, x, y).region).toBe(origin.region)
        }
        // first tile outside the origin region on each axis falls into a different region
        expect(encodeAddressMemo(SEED, 5000, 0).region).not.toBe(origin.region)
    })
})
