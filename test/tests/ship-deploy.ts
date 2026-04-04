import {assert} from 'chai'
import {
    computeEngineCapabilities,
    computeGeneratorCapabilities,
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
        assert.equal(r.thrust, 100)
        assert.equal(r.drain, 50)
    })

    test('engine formula exact values at mid', function () {
        const r = computeEngineCapabilities({volatility: 500, thermal: 500})
        assert.equal(r.thrust, 300)
        assert.equal(r.drain, 30)
    })

    test('engine formula exact values at max', function () {
        const r = computeEngineCapabilities({volatility: 999, thermal: 999})
        assert.equal(r.thrust, 499)
        assert.equal(r.drain, 11)
    })

    test('generator formula exact values at min', function () {
        const r = computeGeneratorCapabilities({resonance: 1, clarity: 1})
        assert.equal(r.capacity, 150)
        assert.equal(r.recharge, 5)
    })

    test('generator formula exact values at mid', function () {
        const r = computeGeneratorCapabilities({resonance: 500, clarity: 500})
        assert.equal(r.capacity, 375)
        assert.equal(r.recharge, 12)
    })

    test('generator formula exact values at max', function () {
        const r = computeGeneratorCapabilities({resonance: 999, clarity: 999})
        assert.equal(r.capacity, 599)
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
})
