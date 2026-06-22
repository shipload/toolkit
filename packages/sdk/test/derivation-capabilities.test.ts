import {describe, expect, test} from 'bun:test'

import {
    computeBaseCapacity,
    computeShipHullCapabilities,
    gathererDepthForTier,
    GATHERER_DEPTH_TABLE,
} from '../src/derivation/capabilities'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../src/data/item-ids'

describe('computeBaseCapacity', () => {
    const stats = {strength: 100, hardness: 100, cohesion: 100, density: 100}

    test('ship returns positive capacity', () => {
        expect(computeBaseCapacity(ITEM_SHIP_T1_PACKED, stats)).toBeGreaterThan(0)
    })

    test('extractor and factory reuse the ship formula', () => {
        const ship = computeBaseCapacity(ITEM_SHIP_T1_PACKED, stats)
        expect(computeBaseCapacity(ITEM_EXTRACTOR_T1_PACKED, stats)).toBe(ship)
        expect(computeBaseCapacity(ITEM_FACTORY_T1_PACKED, stats)).toBe(ship)
    })

    test('warehouse formula is 20x the ship formula (same stat curve)', () => {
        const ship = computeBaseCapacity(ITEM_SHIP_T1_PACKED, stats)
        const wh = computeBaseCapacity(ITEM_WAREHOUSE_T1_PACKED, stats)
        expect(Math.abs(wh - 20 * ship)).toBeLessThanOrEqual(20)
    })

    test('container T1 is 4.4x the ship formula (22M base, /2997 divisor)', () => {
        const ship = computeBaseCapacity(ITEM_SHIP_T1_PACKED, stats)
        const c1 = computeBaseCapacity(ITEM_CONTAINER_T1_PACKED, stats)
        expect(Math.abs(c1 - 4.4 * ship)).toBeLessThanOrEqual(5)
    })

    test('container T2 differs from T1 (24M base, /2947 divisor)', () => {
        const t1 = computeBaseCapacity(ITEM_CONTAINER_T1_PACKED, stats)
        const t2 = computeBaseCapacity(ITEM_CONTAINER_T2_PACKED, stats)
        expect(t2).not.toBe(t1)
        expect(t2).toBeGreaterThan(0)
    })

    test('container T2 formula at stats=100,100,100 = floor(24e6 * 6^(300/2947))', () => {
        const expected = Math.floor(24000000 * 6 ** (300 / 2947))
        expect(
            computeBaseCapacity(ITEM_CONTAINER_T2_PACKED, {
                strength: 100,
                hardness: 100,
                cohesion: 100,
                density: 100,
            })
        ).toBe(expected)
    })

    test('unknown item IDs return 0 (contract parity)', () => {
        expect(computeBaseCapacity(99999, stats)).toBe(0)
    })
})

describe('computeShipHullCapabilities (hull capacity formula)', () => {
    test('asymmetric stats: capacity uses strength+hardness / 1998, not (strength+hardness+cohesion) / 2997', () => {
        const result = computeShipHullCapabilities({
            strength: 500,
            hardness: 200,
            cohesion: 400,
            density: 100,
        })
        const expected = Math.floor(5_000_000 * 6 ** (700 / 1998))
        expect(result.capacity).toBe(expected)
    })
})

describe('gathererDepthForTier (T10 depth ceiling)', () => {
    test('max-tol T10 reaches LOCATION_MAX_DEPTH exactly', () => {
        expect(gathererDepthForTier(999, 10)).toBe(65535)
    })

    test('T10 row is {floor: 63537, slope: 2} (guards against drift)', () => {
        expect(GATHERER_DEPTH_TABLE[9]).toEqual({floor: 63537, slope: 2})
    })

    test('a generalist (mid-tol) T10 still falls short of the bottom', () => {
        expect(gathererDepthForTier(500, 10)).toBeLessThan(65535)
    })
})
