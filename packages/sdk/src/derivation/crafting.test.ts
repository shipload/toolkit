import {describe, expect, test} from 'bun:test'
import {getCarriedItemStatSlots, getItemStatSlots, usedInputStatKeys} from './crafting'
import {ITEM_BUILDER_T1, ITEM_ENGINE_T1, ITEM_ORE_T1, ITEM_PLATE} from '../data/item-ids'

describe('usedInputStatKeys', () => {
    test('maps each input to the stat keys the blend actually consumes', () => {
        expect(usedInputStatKeys(ITEM_BUILDER_T1)).toEqual([
            ['hardness', 'fineness'],
            ['saturation'],
        ])
    })

    test('returns an empty array for an unknown recipe', () => {
        expect(usedInputStatKeys(999999)).toEqual([])
    })
})

describe('getItemStatSlots mean-held slots', () => {
    test('a component carries only the stat it takes from its resource', () => {
        const slots = getItemStatSlots(ITEM_PLATE)
        expect(slots.filter((s) => !s.meanHeld).map((s) => s.key)).toEqual(['strength'])
        expect(slots.filter((s) => s.meanHeld).map((s) => s.key)).toEqual(['tolerance', 'density'])
        expect(getCarriedItemStatSlots(ITEM_PLATE).map((s) => s.key)).toEqual(['strength'])
    })

    test('a module hides the slot that traces to a mean-held component stat', () => {
        expect(getCarriedItemStatSlots(ITEM_ENGINE_T1).map((s) => s.key)).toEqual(['thermal'])
        expect(getItemStatSlots(ITEM_ENGINE_T1).map((s) => s.key)).toEqual([
            'thermal',
            'reactivity',
        ])
    })

    test('resource stats are never mean-held', () => {
        expect(getItemStatSlots(ITEM_ORE_T1).every((s) => !s.meanHeld)).toBe(true)
    })
})
