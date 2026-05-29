import {expect, test} from 'bun:test'
import {iconHex} from '../src/primitives/icon-hex.ts'
import {statBar} from '../src/primitives/stat-bar.ts'
import {moduleSlot} from '../src/primitives/module-slot.ts'
import {quantityBadge} from '../src/primitives/quantity-badge.ts'

test('iconHex draws a hexagon with the category color and 2-char code', () => {
    const svg = iconHex({x: 14, y: 14, color: '#58d08c', code: 'FE'})
    expect(svg).toContain('<polygon')
    expect(svg).toContain('stroke="#58d08c"')
    expect(svg).toContain('>FE<')
})

test('statBar emits a labeled bar with value ∈ [0, 1023]', () => {
    const svg = statBar({
        x: 14,
        y: 100,
        width: 252,
        label: 'Strength',
        abbreviation: 'STR',
        value: 342,
        color: '#58d08c',
    })
    expect(svg).toContain('STR')
    expect(svg).toContain('Strength')
    expect(svg).toContain('342')
    // Fill width proportional to value/1023:
    // expected filled width ≈ 252 * 342 / 1023 ≈ 84.2
    expect(svg).toContain('width="84"')
})

test('statBar inverts the visual fill when inverted is true', () => {
    const hi = statBar({
        x: 0,
        y: 0,
        width: 100,
        label: 'X',
        abbreviation: 'X',
        value: 900,
        color: '#fff',
    })
    const lo = statBar({
        x: 0,
        y: 0,
        width: 100,
        label: 'X',
        abbreviation: 'X',
        value: 900,
        color: '#fff',
        inverted: true,
    })
    expect(hi).not.toBe(lo)
})

test('moduleSlot renders an empty state with "Empty module" label', () => {
    const svg = moduleSlot({x: 14, y: 200, width: 252, installed: false})
    expect(svg).toContain('Empty module')
})

test('moduleSlot renders an installed state with capability prose', () => {
    const svg = moduleSlot({
        x: 14,
        y: 200,
        width: 252,
        installed: true,
        capability: 'Engine',
        description: [
            {text: 'generates '},
            {text: '757', highlight: true},
            {text: ' thrust for travel'},
        ],
        accentColor: '#58d08c',
    })
    expect(svg).toContain('Engine:')
    expect(svg).toContain('757')
    expect(svg).toContain('thrust for')
})

test('quantityBadge is empty string when quantity is 0', () => {
    expect(quantityBadge({x: 0, y: 0, quantity: 0, tone: '#C26D3F'})).toBe('')
})

test('quantityBadge renders ×1 when quantity is 1', () => {
    expect(quantityBadge({x: 250, y: 8, quantity: 1, tone: '#C26D3F'})).toContain('×1')
})

test('quantityBadge renders ×N chip when quantity > 1', () => {
    const svg = quantityBadge({x: 250, y: 8, quantity: 50, tone: '#C26D3F'})
    expect(svg).toContain('×50')
})

test('quantityBadge is an outline chip stroked in the identity tone', () => {
    const svg = quantityBadge({x: 250, y: 8, quantity: 5, tone: '#7E93C4'})
    expect(svg).toContain('fill="#11141a"')
    expect(svg).toContain('stroke="#7E93C4"')
    expect(svg).toContain('fill="#e6e8ec"')
})
