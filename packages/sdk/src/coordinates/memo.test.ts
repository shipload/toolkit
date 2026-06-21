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
})
