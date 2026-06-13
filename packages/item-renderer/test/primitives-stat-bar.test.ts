import {expect, test} from 'bun:test'
import {statBar} from '../src/primitives/stat-bar.ts'

const base = {
    x: 14,
    y: 60,
    width: 252,
    label: 'Strength',
    abbreviation: 'STR',
    color: '#c26d3f',
}

test('renders star glyphs when stars is provided and value is present', () => {
    const svg = statBar({...base, value: 800, stars: 3})
    expect((svg.match(/<path/g) ?? []).length).toBe(3)
    expect((svg.match(/#ffce5c/g) ?? []).length).toBe(3)
})

test('renders no star glyphs when stars is omitted', () => {
    const svg = statBar({...base, value: 800})
    expect(svg).not.toContain('<path')
})

test('renders no star glyphs in ranges mode (value null) even if stars passed', () => {
    const svg = statBar({...base, value: null, stars: 3})
    expect(svg).not.toContain('<path')
})

test('still renders the value number after the stars', () => {
    const svg = statBar({...base, value: 800, stars: 3})
    expect(svg).toContain('>800<')
})
