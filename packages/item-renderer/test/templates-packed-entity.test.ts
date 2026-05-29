import {expect, test} from 'bun:test'
import {resolveItem} from '@shipload/sdk'
import {renderPackedEntity} from '../src/templates/packed-entity.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

test('renders Ship with hull attributes and two modules', () => {
    const item = FIXTURES.shipT1TwoModules
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderPackedEntity(item, resolved)
    expect(svg).toContain('Ship')
    expect(svg).not.toContain('(Packed)')
    expect(svg).not.toContain('(T1)')
    expect(svg).toMatch(/>\s*T1<\/tspan>/)
    expect(svg).toContain('Mass')
    expect(svg).toContain('Capacity')
    expect(svg).toContain('Engine:')
    expect(svg).toContain('Generator:')
})

test('renders empty-module rows when slots are unfilled', () => {
    const item = FIXTURES.shipT1NoModules
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderPackedEntity(item, resolved)
    expect(svg.match(/Empty module/g)?.length ?? 0).toBeGreaterThanOrEqual(1)
})

test('matches the committed Ship T1 (two modules) snapshot', async () => {
    const item = FIXTURES.shipT1TwoModules
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderPackedEntity(item, resolved)
    expect(svg).toMatchSnapshot('packed-entity-ship-t1-two-modules.svg')
})

test('matches the committed Ship T1 (only engine) snapshot', async () => {
    const item = FIXTURES.shipT1OnlyEngine
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderPackedEntity(item, resolved)
    expect(svg).toMatchSnapshot('packed-entity-ship-t1-only-engine.svg')
})

test('ship with two modules renders capability-colored prose, white highlights, no gold', () => {
    const item = FIXTURES.shipT1TwoModules
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderPackedEntity(item, resolved)
    // Capability prose labels in their capability colors.
    expect(svg).toContain('Engine:')
    expect(svg).toContain('#4a8abf')
    expect(svg).toContain('Generator:')
    expect(svg).toContain('#22c55e')
    // Prose body present, highlighted numbers white, no gold.
    expect(svg).toContain('thrust for')
    expect(svg).toContain('#e6e8ec')
    expect(svg).not.toContain('#f4c96b')
})

test('renders Location row when location is provided', () => {
    const item = FIXTURES.shipT1TwoModules
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderPackedEntity(item, resolved, {location: {x: 5, y: -3}})
    expect(svg).toContain('Location')
    expect(svg).toContain('5, -3')
})

test('omits Location row when location is absent', () => {
    const item = FIXTURES.shipT1TwoModules
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderPackedEntity(item, resolved)
    expect(svg).not.toContain('Location')
})
