import {describe, expect, test} from 'bun:test'
import {
    computeCraftedOutputStats,
    decodeStats,
    encodeStats,
    getCarriedItemStatSlots,
    getItemStatSlots,
    usedInputStatKeys,
} from './crafting'
import {
    ITEM_BUILDER_T1,
    ITEM_ENGINE_T1,
    ITEM_HAULER_T1,
    ITEM_HAULER_T2,
    ITEM_ORE_T1,
    ITEM_PLATE,
    ITEM_RESIN_T2,
    ITEM_RESONATOR_T2,
} from '../data/item-ids'

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

    test('a module slot fed by one resource stat plus the mean is carried, not held', () => {
        const slots = getItemStatSlots(ITEM_ENGINE_T1)
        expect(slots.map((s) => s.label)).toEqual(['Volatility', 'Volatility'])
        expect(slots.every((s) => !s.meanHeld)).toBe(true)
        expect(getCarriedItemStatSlots(ITEM_ENGINE_T1)).toHaveLength(2)
    })

    test('resource stats are never mean-held', () => {
        expect(getItemStatSlots(ITEM_ORE_T1).every((s) => !s.meanHeld)).toBe(true)
    })
})

describe('computeCraftedOutputStats donor slots', () => {
    test('a T2 Tractor Beam reads each slot of its T1 donor by position, though two share a stat name', () => {
        const part = BigInt(encodeStats([213, 500, 500, 213, 213, 213]).toString())
        const donor = BigInt(encodeStats([500, 500, 100]).toString())
        const stats = computeCraftedOutputStats(ITEM_HAULER_T2, [
            {
                itemId: ITEM_RESONATOR_T2,
                category: undefined,
                stacks: [{quantity: 300, stats: part}],
            },
            {itemId: ITEM_RESIN_T2, category: undefined, stacks: [{quantity: 300, stats: part}]},
            {itemId: ITEM_HAULER_T1, category: undefined, stacks: [{quantity: 1, stats: donor}]},
        ])
        expect(decodeStats(BigInt(stats.toString()), 3)).toEqual([500, 500, 300])
    })
})
