import {expect, test} from 'bun:test'
import {resolveItem, getStatDefinitions} from '@shipload/sdk'
import {renderResource} from '../src/templates/resource.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

test('renders Crude Ore with mass and three stat bars', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toContain('Crude Ore')
    expect(svg).toContain('1 t') // mass
    expect(svg).toContain('STR') // strength abbreviation
    expect(svg).toContain('TOL')
    expect(svg).toContain('DEN')
})

test('renderResource does not render a Category row', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).not.toContain('Category')
})

test('badge shows stack tonnage when stack > 1', () => {
    const item = FIXTURES.oreT1StackOf50
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toContain('50 t') // 50 units × 1 t = 50 t total
    expect(svg).not.toContain('×50') // resources read in tonnes, not a count
})

test('badge shows tonnage (1 t) when stack == 1', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toContain('1 t')
})

test('resource card has no standalone Mass row (tonnage is in the badge)', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).not.toContain('Mass')
})

test('matches the committed Crude Ore snapshot', async () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toMatchSnapshot('resource-ore-t1.svg')
})

test('matches the committed Dense Gas snapshot', async () => {
    const item = FIXTURES.gasT2
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toMatchSnapshot('resource-gas-t2.svg')
})

test('renderResource ranges mode shows stat abbreviations with no values', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id)
    const svg = renderResource(item, resolved, {mode: 'ranges'})
    const defs = getStatDefinitions(resolved.category!)
    for (const def of defs) {
        expect(svg).toContain(def.abbreviation)
    }
    expect(svg).not.toMatch(/>\d{3}<\/text>/)
    expect(svg).toContain('1 t') // stack tonnage still shown in the badge
})

test('renderResource values mode (default) still shows concrete numbers', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats)
    const svg = renderResource(item, resolved)
    expect(svg).toMatch(/>\d+<\/text>/)
})

test('renderResource ranges mode matches snapshot', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id)
    const svg = renderResource(item, resolved, {mode: 'ranges'})
    expect(svg).toMatchSnapshot('resource-ranges')
})

test('renders tier suffix in the item name', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toContain('Crude Ore (T1)')
})

test('renders Location row when location is provided', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved, {location: {x: -64, y: -10}})
    expect(svg).toContain('Location')
    expect(svg).toContain('-64, -10')
})

test('omits Location row when location is absent', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).not.toContain('Location')
})

test('matches snapshot when location is provided', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved, {location: {x: -64, y: -10}})
    expect(svg).toMatchSnapshot('resource-ore-t1-with-location.svg')
})
