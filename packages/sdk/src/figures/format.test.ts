import {describe, expect, test} from 'bun:test'
import {formatDistance, formatDistanceValue, formatPerDistance, formatTonnesRate} from './format'

describe('formatDistance', () => {
    test('one decimal below 100 ly', () => {
        expect(formatDistance(1.4)).toBe('1.4 ly')
        expect(formatDistance(23.6)).toBe('23.6 ly')
        expect(formatDistance(5.49)).toBe('5.5 ly')
    })

    test('whole numbers with separators from 100 to 9,999', () => {
        expect(formatDistance(739)).toBe('739 ly')
        expect(formatDistance(3097)).toBe('3,097 ly')
        expect(formatDistance(99.96)).toBe('100 ly')
    })

    test('k and capital M from 10,000, the same rule on the abbreviated number', () => {
        expect(formatDistance(9999.6)).toBe('10.0k ly')
        expect(formatDistance(52_300)).toBe('52.3k ly')
        expect(formatDistance(523_000)).toBe('523k ly')
        expect(formatDistance(999_600)).toBe('1.0M ly')
        expect(formatDistance(1_200_000)).toBe('1.2M ly')
        expect(formatDistance(4_294_967_296)).toBe('4,295M ly')
    })

    test('keeps the sign for deltas', () => {
        expect(formatDistanceValue(-16.25)).toBe('-16.3')
        expect(formatDistanceValue(-52_300)).toBe('-52.3k')
    })
})

describe('formatPerDistance', () => {
    test('per-ly drains follow the distance rule', () => {
        expect(formatPerDistance(200.8)).toBe('201 energy/ly')
        expect(formatPerDistance(9.25)).toBe('9.3 energy/ly')
        expect(formatPerDistance(12.338)).toBe('12.3 energy/ly')
    })
})

describe('formatTonnesRate', () => {
    test('compact k above 1,000 t/min', () => {
        expect(formatTonnesRate(476.19, 0)).toBe('476 t/min')
        expect(formatTonnesRate(28.24, 1)).toBe('28.2 t/min')
        expect(formatTonnesRate(2400, 0)).toBe('2.4k t/min')
    })
})
