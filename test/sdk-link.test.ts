import { expect, test } from 'bun:test'
import { resolveItem, ServerContract, type ResolvedItem } from '@shipload/sdk'

test('sdkv2 is linked and exposes resolveItem + ResolvedItem type', () => {
  const resolved: ResolvedItem = resolveItem(101 /* T1 Ore */, undefined, undefined)
  expect(resolved.itemId).toBe(101)
  expect(resolved.category).toBe('ore')
  expect(resolved.itemType).toBe('resource')
})

test('ServerContract.Types.cargo_item can be constructed', () => {
  const ci = ServerContract.Types.cargo_item.from({
    item_id: 101,
    quantity: 1,
    stats: '0',
    modules: [],
  })
  expect(ci.item_id.equals(101)).toBe(true)
})
