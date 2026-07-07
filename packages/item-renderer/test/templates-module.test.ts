import {test, expect} from 'bun:test'
import {resolveItem} from '@shipload/sdk'
import {renderModule} from '../src/templates/module.ts'
import {tokens} from '../src/tokens/index.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

const CASES = [
    'engineT1',
    'generatorT1',
    'gathererT1',
    'loaderT1',
    'crafterT1',
    'storageT1',
    'haulerT1',
] as const

for (const name of CASES) {
    test(`matches the committed ${name} snapshot`, async () => {
        const item = FIXTURES[name]
        const resolved = resolveItem(item.item_id, item.stats, item.modules)
        const svg = renderModule(item, resolved)
        expect(svg).toMatchSnapshot(`module-${name}.svg`)
    })
}

test('Engine values mode renders the capability header + prose narrative', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('ENGINE')
    expect(svg).toContain('thrust for travel')
    expect(svg).toContain('700')
    expect(svg).toContain('>90</tspan>')
})

test('Engine template renders the module icon in the header', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('data-module="engine"')
    expect(svg).not.toContain('>00</text>')
})

test('Engine prose highlights numbers in white, never gold', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain(tokens.colors.text.primary)
    expect(svg).not.toContain(tokens.colors.text.accent)
    expect(svg).not.toContain('#f4c96b')
})

test('Hauler template renders its capability prose', () => {
    const item = FIXTURES.haulerT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('HAULING')
    expect(svg).toContain('locks onto')
})

test('renderModule ranges mode shows capability header without narrative or values', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id)
    const svg = renderModule(item, resolved, {mode: 'ranges'})
    expect(svg).toContain('ENGINE')
    expect(svg).not.toContain('thrust for travel')
    expect(svg).not.toMatch(/>\d{3,}<\/(text|tspan)>/)
})

test('renderModule omits the Type row', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).not.toContain('MODULE · T1')
})

test('renderModule values mode (default) shows prose with concrete numbers', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('thrust for travel')
    expect(svg).toContain('700')
})

test('renderModule ranges mode matches snapshot', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id)
    const svg = renderModule(item, resolved, {mode: 'ranges'})
    expect(svg).toMatchSnapshot('module-ranges')
})

test('renders tier suffix in the module name', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('<tspan')
    expect(svg).toMatch(/>\s*T1<\/tspan>/)
    expect(svg).not.toContain('(T1)')
})

test('renders Location row when location is provided', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved, {location: {x: 22, y: 8}})
    expect(svg).toContain('Location')
    expect(svg).toContain('22, 8')
})

test('omits Location row when location is absent', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).not.toContain('Location')
})
