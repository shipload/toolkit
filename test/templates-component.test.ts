import { expect, test } from 'bun:test'
import { resolveItem } from '@shipload/sdk'
import { renderComponent } from '../src/templates/component.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

test('matches the committed Hull Plates snapshot', async () => {
  const item = FIXTURES.hullPlates
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderComponent(item, resolved)
  expect(svg).toMatchSnapshot('component-hull-plates.svg')
})

test('renderComponent ranges mode shows stat abbreviations with no values', () => {
  const item = FIXTURES.hullPlates
  const resolved = resolveItem(item.item_id)
  const svg = renderComponent(item, resolved, { mode: 'ranges' })
  expect(svg).toContain('STR')
  expect(svg).toContain('DEN')
  expect(svg).not.toMatch(/>\d{3}<\/text>/)
  expect(svg).toContain('COMPONENT')
  expect(svg).toContain('Mass')
})

test('renderComponent values mode (default) still shows concrete numbers', () => {
  const item = FIXTURES.hullPlates
  const resolved = resolveItem(item.item_id, item.stats)
  const svg = renderComponent(item, resolved)
  expect(svg).toMatch(/>\d+<\/text>/)
})

test('renderComponent ranges mode matches snapshot', () => {
  const item = FIXTURES.hullPlates
  const resolved = resolveItem(item.item_id)
  const svg = renderComponent(item, resolved, { mode: 'ranges' })
  expect(svg).toMatchSnapshot('component-ranges')
})
