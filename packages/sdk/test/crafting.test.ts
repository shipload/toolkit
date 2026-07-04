import {expect, test} from 'bun:test'
import {computeEntityStats} from '../src/derivation/crafting'
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
