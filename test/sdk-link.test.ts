import { expect, test } from 'bun:test'
import { resolveItem, ServerContract, type ResolvedItem } from '@shipload/sdk'

test('sdkv2 is linked and exposes resolveItem + ResolvedItem type', () => {
  const resolved: ResolvedItem = resolveItem(26 /* Iron */, undefined, undefined)
  expect(resolved.itemId).toBe(26)
  expect(resolved.name).toBe('Iron')
  expect(resolved.itemType).toBe('resource')
})

test('ServerContract.Types.cargo_item can be constructed', () => {
  const ci = ServerContract.Types.cargo_item.from({
    item_id: 26,
    quantity: 1,
    stats: '0',
    modules: [],
  })
  expect(ci.item_id.equals(26)).toBe(true)
})
