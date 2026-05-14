import {expect, test, describe} from 'bun:test'
import {formatMass, formatMassDelta, formatMassScaled, formatLocation} from '../src/format'

test('formatMass displays whole tonnes without decimals', () => {
    expect(formatMass(30000)).toBe('30 t')
})

test('formatMass strips trailing zeros', () => {
    expect(formatMass(28830)).toBe('28.83 t')
})

test('formatMass rounds to 2 decimals max', () => {
    expect(formatMass(3591050)).toBe('3591.05 t')
})

test('formatMass rounds in integer kg space to avoid float precision loss', () => {
    // 46816545 kg = 46816.545 t; float toFixed(2) would silently truncate to
    // "46816.54" because the float repr is 46816.5449999…
    expect(formatMass(46816545)).toBe('46816.55 t')
})

test('formatMass handles zero', () => {
    expect(formatMass(0)).toBe('0 t')
})

test('formatMassDelta prefixes positive with +', () => {
    expect(formatMassDelta(15000)).toBe('+15 t')
})

test('formatMassDelta prefixes negative with -', () => {
    expect(formatMassDelta(-15000)).toBe('-15 t')
})

describe('formatMassScaled', () => {
    test('zero', () => {
        expect(formatMassScaled(0)).toBe('0 t')
    })

    test('plain tonnes below 1k', () => {
        expect(formatMassScaled(52_000)).toBe('52 t')
        expect(formatMassScaled(999_000)).toBe('999 t')
    })

    test('preserves fractional tonnes in the plain range', () => {
        expect(formatMassScaled(28_830)).toBe('28.83 t')
    })

    test('switches to k at 1,000 t', () => {
        expect(formatMassScaled(1_000_000)).toBe('1k t')
        expect(formatMassScaled(1_500_000)).toBe('1.5k t')
        expect(formatMassScaled(12_345_000)).toBe('12.3k t')
        expect(formatMassScaled(999_900_000)).toBe('999.9k t')
    })

    test('switches to m at 1,000,000 t', () => {
        expect(formatMassScaled(1_000_000_000)).toBe('1m t')
        expect(formatMassScaled(2_500_000_000)).toBe('2.5m t')
    })

    test('switches to b at 1,000,000,000 t', () => {
        expect(formatMassScaled(1_000_000_000_000)).toBe('1b t')
    })

    test('handles negative mass', () => {
        expect(formatMassScaled(-52_000)).toBe('-52 t')
        expect(formatMassScaled(-1_500_000)).toBe('-1.5k t')
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
