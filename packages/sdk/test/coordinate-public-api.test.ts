import {Bytes, Checksum256} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import {
    addressFromCoordinates,
    decodeAddress,
    encodeAddress,
    type CoordinateAddress,
} from '../src/index-module'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

test('coordinate addressing is exported from the package surface', () => {
    const addr: CoordinateAddress = encodeAddress(SEED, 174_314_901, 1_818_291_214)
    expect(decodeAddress(SEED, addr)).toEqual({x: 174_314_901, y: 1_818_291_214})
    expect(addressFromCoordinates(SEED, {x: 0, y: 0})).toEqual(encodeAddress(SEED, 0, 0))
})
