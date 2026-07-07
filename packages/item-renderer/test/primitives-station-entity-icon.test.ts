import {expect, test} from 'bun:test'
import {
    stationEntityIcon,
    stationEntityIconBody,
    stationEntityIconKindForName,
    stationEntityIconKinds,
    stationEntityIconLabelForKind,
    stationEntityIconSvg,
} from '../src/primitives/station-entity-icon.ts'

test('stationEntityIconKinds covers the station entity types', () => {
    expect([...stationEntityIconKinds]).toEqual([
        'hub',
        'warehouse',
        'extractor',
        'factory',
        'mdriver',
        'mcatcher',
    ])
})

test('stationEntityIconKindForName resolves tier-shared station names', () => {
    expect(stationEntityIconKindForName('Station Hub')).toBe('hub')
    expect(stationEntityIconKindForName('Warehouse T2')).toBe('warehouse')
    expect(stationEntityIconKindForName('Mining Rig')).toBe('extractor')
    expect(stationEntityIconKindForName('Factory')).toBe('factory')
    expect(stationEntityIconKindForName('Mass Driver')).toBe('mdriver')
    expect(stationEntityIconKindForName('Mass Catcher (T1)')).toBe('mcatcher')
    expect(stationEntityIconKindForName('Plate')).toBeNull()
})

test('stationEntityIconLabelForKind returns display labels', () => {
    expect(stationEntityIconLabelForKind('hub')).toBe('Station Hub')
    expect(stationEntityIconLabelForKind('mcatcher')).toBe('Mass Catcher')
})

test('stationEntityIconSvg returns a self-contained SVG per kind', () => {
    for (const kind of stationEntityIconKinds) {
        const svg = stationEntityIconSvg(kind)
        expect(svg.startsWith('<svg ')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).toContain('viewBox="0 0 256 256"')
        expect(svg).toContain('aria-label=')
        expect(svg).not.toContain('data-station-entity')
    }
})

test('stationEntityIconSvg respects size option', () => {
    const svg = stationEntityIconSvg('hub', {size: 24})
    expect(svg).toContain('width="24"')
    expect(svg).toContain('height="24"')
})

test('stationEntityIcon creates an inline group scaled from the 256 canvas', () => {
    const svg = stationEntityIcon('factory', {x: 10, y: 20, size: 32})
    expect(svg.startsWith('<g ')).toBe(true)
    expect(svg).toContain('translate(10 20) scale(0.125)')
    expect(svg).toContain('data-station-entity="factory"')
})

test('stationEntityIconBody emits visible shape geometry', () => {
    for (const kind of stationEntityIconKinds) {
        const body = stationEntityIconBody(kind)
        expect(body.length).toBeGreaterThan(120)
        expect(body).toContain('stroke="#070712"')
    }
})
