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
