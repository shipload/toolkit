import {expect, test} from 'bun:test'
import type {ResourceCategory} from '@shipload/sdk'
import {
    resourceIcon,
    resourceIconBody,
    resourceIconCategories,
    resourceIconSvg,
} from '../src/primitives/resource-icon.ts'

test('resourceIconCategories covers the first five resource categories', () => {
    expect([...resourceIconCategories]).toEqual(['ore', 'crystal', 'gas', 'regolith', 'biomass'])
})

test('resourceIconSvg returns self-contained SVG for each resource category', () => {
    for (const category of resourceIconCategories) {
        const svg = resourceIconSvg(category)
        expect(svg.startsWith('<svg ')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).toContain('viewBox="0 0 64 64"')
        expect(svg).toContain(`aria-label=`)
        expect(svg).not.toContain(`data-resource`)
    }
})

test('resourceIconSvg respects size option', () => {
    const svg = resourceIconSvg('ore', {size: 24})
    expect(svg).toContain('width="24"')
    expect(svg).toContain('height="24"')
})

test('resourceIcon creates an inline group without an svg wrapper', () => {
    const svg = resourceIcon('crystal', {x: 10, y: 20, size: 32})
    expect(svg.startsWith('<svg')).toBe(false)
    expect(svg.startsWith('<g ')).toBe(true)
    expect(svg).toContain('translate(10 20) scale(0.5)')
    expect(svg).toContain('data-resource="crystal"')
})

test('resourceIconBody emits visible shape geometry', () => {
    for (const category of resourceIconCategories as readonly ResourceCategory[]) {
        const body = resourceIconBody(category)
        expect(body.length).toBeGreaterThan(120)
        expect(body).toContain('stroke="#06142f"')
    }
})
