import {expect, test} from 'bun:test'
import {
    computeCraftedOutputStats,
    computeEntityStats,
    decodeCraftedItemStats,
    encodeStats,
} from '../src/derivation/crafting'
import {
    ITEM_PROSPECTOR_T1A_PACKED,
    ITEM_BEAM,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_SHIP_T1_PACKED,
} from '../src/data/item-ids'

test('decodeCraftedItemStats preserves the legacy Ship T1 hull layout without a recipe', () => {
    expect(decodeCraftedItemStats(ITEM_SHIP_T1_PACKED, encodeStats([500, 400, 0, 0]))).toEqual({
        strength: 500,
        density: 400,
    })
})

test('computeEntityStats blends the donor hull 50/50 with Beam', () => {
    // Beam strength 400; donor Roustabout strength 800 → expect 600.
    const stats = computeEntityStats(ITEM_PROSPECTOR_T1A_PACKED, {
        [ITEM_BEAM]: [{quantity: 100, stats: {strength: 400, tolerance: 200}}],
        [ITEM_ROUSTABOUT_T1A_PACKED]: [{quantity: 1, stats: {strength: 800}}],
    })
    const str = stats.find((s) => s.key === 'strength')!.value
    expect(str).toBe(600)
})

test('computeCraftedOutputStats averages a multi-source slot with empty blendWeights', () => {
    // empty blendWeights means equal weights: average every source, not just the first
    const out = computeCraftedOutputStats(ITEM_PROSPECTOR_T1A_PACKED, [
        {
            itemId: ITEM_BEAM,
            category: undefined,
            stacks: [{quantity: 100, stats: encodeStats([400, 200])}],
        },
        {
            itemId: ITEM_ROUSTABOUT_T1A_PACKED,
            category: undefined,
            stacks: [{quantity: 1, stats: encodeStats([800])}],
        },
    ])
    const decoded = decodeCraftedItemStats(ITEM_PROSPECTOR_T1A_PACKED, BigInt(out.toString()))
    expect(decoded['strength']).toBe(600)
})

test('computeCraftedOutputStats agrees with computeEntityStats for the donor blend', () => {
    const viaEntity = computeEntityStats(ITEM_PROSPECTOR_T1A_PACKED, {
        [ITEM_BEAM]: [{quantity: 100, stats: {strength: 400, tolerance: 200}}],
        [ITEM_ROUSTABOUT_T1A_PACKED]: [{quantity: 1, stats: {strength: 800}}],
    })
    const viaCrafted = computeCraftedOutputStats(ITEM_PROSPECTOR_T1A_PACKED, [
        {
            itemId: ITEM_BEAM,
            category: undefined,
            stacks: [{quantity: 100, stats: encodeStats([400, 200])}],
        },
        {
            itemId: ITEM_ROUSTABOUT_T1A_PACKED,
            category: undefined,
            stacks: [{quantity: 1, stats: encodeStats([800])}],
        },
    ])
    const decoded = decodeCraftedItemStats(
        ITEM_PROSPECTOR_T1A_PACKED,
        BigInt(viaCrafted.toString())
    )
    for (const {key, value} of viaEntity) {
        if (!key) continue
        expect(decoded[key]).toBe(value)
    }
})
