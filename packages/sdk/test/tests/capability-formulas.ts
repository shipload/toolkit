import {describe, test} from 'bun:test'
import {assert} from 'chai'

import {SLOT_FORMULAS} from '../../src/data/capability-formulas'

describe('SLOT_FORMULAS', () => {
    test('engine reads slots 0 and 1 only', () => {
        assert.deepEqual(Object.keys(SLOT_FORMULAS.engine).sort(), ['0', '1'])
        assert.equal(SLOT_FORMULAS.engine[0].attribute, 'thrust')
        assert.equal(SLOT_FORMULAS.engine[1].attribute, 'drain')
    })

    test('gatherer skips slot 2 (dead in contract)', () => {
        assert.deepEqual(Object.keys(SLOT_FORMULAS.gatherer).sort(), ['0', '1', '3', '4'])
    })

    test('storage reads only slots 0/1/2 (slot 3 still dead pre-rebalance)', () => {
        assert.deepEqual(Object.keys(SLOT_FORMULAS.storage).sort(), ['0', '1', '2'])
    })

    test('hauler reads only slots 0/1/2 (slot 3 dead, 4th attr deferred)', () => {
        assert.deepEqual(Object.keys(SLOT_FORMULAS.hauler).sort(), ['0', '1', '2'])
    })

    test('every entry has a non-empty capability and attribute', () => {
        for (const slots of Object.values(SLOT_FORMULAS)) {
            for (const consumer of Object.values(slots)) {
                assert.isString(consumer.capability)
                assert.isString(consumer.attribute)
                assert.isAbove(consumer.capability.length, 0)
                assert.isAbove(consumer.attribute.length, 0)
            }
        }
    })

    test('every populated recipe statSlot has a matching SLOT_FORMULAS entry', async () => {
        const recipesModule = await import('../../src/data/recipes.json')
        const recipes = (recipesModule.default ?? recipesModule) as Array<{
            outputItemId: number
            statSlots: Array<{sources: Array<{inputIndex: number; statIndex: number}>}>
        }>

        const KNOWN_INTERMEDIATE_LEAKS = new Set<string>(['storage|3'])

        const ITEM_ID_TO_KIND: Record<number, keyof typeof SLOT_FORMULAS> = {
            10100: 'engine',
            10101: 'generator',
            10102: 'gatherer',
            10103: 'loader',
            10104: 'crafter',
            10105: 'storage',
            10106: 'hauler',
            10107: 'warp',
            10200: 'container-t1',
            10201: 'ship-t1',
            10202: 'warehouse-t1',
            20200: 'container-t2',
        }

        for (const recipe of recipes) {
            const kind = ITEM_ID_TO_KIND[recipe.outputItemId]
            if (!kind) continue
            const formula = SLOT_FORMULAS[kind]
            for (let i = 0; i < recipe.statSlots.length; i++) {
                if (recipe.statSlots[i].sources.length === 0) continue
                if (KNOWN_INTERMEDIATE_LEAKS.has(`${kind}|${i}`)) continue
                assert.property(
                    formula,
                    String(i),
                    `recipe ${recipe.outputItemId} (${kind}) writes slot ${i} ` +
                        `but SLOT_FORMULAS doesn't read it`
                )
            }
        }
    })
})
