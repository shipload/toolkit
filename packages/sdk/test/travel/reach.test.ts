import {describe, expect, test} from 'bun:test'
import {computePerLegReach, computeGroupPerLegReach} from '../../src/travel/reach'

describe('computePerLegReach', () => {
    test('reach is capacity divided by effective movement drain', () => {
        expect(computePerLegReach({generator: {capacity: 1000n}, engines: {drain: 20n}})).toBe(50)
    })

    test('throws without engine', () => {
        expect(() => computePerLegReach({generator: {capacity: 1000n}})).toThrow()
    })
})

describe('computeGroupPerLegReach', () => {
    test('group reach is bounded by the most constrained mover and excludes cargo vessels', () => {
        const haulingShip = {generator: {capacity: 1056n}, engines: {drain: 107n}}
        const escort = {generator: {capacity: 2000n}, engines: {drain: 100n}}
        const container = {generator: {capacity: 0n}}
        expect(computeGroupPerLegReach([haulingShip, escort, container])).toBeCloseTo(9.87, 2)
    })

    test('adding cargo participants cannot change loadout-defined group reach', () => {
        const ship = {generator: {capacity: 1000n}, engines: {drain: 100n}}
        const container = {generator: {capacity: 0n}}
        expect(computeGroupPerLegReach([ship])).toBe(10)
        expect(computeGroupPerLegReach([ship, container, container])).toBe(10)
    })
})
