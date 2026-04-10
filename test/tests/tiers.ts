import {assert} from 'chai'
import {itemTier, itemOffset, isRelatedItem, isCraftedItem, itemCategory} from '$lib'

suite('tier utilities', function () {
    test('itemTier returns tier from item ID', function () {
        assert.equal(itemTier(10001), 1)
        assert.equal(itemTier(10100), 1)
        assert.equal(itemTier(10200), 1)
        assert.equal(itemTier(20001), 2)
        assert.equal(itemTier(20200), 2)
        assert.equal(itemTier(30001), 3)
    })

    test('itemTier returns 0 for raw resources', function () {
        assert.equal(itemTier(26), 0)
        assert.equal(itemTier(1000), 0)
    })

    test('itemOffset returns offset within tier', function () {
        assert.equal(itemOffset(10001), 1)
        assert.equal(itemOffset(10100), 100)
        assert.equal(itemOffset(10200), 200)
        assert.equal(itemOffset(20001), 1)
        assert.equal(itemOffset(20200), 200)
    })

    test('itemCategory classifies crafted items', function () {
        assert.equal(itemCategory(10001), 'component')
        assert.equal(itemCategory(10100), 'module')
        assert.equal(itemCategory(10200), 'entity')
        assert.equal(itemCategory(20001), 'component')
        assert.equal(itemCategory(20200), 'entity')
        assert.equal(itemCategory(26), 'resource')
    })

    test('isRelatedItem matches same offset across tiers', function () {
        assert.isTrue(isRelatedItem(10001, 20001))
        assert.isTrue(isRelatedItem(10200, 20200))
        assert.isFalse(isRelatedItem(10001, 10002))
        assert.isFalse(isRelatedItem(10001, 10100))
    })

    test('isCraftedItem checks >= 10000', function () {
        assert.isFalse(isCraftedItem(26))
        assert.isTrue(isCraftedItem(10001))
        assert.isTrue(isCraftedItem(20001))
    })
})
