import {describe, expect, test} from 'bun:test'
import {
    buildHypotheticalSnapshot,
    computePerLegReach,
    renderRoutePlan,
    routePlanToJson,
    type LegEstimate,
    type RouteMeta,
} from '../../src/lib/route-render'

const meta: RouteMeta = {
    label: 'ship:14',
    origin: {x: -64, y: -10},
    dest: {x: -52, y: -37},
    legs: 3,
    totalDistance: 29.5,
    group: false,
    approxPricing: false,
}

const legs: LegEstimate[] = [
    {index: 1, from: {x: -64, y: -10}, to: {x: -62, y: -18}, distance: 8.2, energyUsed: 771, energyCap: 1056, travelSeconds: 252, rechargeSeconds: 0},
    {index: 2, from: {x: -62, y: -18}, to: {x: -59, y: -30}, distance: 12.0, energyUsed: 1010, energyCap: 1056, travelSeconds: 368, rechargeSeconds: 180},
    {index: 3, from: {x: -59, y: -30}, to: {x: -52, y: -37}, distance: 9.9, energyUsed: 931, energyCap: 1056, travelSeconds: 303, rechargeSeconds: 180},
]

const commands = [
    'shiploadcli ship 14 travel -62 -18 --recharge',
    'shiploadcli ship 14 travel -59 -30 --recharge',
    'shiploadcli ship 14 travel -52 -37 --recharge',
]

describe('computePerLegReach', () => {
    test('reach is generator capacity divided by engine drain', () => {
        const reach = computePerLegReach({generator: {capacity: 1056n}, engines: {drain: 94n}})
        expect(reach).toBeCloseTo(11.23, 2)
    })

    test('throws when the entity has no engine or generator', () => {
        expect(() => computePerLegReach({})).toThrow()
        expect(() => computePerLegReach({generator: {capacity: 1056n}, engines: {drain: 0n}})).toThrow()
    })
})

describe('buildHypotheticalSnapshot', () => {
    test('places the ship at the new coord with full energy by default', () => {
        const base = {
            coordinates: {x: -64n, y: -10n},
            energy: 200n,
            generator: {capacity: 1056n},
        }
        const hypo = buildHypotheticalSnapshot(base as never, {x: -59, y: -30})
        expect(hypo.coordinates).toEqual({x: -59n, y: -30n})
        expect(hypo.energy).toBe(1056n)
    })

    test('carries an explicit running energy when provided', () => {
        const base = {
            coordinates: {x: -64n, y: -10n},
            energy: 200n,
            generator: {capacity: 1056n},
        }
        const hypo = buildHypotheticalSnapshot(base as never, {x: -59, y: -30}, 310n)
        expect(hypo.coordinates).toEqual({x: -59n, y: -30n})
        expect(hypo.energy).toBe(310n)
    })
})

describe('renderRoutePlan', () => {
    test('renders the header, a row per leg, and the commands', () => {
        const out = renderRoutePlan(meta, legs, commands)
        expect(out).toContain('ship:14')
        expect(out).toContain('(-64, -10)')
        expect(out).toContain('(-52, -37)')
        for (const cmd of commands) expect(out).toContain(cmd)
    })

    test('renders a totals block with flight, recharge, and total time', () => {
        const out = renderRoutePlan(meta, legs, commands)
        expect(out).toContain('Legs:')
        expect(out).toContain('Distance:')
        expect(out).toContain('Flight:')
        expect(out).toContain('Recharge:')
        expect(out).toContain('Total:')
        expect(out).toContain('21m 23s')
    })

    test('notes approximate pricing for group routes', () => {
        const out = renderRoutePlan({...meta, group: true, approxPricing: true, label: 'ship:14 + container:2'}, legs, commands)
        expect(out.toLowerCase()).toContain('approx')
    })
})

describe('routePlanToJson', () => {
    test('emits a structured plan', () => {
        const json = routePlanToJson(meta, legs)
        expect(json.legs).toHaveLength(3)
        expect(json.legs[0]).toMatchObject({from: {x: -64, y: -10}, to: {x: -62, y: -18}})
        expect(json.totalDistance).toBe(29.5)
        expect(json.flightSeconds).toBe(923)
        expect(json.rechargeSeconds).toBe(360)
        expect(json.totalSeconds).toBe(1283)
    })
})
