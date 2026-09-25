import {expect, test} from 'bun:test'
import {partGlyphKinds, partGlyphSvg} from '../src/primitives/part-glyph.ts'

test('partGlyphKinds lists the four non-resource cargo groups in chip order', () => {
    expect([...partGlyphKinds]).toEqual(['refined', 'machined', 'modules', 'hulls'])
})

test('partGlyphSvg returns a self-contained ink SVG for each kind', () => {
    const bodies = new Set<string>()
    for (const kind of partGlyphKinds) {
        const svg = partGlyphSvg(kind, {size: 18, title: kind})
        expect(svg.startsWith('<svg ')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).toContain('viewBox="0 0 64 64"')
        expect(svg).toContain('width="18"')
        expect(svg).toContain(`aria-label="${kind}"`)
        expect(svg).toContain('currentColor')
        expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}/)
        bodies.add(svg.replace(/<title>.*<\/title>/, '').replace(/aria-label="[^"]*"/, ''))
    }
    expect(bodies.size).toBe(4)
})

test('partGlyphSvg defaults to 64px and a plain title', () => {
    const svg = partGlyphSvg('machined')
    expect(svg).toContain('width="64"')
    expect(svg).toContain('<title>Machined components</title>')
})
