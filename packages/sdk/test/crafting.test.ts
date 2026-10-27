import {expect, test} from 'bun:test'
import {
    computeCraftedOutputStats,
    computeEntityStats,
    decodeCraftedItemStats,
    encodeStats,
    getItemStatSlots,
} from '../src/derivation/crafting'
import {getAllRecipes} from '../src/derivation/recipe-usage'
import {
    ITEM_ENGINE_T1,
    ITEM_PLASMA_CELL,
    ITEM_PLATE_T2,
    ITEM_PROSPECTOR_T1A_PACKED,
    ITEM_PROSPECTOR_T2A_PACKED,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_SENSOR,
    ITEM_SHIP_T1_PACKED,
} from '../src/data/item-ids'

test('decodeCraftedItemStats preserves the legacy Ship T1 hull layout without a recipe', () => {
    expect(decodeCraftedItemStats(ITEM_SHIP_T1_PACKED, encodeStats([500, 400, 0, 0]))).toEqual({
        strength: 500,
        density: 400,
    })
})

test('computeEntityStats carries the donor hull and wakes channels 4 and 5 from Plasma Cell and Sensor', () => {
    const stats = computeEntityStats(ITEM_PROSPECTOR_T1A_PACKED, {
        [ITEM_PLASMA_CELL]: [{quantity: 300, stats: {volatility: 400}}],
        [ITEM_SENSOR]: [{quantity: 300, stats: {conductivity: 300}}],
        [ITEM_ROUSTABOUT_T1A_PACKED]: [{quantity: 1, stats: {strength: 800}}],
    })
    const value = (key: string) => stats.find((s) => s.key === key)!.value
    expect(value('strength')).toBe(800)
    expect(value('volatility')).toBe(400)
    expect(value('conductivity')).toBe(300)
})

test('computeEntityStats blends a T2 First step 50/50 with the donor hull', () => {
    const stats = computeEntityStats(ITEM_PROSPECTOR_T2A_PACKED, {
        [ITEM_PLATE_T2]: [{quantity: 350, stats: {strength: 400}}],
        [ITEM_PROSPECTOR_T1A_PACKED]: [{quantity: 1, stats: {strength: 800}}],
    })
    expect(stats.find((s) => s.key === 'strength')!.value).toBe(600)
})

test('computeCraftedOutputStats averages a multi-source slot with empty blendWeights', () => {
    // empty blendWeights means equal weights: average every source, not just the first
    const out = computeCraftedOutputStats(ITEM_PROSPECTOR_T2A_PACKED, [
        {
            itemId: ITEM_PLATE_T2,
            category: undefined,
            stacks: [{quantity: 350, stats: encodeStats([400])}],
        },
        {
            itemId: ITEM_PROSPECTOR_T1A_PACKED,
            category: undefined,
            stacks: [{quantity: 1, stats: encodeStats([800])}],
        },
    ])
    const decoded = decodeCraftedItemStats(ITEM_PROSPECTOR_T2A_PACKED, BigInt(out.toString()))
    expect(decoded['strength']).toBe(600)
})

test('computeCraftedOutputStats agrees with computeEntityStats for the donor blend', () => {
    const viaEntity = computeEntityStats(ITEM_PROSPECTOR_T2A_PACKED, {
        [ITEM_PLATE_T2]: [{quantity: 350, stats: {strength: 400}}],
        [ITEM_PROSPECTOR_T1A_PACKED]: [{quantity: 1, stats: {strength: 800}}],
    })
    const viaCrafted = computeCraftedOutputStats(ITEM_PROSPECTOR_T2A_PACKED, [
        {
            itemId: ITEM_PLATE_T2,
            category: undefined,
            stacks: [{quantity: 350, stats: encodeStats([400])}],
        },
        {
            itemId: ITEM_PROSPECTOR_T1A_PACKED,
            category: undefined,
            stacks: [{quantity: 1, stats: encodeStats([800])}],
        },
    ])
    const decoded = decodeCraftedItemStats(
        ITEM_PROSPECTOR_T2A_PACKED,
        BigInt(viaCrafted.toString())
    )
    for (const {key, value} of viaEntity) {
        if (!key) continue
        expect(decoded[key]).toBe(value)
    }
})

test('getItemStatSlots drops a source held at the mean from the label', () => {
    const slots = getItemStatSlots(ITEM_ENGINE_T1)
    expect(slots.map((s) => s.label)).toEqual(['Thermal', 'Reactivity'])
})

test('getItemStatSlots keeps a single-source slot to its one stat', () => {
    const slots = getItemStatSlots(ITEM_PLASMA_CELL)
    expect(slots.map((s) => s.label)).toEqual(['Volatility', 'Reactivity', 'Thermal'])
})

test('getItemStatSlots leads each slot with the stat that keys it', () => {
    for (const recipe of getAllRecipes()) {
        for (const slot of getItemStatSlots(recipe.outputItemId)) {
            if (!slot.sources.some((s) => s.key === slot.key)) continue
            expect(slot.sources[0].key, String(recipe.outputItemId)).toBe(slot.key)
        }
    }
})
