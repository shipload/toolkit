import { test, expect } from 'bun:test'
import { resolveItem } from '@shipload/sdk'
import { renderByType } from '../src/templates/index.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

test('renderByType forwards mode=ranges to resource template', () => {
  const item = FIXTURES.oreT1
  const resolved = resolveItem(item.item_id)
  const svg = renderByType(item, resolved, { mode: 'ranges' })
  // No 3-digit stat values
  expect(svg).not.toMatch(/>\d{3,}<\/text>/)
})

test('renderByType forwards mode=ranges to component template', () => {
  const item = FIXTURES.hullPlates
  const resolved = resolveItem(item.item_id)
  const svg = renderByType(item, resolved, { mode: 'ranges' })
  expect(svg).not.toMatch(/>\d{3,}<\/text>/)
  expect(svg).toContain('COMPONENT')
})

test('renderByType forwards mode=ranges to module template', () => {
  const item = FIXTURES.engineT1
  const resolved = resolveItem(item.item_id)
  const svg = renderByType(item, resolved, { mode: 'ranges' })
  expect(svg).toContain('MODULE')
})

test('renderByType default mode is values (no opts)', () => {
  const item = FIXTURES.oreT1
  const resolved = resolveItem(item.item_id, item.stats)
  const svg = renderByType(item, resolved)
  // At least one numeric stat value
  expect(svg).toMatch(/>\d+<\/text>/)
})
