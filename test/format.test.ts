import {expect, test} from 'bun:test'
import {formatMass, formatMassDelta} from '../src/format'

test('formatMass displays whole tonnes without decimals', () => {
    expect(formatMass(30000)).toBe('30 t')
})

test('formatMass strips trailing zeros', () => {
    expect(formatMass(28830)).toBe('28.83 t')
})

test('formatMass rounds to 2 decimals max', () => {
    expect(formatMass(3591050)).toBe('3591.05 t')
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
