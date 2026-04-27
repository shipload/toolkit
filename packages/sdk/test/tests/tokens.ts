import {assert} from 'chai'
import {
    type CategoryIconShape,
    categoryIconShapes,
    ITEM_ENGINE_T1,
    ITEM_HULL_PLATES,
    ITEM_SHIP_T1_PACKED,
    itemAbbreviations,
    tierLabels,
} from '../../src'

suite('tokens', () => {
    suite('tierLabels', () => {
        test('covers all tiers with expected names', () => {
            assert.equal(tierLabels[1], 'Common')
            assert.equal(tierLabels[2], 'Uncommon')
            assert.equal(tierLabels[3], 'Rare')
            assert.equal(tierLabels[4], 'Epic')
            assert.equal(tierLabels[5], 'Legendary')
        })
    })

    suite('categoryIconShapes', () => {
        test('maps each resource category to a shape name', () => {
            assert.equal(categoryIconShapes.ore, 'hex')
            assert.equal(categoryIconShapes.crystal, 'diamond')
            assert.equal(categoryIconShapes.gas, 'circle')
            assert.equal(categoryIconShapes.regolith, 'square')
            assert.equal(categoryIconShapes.biomass, 'star')
        })

        test('CategoryIconShape type accepts the five known values', () => {
            const shapes: CategoryIconShape[] = ['hex', 'diamond', 'star', 'circle', 'square']
            assert.equal(shapes.length, 5)
        })
    })

    suite('itemAbbreviations', () => {
        test('covers known components, modules, and entities', () => {
            assert.equal(itemAbbreviations[ITEM_HULL_PLATES], 'HP')
            assert.equal(itemAbbreviations[ITEM_ENGINE_T1], 'EN')
            assert.equal(itemAbbreviations[ITEM_SHIP_T1_PACKED], 'SH')
        })
    })
})
