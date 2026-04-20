import { expect, test } from 'bun:test'
import { resolveItem } from '@shipload/sdk'
import { renderPackedEntity } from '../src/templates/packed-entity.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

test('renders Ship T1 with hull attributes and two modules', () => {
  const item = FIXTURES.shipT1TwoModules
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderPackedEntity(item, resolved)
  expect(svg).toContain('Ship T1 (Packed)')
  expect(svg).toContain('HULL')
  expect(svg).toContain('Mass')
  expect(svg).toContain('Capacity')
  expect(svg).toContain('Engine')
  expect(svg).toContain('Generator')
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

test('matches the committed Ship T1 (mixed filled/empty) snapshot', async () => {
  const item = FIXTURES.shipT1OneFilledOneEmpty
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderPackedEntity(item, resolved)
  expect(svg).toMatchSnapshot('packed-entity-ship-t1-mixed.svg')
})
