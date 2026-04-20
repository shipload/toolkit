import { expect, test } from 'bun:test'
import { resolveItem } from '@shipload/sdk'
import { renderItem, renderFromPayload } from '../src/render.ts'
import { RenderError } from '../src/errors.ts'
import { encodePayload } from '../src/payload/codec.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

test('renderItem dispatches to resource template for resources', () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderItem(item, resolved)
  expect(svg).toContain('Iron')
})

test('renderItem dispatches to packed entity template for entities', () => {
  const item = FIXTURES.shipT1TwoModules
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderItem(item, resolved)
  expect(svg).toContain('HULL')
})

test('renderItem throws RenderError for unsupported types (v1)', () => {
  const item = FIXTURES.iron
  const fake = { ...resolveItem(item.item_id, item.stats, item.modules), itemType: 'module' as const }
  expect(() => renderItem(item, fake)).toThrow(RenderError)
})

test('renderFromPayload round-trips a payload into SVG', async () => {
  const payload = encodePayload(FIXTURES.iron)
  const { svg, item } = await renderFromPayload(payload)
  expect(svg).toContain('Iron')
  expect(item.itemType).toBe('resource')
})
