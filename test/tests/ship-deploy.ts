import {assert} from 'chai'
import {
    computeEngineCapabilities,
    computeExtractorCapabilities,
    computeGeneratorCapabilities,
    computeLoaderCapabilities,
    computeManufacturingCapabilities,
    computeShipHullCapabilities,
} from '$lib'

suite('ship deploy formulas', function () {
    test('hull capabilities from stats', function () {
        const result = computeShipHullCapabilities({
            strength: 500,
            density: 500,
            ductility: 500,
            purity: 500,
        })
        assert.isAbove(result.hullmass, 0)
        assert.isAbove(result.capacity, 0)
    })

    test('engine capabilities from stats', function () {
        const result = computeEngineCapabilities({volatility: 500, thermal: 500})
        assert.isAbove(result.thrust, 0)
        assert.isAbove(result.drain, 0)
    })

    test('generator capabilities from stats', function () {
        const result = computeGeneratorCapabilities({resonance: 500, clarity: 500})
        assert.isAbove(result.capacity, 0)
        assert.isAbove(result.recharge, 0)
    })

    test('lower density = lower hullmass', function () {
        const light = computeShipHullCapabilities({
            strength: 500,
            density: 100,
            ductility: 500,
            purity: 500,
        })
        const heavy = computeShipHullCapabilities({
            strength: 500,
            density: 900,
            ductility: 500,
            purity: 500,
        })
        assert.isBelow(light.hullmass, heavy.hullmass)
    })

    test('higher volatility = more thrust', function () {
        const low = computeEngineCapabilities({volatility: 100, thermal: 500})
        const high = computeEngineCapabilities({volatility: 900, thermal: 500})
        assert.isBelow(low.thrust, high.thrust)
    })

    test('higher thermal = lower drain', function () {
        const low = computeEngineCapabilities({volatility: 500, thermal: 100})
        const high = computeEngineCapabilities({volatility: 500, thermal: 900})
        assert.isAbove(high.drain, 0)
        assert.isBelow(high.drain, low.drain)
    })

    test('engine formula exact values at min', function () {
        const r = computeEngineCapabilities({volatility: 1, thermal: 1})
        assert.equal(r.thrust, 400)
        assert.equal(r.drain, 30)
    })

    test('engine formula exact values at mid', function () {
        const r = computeEngineCapabilities({volatility: 500, thermal: 500})
        assert.equal(r.thrust, 775)
        assert.equal(r.drain, 23)
    })

    test('engine formula exact values at max', function () {
        const r = computeEngineCapabilities({volatility: 999, thermal: 999})
        assert.equal(r.thrust, 1149)
        assert.equal(r.drain, 16)
    })

    test('generator formula exact values at min', function () {
        const r = computeGeneratorCapabilities({resonance: 1, clarity: 1})
        assert.equal(r.capacity, 300)
        assert.equal(r.recharge, 5)
    })

    test('generator formula exact values at mid', function () {
        const r = computeGeneratorCapabilities({resonance: 500, clarity: 500})
        assert.equal(r.capacity, 383)
        assert.equal(r.recharge, 12)
    })

    test('generator formula exact values at max', function () {
        const r = computeGeneratorCapabilities({resonance: 999, clarity: 999})
        assert.equal(r.capacity, 466)
        assert.equal(r.recharge, 19)
    })

    test('hull formula exact values at min', function () {
        const r = computeShipHullCapabilities({strength: 1, density: 1, ductility: 1, purity: 1})
        assert.equal(r.hullmass, 25075)
        assert.equal(r.capacity, 1002307)
    })

    test('hull formula exact values at mid', function () {
        const r = computeShipHullCapabilities({strength: 500, density: 500, ductility: 500, purity: 500})
        assert.equal(r.hullmass, 62500)
        assert.equal(r.capacity, 3165924)
    })

    test('hull formula exact values at max', function () {
        const r = computeShipHullCapabilities({strength: 999, density: 999, ductility: 999, purity: 999})
        assert.equal(r.hullmass, 99925)
        assert.equal(r.capacity, 10000000)
    })

    test('extractor formula exact values at min', function () {
        const r = computeExtractorCapabilities({strength: 1, tolerance: 1, conductivity: 1, reflectivity: 1})
        assert.equal(r.rate, 201)
        assert.equal(r.drain, 50)
        assert.equal(r.depth, 201)
        assert.equal(r.drill, 100)
    })

    test('extractor formula exact values at mid', function () {
        const r = computeExtractorCapabilities({strength: 500, tolerance: 500, conductivity: 500, reflectivity: 500})
        assert.equal(r.rate, 700)
        assert.equal(r.drain, 25)
        assert.equal(r.depth, 950)
        assert.equal(r.drill, 500)
    })

    test('extractor formula exact values at max', function () {
        const r = computeExtractorCapabilities({strength: 999, tolerance: 999, conductivity: 999, reflectivity: 999})
        assert.equal(r.rate, 1199)
        assert.equal(r.drain, 10)
        assert.equal(r.depth, 1698)
        assert.equal(r.drill, 899)
    })

    test('higher STR = higher extractor rate', function () {
        const low = computeExtractorCapabilities({strength: 100, tolerance: 500, conductivity: 500, reflectivity: 500})
        const high = computeExtractorCapabilities({strength: 900, tolerance: 500, conductivity: 500, reflectivity: 500})
        assert.isBelow(low.rate, high.rate)
    })

    test('higher CON = lower extractor drain', function () {
        const low = computeExtractorCapabilities({strength: 500, tolerance: 500, conductivity: 100, reflectivity: 500})
        const high = computeExtractorCapabilities({strength: 500, tolerance: 500, conductivity: 900, reflectivity: 500})
        assert.isAbove(low.drain, high.drain)
    })

    test('higher REF = higher drill', function () {
        const low = computeExtractorCapabilities({strength: 500, tolerance: 500, conductivity: 500, reflectivity: 100})
        const high = computeExtractorCapabilities({strength: 500, tolerance: 500, conductivity: 500, reflectivity: 900})
        assert.isBelow(low.drill, high.drill)
    })

    test('loader formula exact values at min', function () {
        const r = computeLoaderCapabilities({ductility: 1, plasticity: 1})
        assert.equal(r.mass, 1998)
        assert.equal(r.thrust, 1)
        assert.equal(r.quantity, 1)
    })

    test('loader formula exact values at mid', function () {
        const r = computeLoaderCapabilities({ductility: 500, plasticity: 500})
        assert.equal(r.mass, 1000)
        assert.equal(r.thrust, 2)
        assert.equal(r.quantity, 1)
    })

    test('loader formula exact values at max', function () {
        const r = computeLoaderCapabilities({ductility: 999, plasticity: 999})
        assert.equal(r.mass, 200)
        assert.equal(r.thrust, 2)
        assert.equal(r.quantity, 1)
    })

    test('higher DUC = lower loader mass', function () {
        const low = computeLoaderCapabilities({ductility: 100, plasticity: 500})
        const high = computeLoaderCapabilities({ductility: 900, plasticity: 500})
        assert.isAbove(low.mass, high.mass)
    })

    test('manufacturing formula exact values at min', function () {
        const r = computeManufacturingCapabilities({reactivity: 1, clarity: 1})
        assert.equal(r.speed, 100)
        assert.equal(r.drain, 30)
    })

    test('manufacturing formula exact values at mid', function () {
        const r = computeManufacturingCapabilities({reactivity: 500, clarity: 500})
        assert.equal(r.speed, 500)
        assert.equal(r.drain, 15)
    })

    test('manufacturing formula exact values at max', function () {
        const r = computeManufacturingCapabilities({reactivity: 999, clarity: 999})
        assert.equal(r.speed, 899)
        assert.equal(r.drain, 5)
    })

    test('higher REA = higher manufacturing speed', function () {
        const low = computeManufacturingCapabilities({reactivity: 100, clarity: 500})
        const high = computeManufacturingCapabilities({reactivity: 900, clarity: 500})
        assert.isBelow(low.speed, high.speed)
    })

    test('higher CLR = lower manufacturing drain', function () {
        const low = computeManufacturingCapabilities({reactivity: 500, clarity: 100})
        const high = computeManufacturingCapabilities({reactivity: 500, clarity: 900})
        assert.isAbove(low.drain, high.drain)
    })
})
