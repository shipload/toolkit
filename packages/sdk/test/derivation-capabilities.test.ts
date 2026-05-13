import {describe, expect, test} from 'bun:test'
import {
    computeEngineCapabilities,
    computeGeneratorCapabilities,
    computeGathererCapabilities,
    computeLoaderCapabilities,
    computeCrafterCapabilities,
    computeHaulerCapabilities,
    computeStorageCapabilities,
    computeShipHullCapabilities,
    computeWarehouseHullCapabilities,
} from '../src/derivation/capabilities'
import {
    computeEngineCapabilities as origEngineCaps,
    computeGeneratorCapabilities as origGeneratorCaps,
    computeGathererCapabilities as origGathererCaps,
    computeLoaderCapabilities as origLoaderCaps,
    computeCrafterCapabilities as origCrafterCaps,
    computeHaulerCapabilities as origHaulerCaps,
    computeStorageCapabilities as origStorageCaps,
    computeShipHullCapabilities as origShipHull,
    computeWarehouseHullCapabilities as origWarehouseHull,
} from '../src/entities/ship-deploy'

const fixtureStats = {
    volatility: 300,
    thermal: 400,
    composition: 600,
    fineness: 700,
    strength: 500,
    conductivity: 350,
    reflectivity: 450,
    tolerance: 60,
    insulation: 200,
    plasticity: 1500,
    reactivity: 550,
    density: 800,
    hardness: 400,
    saturation: 300,
}

const fixtureBaseCapacity = 50000
const fixtureTier = 3

describe('derivation/capabilities formula parity with ship-deploy', () => {
    test('ship hull outputs match', () => {
        expect(computeShipHullCapabilities(fixtureStats)).toEqual(origShipHull(fixtureStats))
    })

    test('engine outputs match', () => {
        expect(computeEngineCapabilities(fixtureStats)).toEqual(origEngineCaps(fixtureStats))
    })

    test('generator outputs match', () => {
        expect(computeGeneratorCapabilities(fixtureStats)).toEqual(origGeneratorCaps(fixtureStats))
    })

    test('gatherer outputs match', () => {
        expect(computeGathererCapabilities(fixtureStats, fixtureTier)).toEqual(
            origGathererCaps(fixtureStats, fixtureTier)
        )
    })

    test('loader outputs match', () => {
        expect(computeLoaderCapabilities(fixtureStats)).toEqual(origLoaderCaps(fixtureStats))
    })

    test('crafter outputs match', () => {
        expect(computeCrafterCapabilities(fixtureStats)).toEqual(origCrafterCaps(fixtureStats))
    })

    test('hauler outputs match', () => {
        expect(computeHaulerCapabilities(fixtureStats)).toEqual(origHaulerCaps(fixtureStats))
    })

    test('storage outputs match', () => {
        expect(computeStorageCapabilities(fixtureStats, fixtureBaseCapacity)).toEqual(
            origStorageCaps(fixtureStats, fixtureBaseCapacity)
        )
    })

    test('warehouse hull outputs match', () => {
        expect(computeWarehouseHullCapabilities(fixtureStats)).toEqual(
            origWarehouseHull(fixtureStats)
        )
    })
})

import {computeBaseCapacity} from '../src/derivation/capabilities'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../src/data/item-ids'

describe('computeBaseCapacity', () => {
    const stats = {strength: 100, hardness: 100, saturation: 100, density: 100}

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

    test('container T1 uses the ship formula (1M base, /2997 divisor)', () => {
        const ship = computeBaseCapacity(ITEM_SHIP_T1_PACKED, stats)
        const c1 = computeBaseCapacity(ITEM_CONTAINER_T1_PACKED, stats)
        expect(c1).toBe(ship)
    })

    test('container T2 differs from T1 (1.5M base, /2500 divisor)', () => {
        const t1 = computeBaseCapacity(ITEM_CONTAINER_T1_PACKED, stats)
        const t2 = computeBaseCapacity(ITEM_CONTAINER_T2_PACKED, stats)
        expect(t2).not.toBe(t1)
        expect(t2).toBeGreaterThan(0)
    })

    test('container T2 formula at stats=100,100,100 = floor(1.5e6 * 10^(300/2500))', () => {
        const expected = Math.floor(1500000 * 10 ** (300 / 2500))
        expect(
            computeBaseCapacity(ITEM_CONTAINER_T2_PACKED, {
                strength: 100,
                hardness: 100,
                saturation: 100,
                density: 100,
            })
        ).toBe(expected)
    })

    test('unknown item IDs return 0 (contract parity)', () => {
        expect(computeBaseCapacity(99999, stats)).toBe(0)
    })
})
