import {expect, test} from 'bun:test'
import {
    entityIcon,
    entityIconBody,
    entityIconSlugs,
    entityIconSlugForName,
    entityIconSvg,
} from '../src/primitives/entity-icon.ts'

test('entityIconSlugs covers the available packed entity icons', () => {
    expect([...entityIconSlugs]).toEqual(['ship', 'container'])
})

test('entityIconSlugForName resolves tier-shared entity names', () => {
    expect(entityIconSlugForName('Ship')).toBe('ship')
    expect(entityIconSlugForName('Ship (T1)')).toBe('ship')
    expect(entityIconSlugForName('Container T2')).toBe('container')
    expect(entityIconSlugForName('Warehouse')).toBeNull()
})

test('entityIconSvg returns self-contained SVG for each entity', () => {
    for (const slug of entityIconSlugs) {
        const svg = entityIconSvg(slug)
        expect(svg.startsWith('<svg ')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).toContain('viewBox="0 0 64 64"')
        expect(svg).toContain('aria-label=')
        expect(svg).not.toContain('data-entity')
    }
})

test('entityIconSvg respects size option', () => {
    const svg = entityIconSvg('container', {size: 24})
    expect(svg).toContain('width="24"')
    expect(svg).toContain('height="24"')
})

test('entityIcon creates an inline group without an svg wrapper', () => {
    const svg = entityIcon('ship', {x: 10, y: 20, size: 32})
    expect(svg.startsWith('<svg')).toBe(false)
    expect(svg.startsWith('<g ')).toBe(true)
    expect(svg).toContain('translate(10 20) scale(0.5)')
    expect(svg).toContain('data-entity="ship"')
})

test('entityIconBody emits visible source geometry', () => {
    expect(entityIconBody('ship')).toContain('viewBox="0 0 952 1267"')
    expect(entityIconBody('ship')).toContain('#ED942E')
    expect(entityIconBody('ship')).toContain('#F4EDAE')
    expect(entityIconBody('container')).toContain('viewBox="0 0 1024 1024"')
    expect(entityIconBody('container')).toContain('#484155')
})
