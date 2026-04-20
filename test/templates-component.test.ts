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
