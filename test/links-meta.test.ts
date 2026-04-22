import { expect, test } from 'bun:test'
import { resolveItem } from '@shipload/sdk'
import { linkToItemImage, linkToItemPage } from '../src/links.ts'
import { itemPageMeta } from '../src/meta.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

test('linkToItemPage defaults to shiploadgame.com', () => {
  const url = linkToItemPage(FIXTURES.iron)
  expect(url).toMatch(/^https:\/\/shiploadgame\.com\/guide\/item\/[A-Za-z0-9_-]+$/)
})

test('linkToItemPage accepts a custom base URL', () => {
  const url = linkToItemPage(FIXTURES.iron, 'http://localhost:5173')
  expect(url.startsWith('http://localhost:5173/guide/item/')).toBe(true)
})

test('linkToItemImage builds a PNG URL', () => {
  const url = linkToItemImage(FIXTURES.iron, 'png')
  expect(url).toMatch(/^https:\/\/item\.shiploadgame\.com\/item\/[A-Za-z0-9_-]+\.png$/)
})

test('linkToItemImage builds an SVG URL', () => {
  const url = linkToItemImage(FIXTURES.iron, 'svg')
  expect(url).toMatch(/\.svg$/)
})

test('itemPageMeta produces title, description, and ogImage', () => {
  const item = FIXTURES.iron
  const resolved = resolveItem(item.item_id, item.stats, item.modules)
  const meta = itemPageMeta(item, resolved)
  expect(meta.title).toContain('Iron')
  expect(meta.description.length).toBeGreaterThan(0)
  expect(meta.ogImage).toMatch(/^https:\/\/item\.shiploadgame\.com\/item\/[A-Za-z0-9_-]+\.png$/)
  expect(meta.ogImageWidth).toBe(1200)
  expect(meta.ogImageHeight).toBe(630)
})
