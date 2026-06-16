import {expect, test} from 'bun:test'
import {
    componentIcon,
    componentIconBody,
    componentIconSlugs,
    componentIconSlugForName,
    componentIconSvg,
} from '../src/primitives/component-icon.ts'

test('componentIconSlugs covers the ten base components', () => {
    expect([...componentIconSlugs]).toEqual([
        'plate',
        'frame',
        'plasma-cell',
        'resonator',
        'beam',
        'sensor',
        'polymer',
        'ceramic',
        'reactor',
        'resin',
    ])
})

test('componentIconSlugForName resolves tier-shared component names', () => {
    expect(componentIconSlugForName('Plate')).toBe('plate')
    expect(componentIconSlugForName('Frame T2')).toBe('frame')
    expect(componentIconSlugForName('Plate (T1)')).toBe('plate')
    expect(componentIconSlugForName('Plasma Cell')).toBe('plasma-cell')
    expect(componentIconSlugForName('Engine')).toBeNull()
})

test('componentIconSvg returns self-contained SVG for each component', () => {
    for (const slug of componentIconSlugs) {
        const svg = componentIconSvg(slug)
        expect(svg.startsWith('<svg ')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).toContain('viewBox="0 0 64 64"')
        expect(svg).toContain('aria-label=')
        expect(svg).not.toContain('data-component')
    }
})

test('componentIconSvg respects size option', () => {
    const svg = componentIconSvg('plate', {size: 24})
    expect(svg).toContain('width="24"')
    expect(svg).toContain('height="24"')
})

test('componentIcon creates an inline group without an svg wrapper', () => {
    const svg = componentIcon('frame', {x: 10, y: 20, size: 32})
    expect(svg.startsWith('<svg')).toBe(false)
    expect(svg.startsWith('<g ')).toBe(true)
    expect(svg).toContain('translate(10 20) scale(0.5)')
    expect(svg).toContain('data-component="frame"')
})

test('componentIconBody emits visible shape geometry', () => {
    for (const slug of componentIconSlugs) {
        const body = componentIconBody(slug)
        expect(body.length).toBeGreaterThan(120)
        expect(body).toContain('stroke="#06142f"')
    }
})
