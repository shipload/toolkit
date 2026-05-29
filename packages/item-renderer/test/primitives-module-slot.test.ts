import {test, expect} from 'bun:test'
import {moduleSlot} from '../src/primitives/module-slot.ts'
import {tokens} from '../src/tokens/index.ts'

test('installed slot renders a filled diamond + capability-colored prose label', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Engine',
        description: 'generates 700 thrust for travel',
        accentColor: tokens.colors.capability.engine,
    })
    expect(svg).toContain('<polygon')
    expect(svg).toContain('Engine:')
    expect(svg).toContain(tokens.colors.capability.engine)
})

test('installed slot renders prose with white-highlighted numbers', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Gatherer',
        description: [
            {text: 'locks onto up to '},
            {text: '880', highlight: true},
            {text: ' targets'},
        ],
        accentColor: tokens.colors.capability.gatherer,
    })
    expect(svg).toContain('880')
    expect(svg).toContain('locks onto')
    // Highlighted number uses white (primary), not gold.
    expect(svg).toContain(tokens.colors.text.primary)
    expect(svg).not.toContain(tokens.colors.text.accent)
})

test('installed slot uses no gold accent', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Engine',
        description: [{text: 'generates '}, {text: '700', highlight: true}, {text: ' thrust'}],
        accentColor: tokens.colors.capability.engine,
    })
    expect(svg).not.toContain(tokens.colors.text.accent)
    expect(svg).not.toContain('#f4c96b')
})

test('installed slot with no description renders capability label only', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Engine',
        accentColor: tokens.colors.capability.engine,
    })
    expect(svg).toContain('Engine')
    expect(svg).toContain(tokens.colors.capability.engine)
})

test('empty slot renders muted hollow diamond + Empty module', () => {
    const svg = moduleSlot({x: 14, y: 40, width: 252, installed: false})
    expect(svg).toContain('Empty module')
    expect(svg).toContain(tokens.colors.text.muted)
})
