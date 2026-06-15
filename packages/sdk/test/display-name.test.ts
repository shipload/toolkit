import {describe, expect, test} from 'bun:test'
import {normalizeDisplayName, validateDisplayName} from '../src/utils/display-name'

describe('normalizeDisplayName', () => {
    test('trims ASCII spaces from both ends', () => {
        expect(normalizeDisplayName('  Rocinante  ')).toBe('Rocinante')
    })

    test('does not trim tabs or non-ASCII spaces', () => {
        expect(normalizeDisplayName('\tRocinante\t')).toBe('\tRocinante\t')
        expect(normalizeDisplayName('\u00a0Rocinante\u00a0')).toBe('\u00a0Rocinante\u00a0')
    })
})

describe('validateDisplayName', () => {
    test('accepts and trims a valid name', () => {
        expect(validateDisplayName('  Rocinante  ')).toEqual({valid: true, name: 'Rocinante'})
    })

    test('accepts ASCII internal spaces', () => {
        expect(validateDisplayName('USCSS Nostromo')).toEqual({
            valid: true,
            name: 'USCSS Nostromo',
        })
    })

    test('accepts emoji and CJK within 32 UTF-8 bytes', () => {
        expect(validateDisplayName('宇宙船 🚀')).toEqual({valid: true, name: '宇宙船 🚀'})
    })

    test('rejects empty and whitespace-only names after trimming ASCII spaces', () => {
        expect(validateDisplayName('')).toEqual({valid: false, reason: 'empty', name: ''})
        expect(validateDisplayName('   ')).toEqual({valid: false, reason: 'empty', name: ''})
    })

    test('accepts empty and whitespace-only names when allowEmpty is set', () => {
        expect(validateDisplayName('', {allowEmpty: true})).toEqual({valid: true, name: ''})
        expect(validateDisplayName('   ', {allowEmpty: true})).toEqual({valid: true, name: ''})
    })

    test('allowEmpty still rejects non-empty names that break other rules', () => {
        const zeroWidth = `zero${String.fromCharCode(0x200b)}width`
        expect(validateDisplayName('x'.repeat(33), {allowEmpty: true})).toEqual({
            valid: false,
            reason: 'too_long',
            name: 'x'.repeat(33),
        })
        expect(validateDisplayName(zeroWidth, {allowEmpty: true})).toEqual({
            valid: false,
            reason: 'invalid_char',
            name: zeroWidth,
        })
    })

    test('rejects names over 32 UTF-8 bytes', () => {
        expect(validateDisplayName('x'.repeat(33))).toEqual({
            valid: false,
            reason: 'too_long',
            name: 'x'.repeat(33),
        })
        expect(validateDisplayName('🚀'.repeat(9))).toEqual({
            valid: false,
            reason: 'too_long',
            name: '🚀'.repeat(9),
        })
    })

    test('accepts names exactly 32 UTF-8 bytes', () => {
        expect(validateDisplayName('x'.repeat(32))).toEqual({
            valid: true,
            name: 'x'.repeat(32),
        })
        expect(validateDisplayName('🚀'.repeat(8))).toEqual({
            valid: true,
            name: '🚀'.repeat(8),
        })
    })

    test('rejects C0, DEL, and C1 control characters', () => {
        for (const name of ['bad\u0007name', 'bad\u007fname', 'bad\u0085name']) {
            expect(validateDisplayName(name)).toEqual({valid: false, reason: 'invalid_char', name})
        }
    })

    test('rejects zero-width characters', () => {
        for (const name of [
            'zero\u200bwidth',
            'zero\u200cwidth',
            'zero\u200dwidth',
            'zero\u2060width',
            'zero\ufeffwidth',
        ]) {
            expect(validateDisplayName(name)).toEqual({valid: false, reason: 'invalid_char', name})
        }
    })

    test('rejects bidi controls', () => {
        for (const name of ['bidi\u202eoverride', 'bidi\u2066isolate']) {
            expect(validateDisplayName(name)).toEqual({valid: false, reason: 'invalid_char', name})
        }
    })

    test('rejects lone surrogates', () => {
        for (const name of ['bad\uD800name', 'bad\uDC00name']) {
            expect(validateDisplayName(name)).toEqual({valid: false, reason: 'invalid_char', name})
        }
    })
})
