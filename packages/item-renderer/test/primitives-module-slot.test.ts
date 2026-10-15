import {test, expect} from 'bun:test'
import {moduleSlot} from '../src/primitives/module-slot.ts'
import {tokens} from '../src/tokens/index.ts'

test('installed slot renders a filled diamond + accent-colored module name', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        name: 'Engine',
        rows: [{label: 'Speed', value: '40 ly/hr'}],
        accentColor: tokens.colors.capability.engine,
    })
    expect(svg).toContain('<polygon')
    expect(svg).toContain('>Engine</text>')
    expect(svg).toContain(tokens.colors.capability.engine)
})

test('installed slot renders each figure as a label and a right-aligned value', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        name: 'Limpet Bay',
        rows: [
            {label: 'Yield', value: '41.0 t/min'},
            {label: 'Depth', value: '1,000 km'},
        ],
        accentColor: tokens.colors.capability.gatherer,
    })
    expect(svg).toContain('>Yield</text>')
    expect(svg).toContain('>41.0 t/min</text>')
    expect(svg).toContain('>1,000 km</text>')
    expect(svg).toContain('text-anchor="end"')
    expect(svg).toContain(tokens.colors.text.secondary)
})

test('installed slot uses no gold accent', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        name: 'Engine',
        rows: [{label: 'Speed', value: '40 ly/hr'}],
        accentColor: tokens.colors.capability.engine,
    })
    expect(svg).not.toContain(tokens.colors.text.accent)
    expect(svg).not.toContain('#f4c96b')
})

test('installed slot with no rows renders the module name only', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        name: 'Engine',
        accentColor: tokens.colors.capability.engine,
    })
    expect(svg).toContain('Engine')
    expect(svg).toContain(tokens.colors.capability.engine)
    expect(svg).not.toContain('text-anchor="end"')
})

test('empty slot renders muted hollow diamond + Empty module', () => {
    const svg = moduleSlot({x: 14, y: 40, width: 252, installed: false})
    expect(svg).toContain('Empty module')
    expect(svg).toContain(tokens.colors.text.muted)
})
