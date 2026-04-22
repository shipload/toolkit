import {assert} from 'chai'
import {tierLabels, categoryIconShapes, type CategoryIconShape, itemAbbreviations, ITEM_HULL_PLATES, ITEM_SHIP_T1_PACKED, ITEM_ENGINE_T1} from '../../src'

suite('tokens', function () {
    suite('tierLabels', function () {
        test('covers all tiers with expected names', function () {
            assert.equal(tierLabels.t1, 'Common')
            assert.equal(tierLabels.t2, 'Uncommon')
            assert.equal(tierLabels.t3, 'Rare')
            assert.equal(tierLabels.t4, 'Epic')
            assert.equal(tierLabels.t5, 'Legendary')
        })
    })

    suite('categoryIconShapes', function () {
        test('maps each resource category to a shape name', function () {
            assert.equal(categoryIconShapes.metal, 'hex')
            assert.equal(categoryIconShapes.precious, 'diamond')
            assert.equal(categoryIconShapes.gas, 'circle')
            assert.equal(categoryIconShapes.mineral, 'square')
            assert.equal(categoryIconShapes.organic, 'star')
        })

        test('CategoryIconShape type accepts the five known values', function () {
            const shapes: CategoryIconShape[] = ['hex', 'diamond', 'star', 'circle', 'square']
            assert.equal(shapes.length, 5)
        })
    })

    suite('itemAbbreviations', function () {
        test('covers known components, modules, and entities', function () {
            assert.equal(itemAbbreviations[ITEM_HULL_PLATES], 'HP')
            assert.equal(itemAbbreviations[ITEM_ENGINE_T1], 'EN')
            assert.equal(itemAbbreviations[ITEM_SHIP_T1_PACKED], 'SH')
        })
    })
})
