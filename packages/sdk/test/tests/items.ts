import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {getItem, getItems, itemIds} from 'src/items'
import {ITEM_CARGO_LINING, ITEM_CONTAINER_T1_PACKED, ITEM_ENGINE_T1} from '$lib'

describe('items', () => {
    describe('getItem', () => {
        test('returns item for valid id', () => {
            const item = getItem(101)
            assert.isDefined(item)
            assert.equal(Number(item.id), 101)
        })

        test('throws error for invalid item id', () => {
            assert.throws(() => {
                getItem(60000)
            }, /Unknown item id/)
        })

        test('returns the component item for component id', () => {
            const item = getItem(ITEM_CARGO_LINING)
            assert.equal(item.name, 'Cargo Lining')
            assert.equal(Number(item.id), ITEM_CARGO_LINING)
            assert.isTrue(item.mass > 0)
        })

        test('returns the entity item for packed-entity id', () => {
            const item = getItem(ITEM_CONTAINER_T1_PACKED)
            assert.equal(item.name, 'Container')
            assert.equal(Number(item.id), ITEM_CONTAINER_T1_PACKED)
            assert.isTrue(item.mass > 0)
        })

        test('returns the module item for module id', () => {
            const item = getItem(ITEM_ENGINE_T1)
            assert.equal(item.name, 'Engine')
            assert.equal(Number(item.id), ITEM_ENGINE_T1)
            assert.isTrue(item.mass > 0)
        })
    })

    describe('getItems', () => {
        test('returns all items', () => {
            const items = getItems()
            assert.isArray(items)
            assert.equal(items.length, itemIds.length)
        })
    })

    describe('itemIds', () => {
        test('contains valid item ids', () => {
            assert.isArray(itemIds)
            assert.isTrue(itemIds.length > 0)
            assert.isTrue(itemIds.some((id) => Number(id) === 101))
        })
    })
})
