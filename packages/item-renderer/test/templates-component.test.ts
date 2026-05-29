import {expect, test} from 'bun:test'
import {resolveItem} from '@shipload/sdk'
import {renderComponent} from '../src/templates/component.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

test('matches the committed Plate snapshot', async () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderComponent(item, resolved)
    expect(svg).toMatchSnapshot('component-plate.svg')
})

test('renderComponent ranges mode shows stat abbreviations with no values', () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id)
    const svg = renderComponent(item, resolved, {mode: 'ranges'})
    expect(svg).toContain('STR')
    expect(svg).toContain('DEN')
    expect(svg).not.toMatch(/>\d{3}<\/text>/)
    expect(svg).not.toContain('COMPONENT')
    expect(svg).toContain('Mass')
})

test('renderComponent omits the Type row', () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderComponent(item, resolved)
    expect(svg).not.toContain('COMPONENT')
    expect(svg).not.toContain('Type')
})

test('renderComponent values mode (default) still shows concrete numbers', () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id, item.stats)
    const svg = renderComponent(item, resolved)
    expect(svg).toMatch(/>\d+<\/text>/)
})

test('renderComponent ranges mode matches snapshot', () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id)
    const svg = renderComponent(item, resolved, {mode: 'ranges'})
    expect(svg).toMatchSnapshot('component-ranges')
})

test('renders tier suffix in the item name', () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderComponent(item, resolved)
    expect(svg).toContain('Plate')
    expect(svg).toContain('<tspan')
    expect(svg).toMatch(/>\s*T1<\/tspan>/)
    expect(svg).not.toContain('Plate (T1)')
})

test('renders Location row when location is provided', () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderComponent(item, resolved, {location: {x: 12, y: -7}})
    expect(svg).toContain('Location')
    expect(svg).toContain('12, -7')
})

test('omits Location row when location is absent', () => {
    const item = FIXTURES.plate
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderComponent(item, resolved)
    expect(svg).not.toContain('Location')
})
