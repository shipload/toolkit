import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {
    computeContainerCapabilities,
    computeCrafterCapabilities,
    computeEngineCapabilities,
    computeGathererCapabilities,
    computeGeneratorCapabilities,
    computeHaulerCapabilities,
    computeLoaderCapabilities,
    computeShipCapabilities,
    computeShipHullCapabilities,
    computeWarehouseHullCapabilities,
    encodeStats,
    ITEM_HAULER_T1,
} from '$lib'

describe('ship deploy formulas', () => {
    test('hull capabilities from stats', () => {
        const result = computeShipHullCapabilities({
            strength: 500,
            density: 500,
            hardness: 500,
            saturation: 500,
        })
        assert.isAbove(result.hullmass, 0)
        assert.isAbove(result.capacity, 0)
    })

    test('engine capabilities from stats', () => {
        const result = computeEngineCapabilities({volatility: 500, thermal: 500})
        assert.isAbove(result.thrust, 0)
        assert.isAbove(result.drain, 0)
    })

    test('generator capabilities from stats', () => {
        const result = computeGeneratorCapabilities({composition: 500, fineness: 500})
        assert.isAbove(result.capacity, 0)
        assert.isAbove(result.recharge, 0)
    })

    test('lower density = lower hullmass', () => {
        const light = computeShipHullCapabilities({
            strength: 500,
            density: 100,
            hardness: 500,
            saturation: 500,
        })
        const heavy = computeShipHullCapabilities({
            strength: 500,
            density: 900,
            hardness: 500,
            saturation: 500,
        })
        assert.isBelow(light.hullmass, heavy.hullmass)
    })

    test('higher volatility = more thrust', () => {
        const low = computeEngineCapabilities({volatility: 100, thermal: 500})
        const high = computeEngineCapabilities({volatility: 900, thermal: 500})
        assert.isBelow(low.thrust, high.thrust)
    })

    test('higher thermal = lower drain', () => {
        const low = computeEngineCapabilities({volatility: 500, thermal: 100})
        const high = computeEngineCapabilities({volatility: 500, thermal: 900})
        assert.isAbove(high.drain, 0)
        assert.isBelow(high.drain, low.drain)
    })

    test('engine formula exact values at min', () => {
        const r = computeEngineCapabilities({volatility: 1, thermal: 1})
        assert.equal(r.thrust, 400)
        assert.equal(r.drain, 50)
    })

    test('engine formula exact values at mid', () => {
        const r = computeEngineCapabilities({volatility: 500, thermal: 500})
        assert.equal(r.thrust, 775)
        assert.equal(r.drain, 43)
    })

    test('engine formula exact values at max', () => {
        const r = computeEngineCapabilities({volatility: 999, thermal: 999})
        assert.equal(r.thrust, 1149)
        assert.equal(r.drain, 36)
    })

    test('generator formula exact values at min', () => {
        const r = computeGeneratorCapabilities({composition: 1, fineness: 1})
        assert.equal(r.capacity, 300)
        assert.equal(r.recharge, 1)
    })

    test('generator formula exact values at mid', () => {
        const r = computeGeneratorCapabilities({composition: 500, fineness: 500})
        assert.equal(r.capacity, 383)
        assert.equal(r.recharge, 2)
    })

    test('generator formula exact values at max', () => {
        const r = computeGeneratorCapabilities({composition: 999, fineness: 999})
        assert.equal(r.capacity, 466)
        assert.equal(r.recharge, 3)
    })

    test('hull formula exact values at min', () => {
        const r = computeShipHullCapabilities({strength: 1, density: 1, hardness: 1, saturation: 1})
        assert.equal(r.hullmass, 25075)
        assert.equal(r.capacity, 1002307)
    })

    test('hull formula exact values at mid', () => {
        const r = computeShipHullCapabilities({
            strength: 500,
            density: 500,
            hardness: 500,
            saturation: 500,
        })
        assert.equal(r.hullmass, 62500)
        assert.equal(r.capacity, 3165924)
    })

    test('hull formula exact values at max', () => {
        const r = computeShipHullCapabilities({
            strength: 999,
            density: 999,
            hardness: 999,
            saturation: 999,
        })
        assert.equal(r.hullmass, 99925)
        assert.equal(r.capacity, 10000000)
    })

    test('gatherer formula exact values at min', () => {
        const r = computeGathererCapabilities({
            strength: 1,
            tolerance: 1,
            conductivity: 1,
            reflectivity: 1,
        })
        assert.equal(r.yield, 201)
        assert.equal(r.drain, 1249)
        assert.equal(r.depth, 201)
        assert.equal(r.speed, 100)
    })

    test('gatherer formula exact values at mid', () => {
        const r = computeGathererCapabilities({
            strength: 500,
            tolerance: 500,
            conductivity: 500,
            reflectivity: 500,
        })
        assert.equal(r.yield, 700)
        assert.equal(r.drain, 625)
        assert.equal(r.depth, 950)
        assert.equal(r.speed, 500)
    })

    test('gatherer formula exact values at max', () => {
        const r = computeGathererCapabilities({
            strength: 999,
            tolerance: 999,
            conductivity: 999,
            reflectivity: 999,
        })
        assert.equal(r.yield, 1199)
        assert.equal(r.drain, 250)
        assert.equal(r.depth, 1698)
        assert.equal(r.speed, 899)
    })

    test('higher STR = higher gatherer yield', () => {
        const low = computeGathererCapabilities({
            strength: 100,
            tolerance: 500,
            conductivity: 500,
            reflectivity: 500,
        })
        const high = computeGathererCapabilities({
            strength: 900,
            tolerance: 500,
            conductivity: 500,
            reflectivity: 500,
        })
        assert.isBelow(low.yield, high.yield)
    })

    test('higher CON = lower gatherer drain', () => {
        const low = computeGathererCapabilities({
            strength: 500,
            tolerance: 500,
            conductivity: 100,
            reflectivity: 500,
        })
        const high = computeGathererCapabilities({
            strength: 500,
            tolerance: 500,
            conductivity: 900,
            reflectivity: 500,
        })
        assert.isAbove(low.drain, high.drain)
    })

    test('higher REF = higher speed', () => {
        const low = computeGathererCapabilities({
            strength: 500,
            tolerance: 500,
            conductivity: 500,
            reflectivity: 100,
        })
        const high = computeGathererCapabilities({
            strength: 500,
            tolerance: 500,
            conductivity: 500,
            reflectivity: 900,
        })
        assert.isBelow(low.speed, high.speed)
    })

    test('loader formula exact values at min', () => {
        const r = computeLoaderCapabilities({insulation: 1, plasticity: 1})
        assert.equal(r.mass, 1998)
        assert.equal(r.thrust, 1)
        assert.equal(r.quantity, 1)
    })

    test('loader formula exact values at mid', () => {
        const r = computeLoaderCapabilities({insulation: 500, plasticity: 500})
        assert.equal(r.mass, 1000)
        assert.equal(r.thrust, 2)
        assert.equal(r.quantity, 1)
    })

    test('loader formula exact values at max', () => {
        const r = computeLoaderCapabilities({insulation: 999, plasticity: 999})
        assert.equal(r.mass, 200)
        assert.equal(r.thrust, 2)
        assert.equal(r.quantity, 1)
    })

    test('higher insulation = lower loader mass', () => {
        const low = computeLoaderCapabilities({insulation: 100, plasticity: 500})
        const high = computeLoaderCapabilities({insulation: 900, plasticity: 500})
        assert.isAbove(low.mass, high.mass)
    })

    test('crafter formula exact values at min', () => {
        const r = computeCrafterCapabilities({reactivity: 1, fineness: 1})
        assert.equal(r.speed, 100)
        assert.equal(r.drain, 30)
    })

    test('crafter formula exact values at mid', () => {
        const r = computeCrafterCapabilities({reactivity: 500, fineness: 500})
        assert.equal(r.speed, 500)
        assert.equal(r.drain, 15)
    })

    test('crafter formula exact values at max', () => {
        const r = computeCrafterCapabilities({reactivity: 999, fineness: 999})
        assert.equal(r.speed, 899)
        assert.equal(r.drain, 5)
    })

    test('higher REA = higher crafter speed', () => {
        const low = computeCrafterCapabilities({reactivity: 100, fineness: 500})
        const high = computeCrafterCapabilities({reactivity: 900, fineness: 500})
        assert.isBelow(low.speed, high.speed)
    })

    test('higher FIN = lower crafter drain', () => {
        const low = computeCrafterCapabilities({reactivity: 500, fineness: 100})
        const high = computeCrafterCapabilities({reactivity: 500, fineness: 900})
        assert.isAbove(low.drain, high.drain)
    })

    test('warehouse hull capabilities with zero stats', () => {
        const r = computeWarehouseHullCapabilities({
            density: 0,
            strength: 0,
            hardness: 0,
            saturation: 0,
        })
        assert.equal(r.hullmass, 25000)
        assert.equal(r.capacity, 20000000)
    })

    test('warehouse hull capabilities at mid stats', () => {
        const r = computeWarehouseHullCapabilities({
            density: 500,
            strength: 500,
            hardness: 500,
            saturation: 500,
        })
        assert.equal(r.hullmass, 62500)
        assert.isAbove(r.capacity, 20000000)
    })

    test('warehouse capacity is ~20x container capacity', () => {
        const stats = {density: 500, strength: 500, hardness: 500, saturation: 500}
        const wh = computeWarehouseHullCapabilities(stats)
        const ct = computeContainerCapabilities(stats)
        const ratio = wh.capacity / ct.capacity
        assert.isAbove(ratio, 19)
        assert.isBelow(ratio, 21)
    })

    test('warehouse hullmass matches container/ship formula', () => {
        const stats = {density: 500, strength: 500, hardness: 500, saturation: 500}
        const wh = computeWarehouseHullCapabilities(stats)
        const ship = computeShipHullCapabilities(stats)
        assert.equal(wh.hullmass, ship.hullmass)
    })

    test('warehouse max capacity with max stats', () => {
        const r = computeWarehouseHullCapabilities({
            density: 999,
            strength: 999,
            hardness: 999,
            saturation: 999,
        })
        assert.isAbove(r.capacity, 190000000)
    })

    test('hauler formula exact values at min', () => {
        const r = computeHaulerCapabilities({fineness: 1, conductivity: 1, composition: 1})
        assert.equal(r.capacity, 1)
        assert.equal(r.efficiency, 2006)
        assert.equal(r.drain, 15)
    })

    test('hauler formula exact values at mid', () => {
        const r = computeHaulerCapabilities({fineness: 500, conductivity: 500, composition: 500})
        assert.equal(r.capacity, 2)
        assert.equal(r.efficiency, 5000)
        assert.equal(r.drain, 9)
    })

    test('hauler formula exact values at max', () => {
        const r = computeHaulerCapabilities({fineness: 999, conductivity: 999, composition: 999})
        assert.equal(r.capacity, 3)
        assert.equal(r.efficiency, 7994)
        assert.equal(r.drain, 3)
    })

    test('higher fineness = higher hauler capacity', () => {
        const low = computeHaulerCapabilities({fineness: 0, conductivity: 500, composition: 500})
        const high = computeHaulerCapabilities({
            fineness: 999,
            conductivity: 500,
            composition: 500,
        })
        assert.isBelow(low.capacity, high.capacity)
    })

    test('higher conductivity = higher hauler efficiency', () => {
        const low = computeHaulerCapabilities({fineness: 500, conductivity: 0, composition: 500})
        const high = computeHaulerCapabilities({
            fineness: 500,
            conductivity: 999,
            composition: 500,
        })
        assert.isBelow(low.efficiency, high.efficiency)
    })

    test('higher composition = lower hauler drain', () => {
        const low = computeHaulerCapabilities({fineness: 500, conductivity: 500, composition: 0})
        const high = computeHaulerCapabilities({
            fineness: 500,
            conductivity: 500,
            composition: 999,
        })
        assert.isBelow(high.drain, low.drain)
    })

    test('computeShipCapabilities stacks two hauler modules', () => {
        const seedA = encodeStats([0, 0, 0, 0])
        const seedB = encodeStats([999, 999, 999, 999])
        const modules = [
            {itemId: ITEM_HAULER_T1, stats: seedA},
            {itemId: ITEM_HAULER_T1, stats: seedB},
        ]
        const caps = computeShipCapabilities(modules)
        assert.exists(caps.hauler)
        assert.equal(caps.hauler!.capacity, 4)
        assert.equal(caps.hauler!.efficiency, 6495)
        assert.equal(caps.hauler!.drain, 18)
    })

    test('computeShipCapabilities single hauler module', () => {
        const seed = encodeStats([500, 500, 500, 500])
        const caps = computeShipCapabilities([{itemId: ITEM_HAULER_T1, stats: seed}])
        assert.exists(caps.hauler)
        assert.equal(caps.hauler!.capacity, 2)
        assert.equal(caps.hauler!.efficiency, 5000)
        assert.equal(caps.hauler!.drain, 9)
    })

    test('computeShipCapabilities with no hauler modules returns no hauler', () => {
        const caps = computeShipCapabilities([])
        assert.isUndefined(caps.hauler)
    })
})
