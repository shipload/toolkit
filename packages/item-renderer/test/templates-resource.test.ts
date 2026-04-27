import {expect, test} from 'bun:test'
import {resolveItem, getStatDefinitions} from '@shipload/sdk'
import {renderResource} from '../src/templates/resource.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

test('renders Crude Ore with category, mass, and three stat bars', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toContain('Crude Ore')
    expect(svg).toContain('Ore') // category label
    expect(svg).toContain('30,000') // mass
    expect(svg).toContain('STR') // strength abbreviation
    expect(svg).toContain('TOL')
    expect(svg).toContain('DEN')
})

test('renders quantity badge when stack > 1', () => {
    const item = FIXTURES.oreT1StackOf50
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).toContain('×50')
})

test('does not render quantity badge when stack == 1', () => {
    const item = FIXTURES.oreT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderResource(item, resolved)
    expect(svg).not.toContain('×')
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
    expect(svg).toContain('Category')
    expect(svg).toContain('Mass')
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
