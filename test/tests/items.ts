import {assert} from 'chai'
import {getItem, getItems, itemIds} from 'src/items'
import {ITEM_CARGO_LINING, ITEM_CONTAINER_T1_PACKED, ITEM_ENGINE_T1} from '../../src/data/recipes'

suite('items', function () {
    suite('getItem', function () {
        test('returns item for valid id', function () {
            const item = getItem(101)
            assert.isDefined(item)
            assert.equal(Number(item.id), 101)
        })

        test('throws error for invalid item id', function () {
            assert.throws(() => {
                getItem(60000)
            }, 'Item with id 60000 not found')
        })

        test('falls back to component definition for component id', function () {
            const item = getItem(ITEM_CARGO_LINING)
            assert.equal(item.name, 'Cargo Lining')
            assert.equal(Number(item.id), ITEM_CARGO_LINING)
            assert.isTrue(item.mass.toNumber() > 0)
        })

        test('falls back to entity recipe for packed-entity id', function () {
            const item = getItem(ITEM_CONTAINER_T1_PACKED)
            assert.equal(item.name, 'Container')
            assert.equal(Number(item.id), ITEM_CONTAINER_T1_PACKED)
            // Entity mass should be positive (sum of component masses)
            assert.isTrue(item.mass.toNumber() > 0)
        })

        test('falls back to module recipe for module id', function () {
            const item = getItem(ITEM_ENGINE_T1)
            assert.equal(item.name, 'Engine')
            assert.equal(Number(item.id), ITEM_ENGINE_T1)
            assert.isTrue(item.mass.toNumber() > 0)
        })
    })

    suite('getItems', function () {
        test('returns all items', function () {
            const items = getItems()
            assert.isArray(items)
            assert.equal(items.length, itemIds.length)
        })
    })

    suite('itemIds', function () {
        test('contains valid item ids', function () {
            assert.isArray(itemIds)
            assert.isTrue(itemIds.length > 0)
            assert.isTrue(itemIds.some((id) => Number(id) === 101))
        })
    })
})
