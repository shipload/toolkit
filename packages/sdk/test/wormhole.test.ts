import {describe, expect, test} from 'bun:test'
import {Bytes, Checksum256} from '@wharfkit/antelope'
import {
    WH,
    feistel,
    feistelInv,
    isValidWormholePair,
    partnerRegion,
    wormholeAt,
} from '../src/derivation/wormhole'
import {getLocationKind} from '../src/utils/system'
import {calc_transit_duration} from '../src/travel/travel'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

const ENDPOINTS = [
    {from: {x: 12, y: 295}, to: {x: 920191, y: 22789}},
    {from: {x: 50, y: 412}, to: {x: 1182101, y: 875515}},
    {from: {x: 7, y: 1364}, to: {x: 182814, y: 534226}},
    {from: {x: -11243, y: -10963}, to: {x: -226466, y: -870150}},
]

describe('constants', () => {
    test('WH mirrors the contract config.hpp WH_* block', () => {
        expect(WH).toEqual({
            RSIZE: 75,
            ZONE: 16384,
            THRESHOLD: 8192,
            MIN_REACH: 50000,
            TRANSIT_DISCOUNT_MILLI: 150,
            TRANSIT_REFERENCE_ACCEL: 100,
        })
    })
})

describe('feistel', () => {
    test('is its own inverse across representative indices (incl. domain edges)', () => {
        const indices = [0, 1, 2, 255, 256, 16383, 16384, 16385, 1_000_000, WH.ZONE * WH.ZONE - 1]
        for (const i of indices) expect(feistelInv(SEED, feistel(SEED, i, 'z0:0'), 'z0:0')).toBe(i)
    })

    test('different zone keys scramble differently', () => {
        expect(feistel(SEED, 12345, 'z0:0')).not.toBe(feistel(SEED, 12345, 'z1:0'))
    })
})

describe('wormhole pairing', () => {
    test('partnerRegion is an involution and never self-pairs', () => {
        const regions = [
            {rx: 0, ry: 0},
            {rx: 1, ry: 1},
            {rx: -1, ry: -1},
            {rx: 5, ry: -7},
            {rx: -150, ry: -150},
            {rx: 16383, ry: 16383}, // zone (0,0) far corner
            {rx: 16384, ry: 0}, // first region of zone (1,0)
            {rx: -16385, ry: 3}, // negative zone, exercises floored division
        ]
        for (const R of regions) {
            const P = partnerRegion(SEED, R)
            expect(P).not.toEqual(R)
            expect(partnerRegion(SEED, P)).toEqual(R)
        }
    })

    test('two-way: each endpoint points to its partner and back; verify accepts/rejects', () => {
        for (const e of ENDPOINTS) {
            expect(wormholeAt(SEED, e.from.x, e.from.y)).toEqual(e.to)
            expect(wormholeAt(SEED, e.to.x, e.to.y)).toEqual(e.from)
            expect(isValidWormholePair(SEED, e.from.x, e.from.y, e.to.x, e.to.y)).toBe(true)
            expect(isValidWormholePair(SEED, e.from.x, e.from.y, e.to.x + 1, e.to.y)).toBe(false)
        }
    })
})

describe('location kind + transit duration', () => {
    test('wormhole endpoint resolves as wormhole, neighbor does not', () => {
        const ep = ENDPOINTS[0].from
        expect(getLocationKind(SEED, ep.x, ep.y)).toBe('wormhole')
        expect(getLocationKind(SEED, ep.x + 1, ep.y)).not.toBe('wormhole')
    })

    test('transit duration is positive and discounted', () => {
        expect(calc_transit_duration(0, 0, 100000, 0).toNumber()).toBeGreaterThan(0)
    })
})
