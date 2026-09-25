import {describe, expect, test} from 'bun:test'
import {
    ITEM_BEAM,
    ITEM_ENGINE_T1,
    ITEM_ORE_T1,
    ITEM_PLATE,
    ITEM_PLATE_T2,
    ITEM_PROSPECTOR_T1A_PACKED,
    ITEM_PROSPECTOR_T2A_PACKED,
    ITEM_PROSPECTOR_T2B_PACKED,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_STORAGE_T1,
} from './item-ids'
import {getComponents} from './catalog'
import {getRecipe} from './recipes-runtime'
import {completeComponentSet, getComponentProcess} from './component-process'
import {resolveItem} from '../resolution/resolve-item'

function inputsOf(itemId: number) {
    const recipe = getRecipe(itemId)
    if (!recipe) throw new Error(`no recipe for ${itemId}`)
    return recipe.inputs
}

describe('component process', () => {
    test('every component at every tier is refined or machined, five of each per tier', () => {
        const tiers = new Set(getComponents().map((item) => item.tier))
        for (const tier of tiers) {
            const kinds = getComponents({tier}).map((item) => getComponentProcess(item.id))
            expect(kinds.filter((k) => k === 'refined').length).toBe(5)
            expect(kinds.filter((k) => k === 'machined').length).toBe(5)
        }
    })

    test('the refined five are the single-resource components', () => {
        const refined = getComponents({tier: 1})
            .filter((item) => getComponentProcess(item.id) === 'refined')
            .map((item) => item.name)
            .sort()
        expect(refined).toEqual(['Ceramic', 'Plasma Cell', 'Plate', 'Polymer', 'Sensor'])
    })

    test('the kind holds across tiers', () => {
        expect(getComponentProcess(ITEM_PLATE)).toBe('refined')
        expect(getComponentProcess(ITEM_PLATE_T2)).toBe('refined')
        expect(getComponentProcess(ITEM_BEAM)).toBe('machined')
    })

    test('non-components and unknown ids have no kind', () => {
        expect(getComponentProcess(ITEM_ORE_T1)).toBeUndefined()
        expect(getComponentProcess(ITEM_ENGINE_T1)).toBeUndefined()
        expect(getComponentProcess(ITEM_ROUSTABOUT_T1A_PACKED)).toBeUndefined()
        expect(getComponentProcess(65535)).toBeUndefined()
    })

    test('resolveItem carries the kind for components only', () => {
        expect(resolveItem(ITEM_BEAM).process).toBe('machined')
        expect(resolveItem(ITEM_PLATE_T2).process).toBe('refined')
        expect(resolveItem(ITEM_ORE_T1).process).toBeUndefined()
    })
})

describe('completeComponentSet', () => {
    test('recognises the hull First and Second step recipes', () => {
        expect(completeComponentSet(inputsOf(ITEM_ROUSTABOUT_T1A_PACKED))).toEqual({
            process: 'refined',
            tier: 1,
            quantity: 200,
        })
        expect(completeComponentSet(inputsOf(ITEM_PROSPECTOR_T1A_PACKED))).toEqual({
            process: 'machined',
            tier: 1,
            quantity: 100,
        })
        expect(completeComponentSet(inputsOf(ITEM_PROSPECTOR_T2A_PACKED))).toEqual({
            process: 'refined',
            tier: 2,
            quantity: 200,
        })
        expect(completeComponentSet(inputsOf(ITEM_PROSPECTOR_T2B_PACKED))).toEqual({
            process: 'machined',
            tier: 2,
            quantity: 150,
        })
    })

    test('a mixed module recipe is not a complete set', () => {
        expect(completeComponentSet(inputsOf(ITEM_STORAGE_T1))).toBeNull()
    })

    test('unequal quantities keep the set but drop the shared quantity', () => {
        const inputs = inputsOf(ITEM_ROUSTABOUT_T1A_PACKED).map((input, index) =>
            index === 0 ? {...input, quantity: 50} : input
        )
        expect(completeComponentSet(inputs)).toEqual({process: 'refined', tier: 1, quantity: null})
    })

    test('one machined part among four refined is not a set', () => {
        const inputs = inputsOf(ITEM_ROUSTABOUT_T1A_PACKED).map((input, index) =>
            index === 0 ? {...input, itemId: ITEM_BEAM} : input
        )
        expect(completeComponentSet(inputs)).toBeNull()
    })

    test('a repeated family is not a set', () => {
        const inputs = inputsOf(ITEM_ROUSTABOUT_T1A_PACKED).map((input) => ({
            ...input,
            itemId: ITEM_PLATE,
        }))
        expect(completeComponentSet(inputs)).toBeNull()
    })

    test('mixed tiers are not a set', () => {
        const inputs = inputsOf(ITEM_ROUSTABOUT_T1A_PACKED).map((input, index) =>
            index === 0 ? {...input, itemId: ITEM_PLATE_T2} : input
        )
        expect(completeComponentSet(inputs)).toBeNull()
    })
})
