import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {
    type CategoryIconShape,
    categoryIconShapes,
    ITEM_ENGINE_T1,
    ITEM_HULL_PLATES,
    ITEM_SHIP_T1_PACKED,
    itemAbbreviations,
    tierAdjective,
} from '../../src'

describe('tokens', () => {
    describe('tierAdjective', () => {
        test('covers all 10 tiers with the canonical adjective sequence', () => {
            assert.equal(tierAdjective(1), 'Crude')
            assert.equal(tierAdjective(2), 'Dense')
            assert.equal(tierAdjective(3), 'Pure')
            assert.equal(tierAdjective(4), 'Prime')
            assert.equal(tierAdjective(5), 'Pristine')
            assert.equal(tierAdjective(6), 'Radiant')
            assert.equal(tierAdjective(7), 'Exotic')
            assert.equal(tierAdjective(8), 'Mythic')
            assert.equal(tierAdjective(9), 'Cosmic')
            assert.equal(tierAdjective(10), 'Ascendant')
        })

        test('falls back to T-prefixed string for out-of-range tiers', () => {
            assert.equal(tierAdjective(0), 'T0')
            assert.equal(tierAdjective(11), 'T11')
            assert.equal(tierAdjective(99), 'T99')
        })
    })

    describe('categoryIconShapes', () => {
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

    describe('itemAbbreviations', () => {
        test('covers known components, modules, and entities', () => {
            assert.equal(itemAbbreviations[ITEM_HULL_PLATES], 'HP')
            assert.equal(itemAbbreviations[ITEM_ENGINE_T1], 'EN')
            assert.equal(itemAbbreviations[ITEM_SHIP_T1_PACKED], 'SH')
        })
    })
})
