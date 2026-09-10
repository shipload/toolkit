import {expect, test, describe} from 'bun:test'
import {formatMass, formatMassDelta, formatMassScaled, formatLocation} from '../src/format'

test('formatMass displays whole tonnes without decimals', () => {
    expect(formatMass(300)).toBe('30 t')
})

test('formatMass strips a trailing zero from the decimal digit', () => {
    expect(formatMass(2883)).toBe('288.3 t')
})

test('formatMass supports one decimal place', () => {
    expect(formatMass(359105)).toBe('35910.5 t')
})

test('formatMass is exact integer arithmetic, no float precision loss', () => {
    expect(formatMass(468165)).toBe('46816.5 t')
})

test('formatMass handles the smallest unit', () => {
    expect(formatMass(1)).toBe('0.1 t')
})

test('formatMass handles zero', () => {
    expect(formatMass(0)).toBe('0 t')
})

test('formatMassDelta prefixes positive with +', () => {
    expect(formatMassDelta(150)).toBe('+15 t')
})

test('formatMassDelta prefixes negative with -', () => {
    expect(formatMassDelta(-150)).toBe('-15 t')
})

describe('formatMassScaled', () => {
    test('zero', () => {
        expect(formatMassScaled(0)).toBe('0 t')
    })

    test('plain tonnes below 1k', () => {
        expect(formatMassScaled(520)).toBe('52 t')
        expect(formatMassScaled(9_990)).toBe('999 t')
    })

    test('preserves fractional tonnes in the plain range', () => {
        expect(formatMassScaled(288)).toBe('28.8 t')
    })

    test('switches to k at 1,000 t', () => {
        expect(formatMassScaled(10_000)).toBe('1k t')
        expect(formatMassScaled(15_000)).toBe('1.5k t')
        expect(formatMassScaled(123_450)).toBe('12.3k t')
        expect(formatMassScaled(9_999_000)).toBe('999.9k t')
    })

    test('switches to m at 1,000,000 t', () => {
        expect(formatMassScaled(10_000_000)).toBe('1m t')
        expect(formatMassScaled(25_000_000)).toBe('2.5m t')
    })

    test('switches to b at 1,000,000,000 t', () => {
        expect(formatMassScaled(10_000_000_000)).toBe('1b t')
    })

    test('handles negative mass', () => {
        expect(formatMassScaled(-520)).toBe('-52 t')
        expect(formatMassScaled(-15_000)).toBe('-1.5k t')
    })
})

describe('formatLocation', () => {
    test('formats positive coordinates', () => {
        expect(formatLocation({x: 10, y: 20})).toBe('10, 20')
    })

    test('formats zero coordinates', () => {
        expect(formatLocation({x: 0, y: 0})).toBe('0, 0')
    })

    test('formats negative coordinates with ASCII minus', () => {
        expect(formatLocation({x: -64, y: -10})).toBe('-64, -10')
    })

    test('formats mixed signs', () => {
        expect(formatLocation({x: -5, y: 7})).toBe('-5, 7')
    })
})
