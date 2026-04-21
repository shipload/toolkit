import { test, expect } from 'bun:test'
import { resolveItem } from '@shipload/sdk'
import { renderModule } from '../src/templates/module.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

const CASES = [
  'engineT1',
  'generatorT1',
  'gathererT1',
  'loaderT1',
  'crafterT1',
  'storageT1',
  'haulerT1',
] as const

for (const name of CASES) {
  test(`matches the committed ${name} snapshot`, async () => {
    const item = FIXTURES[name]
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toMatchSnapshot(`module-${name}.svg`)
  })
}

test('Engine template embeds the narrative description', () => {
  const item = FIXTURES.engineT1
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderModule(item, resolved)
  expect(svg).toContain('generates')
  expect(svg).toContain('thrust for travel')
  expect(svg).toContain('while draining')
  expect(svg).toContain('distance travelled')
})

test('Hauler template falls back to compact rows when description is null', () => {
  const item = FIXTURES.haulerT1
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const svg = renderModule(item, resolved)
  expect(svg).toContain('Hauler')
})
