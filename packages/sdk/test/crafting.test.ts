import {expect, test} from 'bun:test'
import {
    computeCraftedOutputStats,
    computeEntityStats,
    decodeCraftedItemStats,
    encodeStats,
} from '../src/derivation/crafting'
import {ITEM_PROSPECTOR_T2_PACKED, ITEM_PLATE_T2, ITEM_SHIP_T1_PACKED} from '../src/data/item-ids'

test('computeEntityStats blends the donor hull 50/50 with Plate T2', () => {
    // Plate T2 strength 400; donor Ship T1 strength 800 → expect 600. density 200/400 → 300.
    const stats = computeEntityStats(ITEM_PROSPECTOR_T2_PACKED, {
        [ITEM_PLATE_T2]: [{quantity: 300, stats: {strength: 400, density: 200}}],
        [ITEM_SHIP_T1_PACKED]: [{quantity: 1, stats: {strength: 800, density: 400}}],
    })
    const str = stats.find((s) => s.key === 'strength')!.value
    const den = stats.find((s) => s.key === 'density')!.value
    expect(str).toBe(600)
    expect(den).toBe(300)
})

test('computeCraftedOutputStats averages a multi-source slot with empty blendWeights', () => {
    // empty blendWeights means equal weights: average every source, not just the first
    const out = computeCraftedOutputStats(ITEM_PROSPECTOR_T2_PACKED, [
        {
            itemId: ITEM_PLATE_T2,
            category: undefined,
            stacks: [{quantity: 300, stats: encodeStats([400, 200])}],
        },
        {
            itemId: ITEM_SHIP_T1_PACKED,
            category: undefined,
            stacks: [{quantity: 1, stats: encodeStats([800, 400])}],
        },
    ])
    const decoded = decodeCraftedItemStats(ITEM_PROSPECTOR_T2_PACKED, BigInt(out.toString()))
    expect(decoded['strength']).toBe(600)
    expect(decoded['density']).toBe(300)
})

test('computeCraftedOutputStats agrees with computeEntityStats for the donor blend', () => {
    const viaEntity = computeEntityStats(ITEM_PROSPECTOR_T2_PACKED, {
        [ITEM_PLATE_T2]: [{quantity: 300, stats: {strength: 400, density: 200}}],
        [ITEM_SHIP_T1_PACKED]: [{quantity: 1, stats: {strength: 800, density: 400}}],
    })
    const viaCrafted = computeCraftedOutputStats(ITEM_PROSPECTOR_T2_PACKED, [
        {
            itemId: ITEM_PLATE_T2,
            category: undefined,
            stacks: [{quantity: 300, stats: encodeStats([400, 200])}],
        },
        {
            itemId: ITEM_SHIP_T1_PACKED,
            category: undefined,
            stacks: [{quantity: 1, stats: encodeStats([800, 400])}],
        },
    ])
    const decoded = decodeCraftedItemStats(ITEM_PROSPECTOR_T2_PACKED, BigInt(viaCrafted.toString()))
    for (const {key, value} of viaEntity) {
        if (!key) continue
        expect(decoded[key]).toBe(value)
    }
})
