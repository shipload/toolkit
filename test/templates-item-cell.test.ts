import { test, expect } from 'bun:test'
import { resolveItem } from '@shipload/sdk'
import { ITEM_HULL_PLATES, ITEM_ENGINE_T1, ITEM_SHIP_T1_PACKED } from '@shipload/sdk'
import { renderItemCell, itemCellGroup } from '../src/templates/item-cell.ts'

test('renderItemCell returns a self-contained <svg>', () => {
  const resolved = resolveItem(ITEM_HULL_PLATES)
  const svg = renderItemCell({ resolved, size: 48 })
  expect(svg.startsWith('<svg ')).toBe(true)
  expect(svg).toContain('viewBox="0 0 48 48"')
  expect(svg.endsWith('</svg>')).toBe(true)
})

test('component cell renders abbreviation', () => {
  const resolved = resolveItem(ITEM_HULL_PLATES)
  const svg = renderItemCell({ resolved, size: 48 })
  expect(svg).toContain('>HP<')
})

test('module cell renders abbreviation', () => {
  const resolved = resolveItem(ITEM_ENGINE_T1)
  const svg = renderItemCell({ resolved, size: 48 })
  expect(svg).toContain('>EN<')
})

test('entity cell renders abbreviation', () => {
  const resolved = resolveItem(ITEM_SHIP_T1_PACKED)
  const svg = renderItemCell({ resolved, size: 48 })
  expect(svg).toContain('>SH<')
})

test('resource cell renders category icon (no abbreviation)', () => {
  const resolved = resolveItem(26)
  const svg = renderItemCell({ resolved, size: 48 })
  expect(svg).not.toMatch(/>[A-Z]{2,3}</)
  expect(svg).toMatch(/<(polygon|circle|rect)\b/)
})

test('quantity badge appears when quantity > 1', () => {
  const resolved = resolveItem(ITEM_HULL_PLATES)
  const svg = renderItemCell({ resolved, quantity: 42, size: 48 })
  expect(svg).toContain('×42')
})

test('no quantity badge when quantity is 1 or omitted', () => {
  const resolved = resolveItem(ITEM_HULL_PLATES)
  const svgNoQty = renderItemCell({ resolved, size: 48 })
  const svgOne = renderItemCell({ resolved, quantity: 1, size: 48 })
  expect(svgNoQty).not.toContain('×')
  expect(svgOne).not.toContain('×')
})

test('itemCellGroup returns <g> with translate, no <svg> wrapper', () => {
  const resolved = resolveItem(ITEM_HULL_PLATES)
  const g = itemCellGroup({ resolved, size: 48, x: 100, y: 200 })
  expect(g.startsWith('<g ')).toBe(true)
  expect(g).toContain('transform="translate(100, 200)"')
  expect(g.startsWith('<svg')).toBe(false)
})

test('tier border uses SDK tierColors for the resolved tier', () => {
  const resolved = resolveItem(ITEM_HULL_PLATES)
  const svg = renderItemCell({ resolved, size: 48 })
  expect(svg).toContain('#8b8b8b')
})

test('abbreviation cell uses proportional font size for different sizes', () => {
  const resolved = resolveItem(ITEM_HULL_PLATES)
  const svg28 = renderItemCell({ resolved, size: 28 })
  const svg80 = renderItemCell({ resolved, size: 80 })
  expect(svg28).toContain('font-size="10"')
  expect(svg80).toContain('font-size="29"')
})

test('matches golden SVG snapshot per itemType', () => {
  const cases: [number, string][] = [
    [26, 'item-cell-resource'],
    [ITEM_HULL_PLATES, 'item-cell-component'],
    [ITEM_ENGINE_T1, 'item-cell-module'],
    [ITEM_SHIP_T1_PACKED, 'item-cell-entity'],
  ]
  for (const [id, name] of cases) {
    const svg = renderItemCell({ resolved: resolveItem(id), quantity: 3, size: 48 })
    expect(svg).toMatchSnapshot(name)
  }
})
