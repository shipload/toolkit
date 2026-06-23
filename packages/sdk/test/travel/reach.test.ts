import {describe, expect, test} from 'bun:test'
import {computePerLegReach, computeGroupPerLegReach} from '../../src/travel/reach'

describe('computePerLegReach', () => {
    test('capacity / drain with no haul', () => {
        expect(computePerLegReach({generator: {capacity: 1000n}, engines: {drain: 10n}})).toBe(100)
    })
    test('haul drain shrinks reach', () => {
        const s = {generator: {capacity: 1000n}, engines: {drain: 10n}, hauler: {drain: 5n}}
        expect(computePerLegReach(s, 2)).toBe(1000 / 20)
    })
    test('throws without engine', () => {
        expect(() => computePerLegReach({generator: {capacity: 1000n}})).toThrow()
    })
})

describe('computeGroupPerLegReach', () => {
    test('bottleneck mover wins', () => {
        const a = {generator: {capacity: 1000n}, engines: {drain: 10n}}
        const b = {generator: {capacity: 1000n}, engines: {drain: 20n}}
        expect(computeGroupPerLegReach([a, b], 0)).toBe(50)
    })
})
