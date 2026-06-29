import {describe, expect, test} from 'bun:test'
import {
    derivedLoaders,
    unwrapTransitDuration,
    unwrapLoadDuration,
    estimateUnwrapDuration,
    incomingHoldMass,
    projectedPeakCargomass,
} from './unwrap'

describe('unwrap duration mirror', () => {
    test('derivedLoaders aggregates lanes like derived_loaders()', () => {
        expect(derivedLoaders([])).toBeNull()
        expect(
            derivedLoaders([
                {mass: 1000, thrust: 10},
                {mass: 1400, thrust: 20},
            ])
        ).toEqual({mass: 1200, thrust: 30, quantity: 2}) // floor(2400/2)=1200, sum thrust, count
    })

    test('transit floors distance then flight time', () => {
        // distance = floor(sqrt(3^2+4^2)*10000)=50000; accel=400/mass*10000; flight=floor(2*sqrt(d/accel))
        const mass = 1000
        const accel = (400 / mass) * 10000
        const expected = Math.floor(2 * Math.sqrt(50000 / accel))
        expect(unwrapTransitDuration(mass, {x: 0, y: 0}, {x: 3, y: 4})).toBe(expected)
    })

    test('load uses altitude z, adds loader mass, divides by quantity', () => {
        const loaders = {mass: 1200, thrust: 30, quantity: 2}
        const itemMass = 800
        const accel = (30 / (itemMass + 1200)) * 10000
        const flight = Math.floor(2 * Math.sqrt(3000 / accel))
        expect(unwrapLoadDuration(loaders, itemMass, 3000)).toBe(Math.floor(flight / 2))
    })

    test('zero item mass and no loaders are safe', () => {
        expect(unwrapTransitDuration(0, {x: 0, y: 0}, {x: 9, y: 9})).toBe(0)
        expect(unwrapLoadDuration(null, 500, 3000)).toBe(0)
    })
})

test('incomingHoldMass sums incoming-kind hold mass', () => {
    expect(incomingHoldMass([])).toBe(0)
    // PUSH(2) + FLIGHT(5) count; BUILD(4) does not
    expect(
        incomingHoldMass([
            {kind: 2, incoming_mass: 100},
            {kind: 4, incoming_mass: 999},
            {kind: 5, incoming_mass: 50},
        ])
    ).toBe(150)
})

test('projectedPeakCargomass tracks the running peak from cargomass', () => {
    const entity = {cargomass: 1000, lanes: [], cargo: [], schedule: undefined} as never
    // No pending tasks: peak = base + candidate add.
    expect(projectedPeakCargomass(entity, new Date(0), 500)).toBe(1500)
})
