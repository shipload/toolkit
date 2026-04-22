import { expect, test } from 'bun:test'
import { resolveItem, getStatDefinitions } from '@shipload/sdk'
import { renderResource } from '../src/templates/resource.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

test('renders Iron with category, mass, and three stat bars', () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderResource(item, resolved)
  expect(svg).toContain('Iron')
  expect(svg).toContain('Metals') // category label
  expect(svg).toContain('30,000') // mass
  expect(svg).toContain('STR') // strength abbreviation
  expect(svg).toContain('TOL')
  expect(svg).toContain('DEN')
})

test('renders quantity badge when stack > 1', () => {
  const item = FIXTURES.ironStackOf50
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderResource(item, resolved)
  expect(svg).toContain('×50')
})

test('does not render quantity badge when stack == 1', () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderResource(item, resolved)
  expect(svg).not.toContain('×')
})

test('matches the committed Iron snapshot', async () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderResource(item, resolved)
  expect(svg).toMatchSnapshot('resource-iron.svg')
})

test('matches the committed Helium snapshot', async () => {
  const item = FIXTURES.helium
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderResource(item, resolved)
  expect(svg).toMatchSnapshot('resource-helium.svg')
})

test('renderResource ranges mode shows stat abbreviations with no values', () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id)
  const svg = renderResource(item, resolved, { mode: 'ranges' })
  const defs = getStatDefinitions(resolved.category!)
  for (const def of defs) {
    expect(svg).toContain(def.abbreviation)
  }
  expect(svg).not.toMatch(/>\d{3}<\/text>/)
  expect(svg).toContain('Category')
  expect(svg).toContain('Mass')
})

test('renderResource values mode (default) still shows concrete numbers', () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id, item.stats)
  const svg = renderResource(item, resolved)
  expect(svg).toMatch(/>\d+<\/text>/)
})

test('renderResource ranges mode matches snapshot', () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id)
  const svg = renderResource(item, resolved, { mode: 'ranges' })
  expect(svg).toMatchSnapshot('resource-ranges')
})
