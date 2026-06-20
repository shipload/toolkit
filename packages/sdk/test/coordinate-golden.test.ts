import {expect, test} from 'bun:test'
import {Checksum256} from '@wharfkit/antelope'
import {decodeAddress, encodeAddress, type CoordinateAddress} from '../src/index-module'

// FROZEN tripwire: live Jungle 4 game seed (nex.shipload games / scope eon.shipload), fetched 2026-06-20. If these canonical addresses change, every Jungle 4 player's shared address broke — only ever change deliberately.
const JUNGLE4_SEED = Checksum256.from(
    'dde83e2f49130b38989fccf03ad008d6dea390211cc622f72dc12d780cfd49bb'
)

const ORIGIN: CoordinateAddress = {
    sector: 'Coral Fathom',
    region: 'Gemnikkix',
    localX: 0,
    localY: 0,
}
const SAMPLE: CoordinateAddress = {
    sector: 'Azure Crest',
    region: 'Pulpirsun',
    localX: 4901,
    localY: 1214,
}

test('Jungle 4 origin (0,0) encodes to its canonical address object', () => {
    expect(encodeAddress(JUNGLE4_SEED, 0, 0)).toEqual(ORIGIN)
})

test('Jungle 4 origin address object decodes back to (0,0)', () => {
    expect(decodeAddress(JUNGLE4_SEED, ORIGIN)).toEqual({x: 0, y: 0})
})

test('Jungle 4 sample coordinate encodes to its canonical address object', () => {
    expect(encodeAddress(JUNGLE4_SEED, 174_314_901, 1_818_291_214)).toEqual(SAMPLE)
})

test('Jungle 4 sample address object decodes back to the coordinate', () => {
    expect(decodeAddress(JUNGLE4_SEED, SAMPLE)).toEqual({x: 174_314_901, y: 1_818_291_214})
})
