import {describe, expect, test} from 'bun:test'
import {renderField} from '../../src/tui/primitives/field'
import {renderProgressBar} from '../../src/tui/primitives/progress-bar'

describe('renderProgressBar', () => {
    test('zero ratio renders all empty cells', () => {
        expect(renderProgressBar(0, 10)).toBe(`[${'░'.repeat(10)}]`)
    })

    test('full ratio renders all filled cells', () => {
        expect(renderProgressBar(1, 10)).toBe(`[${'█'.repeat(10)}]`)
    })

    test('half ratio splits roughly in half', () => {
        expect(renderProgressBar(0.5, 10)).toBe(`[${'█'.repeat(5)}${'░'.repeat(5)}]`)
    })

    test('clamps out-of-range ratios', () => {
        expect(renderProgressBar(-0.5, 10)).toBe(`[${'░'.repeat(10)}]`)
        expect(renderProgressBar(1.5, 10)).toBe(`[${'█'.repeat(10)}]`)
    })

    test('derives width from available space', () => {
        // brackets add 2 chars, so total = inner_width + 2
        expect(renderProgressBar(0, 10, {available: 60, reservedRight: 12}).length).toBe(42)
        expect(renderProgressBar(0, 10, {available: 30, reservedRight: 12}).length).toBe(20)
    })
})

describe('renderField', () => {
    test('formats icon + value pairs', () => {
        expect(renderField({icon: '⚡', value: '8420/10000'})).toBe('⚡ 8420/10000')
    })

    test('supports a trailing bar', () => {
        expect(renderField({icon: '⚡', value: '8420/10000', trailing: '▰▰▱'})).toBe(
            '⚡ 8420/10000  ▰▰▱'
        )
    })
})
