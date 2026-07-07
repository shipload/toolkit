import {expect, test} from 'bun:test'
import {
    moduleIcon,
    moduleIconBody,
    moduleIconSlugForName,
    moduleIconSlugForType,
    moduleIconSlugs,
    moduleIconSvg,
} from '../src/primitives/module-icon.ts'

test('moduleIconSlugs covers module capabilities plus the universal slot', () => {
    expect([...moduleIconSlugs]).toEqual([
        'engine',
        'generator',
        'gatherer',
        'loader',
        'warp',
        'crafter',
        'launcher',
        'storage',
        'hauler',
        'battery',
        'any',
    ])
})

test('moduleIconSlugForName resolves tier-shared module names', () => {
    expect(moduleIconSlugForName('Engine')).toBe('engine')
    expect(moduleIconSlugForName('Engine T2')).toBe('engine')
    expect(moduleIconSlugForName('Power Core')).toBe('generator')
    expect(moduleIconSlugForName('Limpet Bay (T1)')).toBe('gatherer')
    expect(moduleIconSlugForName('Shuttle Bay')).toBe('loader')
    expect(moduleIconSlugForName('Warp Drive')).toBe('warp')
    expect(moduleIconSlugForName('Fabricator')).toBe('crafter')
    expect(moduleIconSlugForName('Drive Coil')).toBe('launcher')
    expect(moduleIconSlugForName('Cargo Hold')).toBe('storage')
    expect(moduleIconSlugForName('Tractor Beam')).toBe('hauler')
    expect(moduleIconSlugForName('Battery Bank')).toBe('battery')
    expect(moduleIconSlugForName('Any')).toBe('any')
    expect(moduleIconSlugForName('Plate')).toBeNull()
})

test('moduleIconSlugForType resolves SDK capability types', () => {
    expect(moduleIconSlugForType('engine')).toBe('engine')
    expect(moduleIconSlugForType('generator')).toBe('generator')
    expect(moduleIconSlugForType('gatherer')).toBe('gatherer')
    expect(moduleIconSlugForType('loader')).toBe('loader')
    expect(moduleIconSlugForType('warp')).toBe('warp')
    expect(moduleIconSlugForType('crafter')).toBe('crafter')
    expect(moduleIconSlugForType('launcher')).toBe('launcher')
    expect(moduleIconSlugForType('storage')).toBe('storage')
    expect(moduleIconSlugForType('hauler')).toBe('hauler')
    expect(moduleIconSlugForType('battery')).toBe('battery')
    expect(moduleIconSlugForType('any')).toBe('any')
    expect(moduleIconSlugForType('catcher')).toBeNull()
})

test('moduleIconSvg returns self-contained SVG for each module icon', () => {
    for (const slug of moduleIconSlugs) {
        const svg = moduleIconSvg(slug)
        expect(svg.startsWith('<svg ')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).toContain('viewBox="0 0 256 256"')
        expect(svg).toContain('aria-label=')
        expect(svg).not.toContain('data-module')
    }
})

test('moduleIconSvg respects size option', () => {
    const svg = moduleIconSvg('loader', {size: 24})
    expect(svg).toContain('width="24"')
    expect(svg).toContain('height="24"')
})

test('moduleIcon creates an inline group without an svg wrapper', () => {
    const svg = moduleIcon('gatherer', {x: 10, y: 20, size: 32})
    expect(svg.startsWith('<svg')).toBe(false)
    expect(svg.startsWith('<g ')).toBe(true)
    expect(svg).toContain('translate(10 20) scale(0.125)')
    expect(svg).toContain('data-module="gatherer"')
})

test('moduleIconBody emits visible shape geometry', () => {
    for (const slug of moduleIconSlugs) {
        const body = moduleIconBody(slug)
        expect(body.length).toBeGreaterThan(120)
        expect(body).toContain('stroke="#120d1b"')
    }
})
