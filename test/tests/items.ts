import {assert} from 'chai'
import {getItem, getItems, itemIds} from 'src/items'

suite('items', function () {
    suite('getItem', function () {
        test('returns item for valid id', function () {
            const item = getItem(1)
            assert.isDefined(item)
            assert.equal(Number(item.id), 1)
        })

        test('throws error for invalid item id', function () {
            assert.throws(() => {
                getItem(999)
            }, 'Item with id 999 not found')
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
            assert.isTrue(itemIds.some((id) => Number(id) === 1))
        })
    })
})
