import {test, expect} from 'bun:test'
import {moduleSlot} from '../src/primitives/module-slot.ts'
import type {TextSpan} from '@shipload/sdk'

test('string description flows inline with the bold capability label', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Engine',
        description: 'generates 700 thrust for travel',
        accentColor: '#2fd6d1',
    })
    expect(svg).toContain('<polygon')
    expect(svg).toContain('Engine: ')
    expect(svg).toContain('font-weight="600"')
    expect(svg).toContain('generates 700 thrust for')
})

test('TextSpan[] description renders each span; highlighted spans get accent color', () => {
    const spans: TextSpan[] = [
        {text: 'generates '},
        {text: '700', highlight: true},
        {text: ' thrust for travel while draining '},
        {text: '45', highlight: true},
        {text: ' energy per distance travelled'},
    ]
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Engine',
        description: spans,
        accentColor: '#2fd6d1',
    })
    expect(svg).toContain('Engine:')
    expect(svg).toContain('>generates <')
    expect(svg).toContain('>700<')
    expect(svg).toContain('>45<')
    expect(svg).toMatch(/fill="#[0-9A-Fa-f]{6}"[^>]*>700</)
})

test('TextSpan[] description wraps across lines preserving highlight boundaries', () => {
    const spans: TextSpan[] = [
        {text: 'mines resources at '},
        {text: '880', highlight: true},
        {text: ' speed to a max depth of '},
        {text: '248', highlight: true},
        {text: ' with '},
        {text: '100', highlight: true},
        {text: ' gather speed while draining '},
        {text: '1,250', highlight: true},
        {text: ' energy per second'},
    ]
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Gatherer',
        description: spans,
        accentColor: '#f59e0b',
    })
    expect(svg).toContain('880')
    expect(svg).toContain('248')
    expect(svg).toContain('100')
    expect(svg).toContain('1,250')
})

test('Empty description array renders headline only', () => {
    const svg = moduleSlot({
        x: 14,
        y: 40,
        width: 252,
        installed: true,
        capability: 'Engine',
        description: [],
        accentColor: '#2fd6d1',
    })
    expect(svg).toContain('Engine:')
})

test('Empty slot renders unchanged', () => {
    const svg = moduleSlot({x: 14, y: 40, width: 252, installed: false})
    expect(svg).toContain('Empty module')
})
