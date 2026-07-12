import {expect, test} from 'bun:test'
import {
    ITEM_DREDGER_T1_PACKED,
    ITEM_PORTER_T1_PACKED,
    ITEM_PROSPECTOR_T1_PACKED,
    ITEM_ROUSTABOUT_T1_PACKED,
    ITEM_TENDER_T1_PACKED,
    ITEM_TUG_T1_PACKED,
    ITEM_WRANGLER_T1_PACKED,
    eligibleUpgrades,
    getEntityLayout,
} from '../src/index'

test('Roustabout support slots operate at 80 percent', () => {
    expect(getEntityLayout(ITEM_ROUSTABOUT_T1_PACKED)?.slots).toEqual([
        {type: 'engine', outputPct: 80, maxTier: 1},
        {type: 'generator', outputPct: 80, maxTier: 1},
        {type: 'any', outputPct: 60, maxTier: 1},
    ])
})

test('Roustabout upgrades use 85 percent engine and power-core slots', () => {
    const directChildIds = eligibleUpgrades(ITEM_ROUSTABOUT_T1_PACKED).map(
        (recipe) => recipe.outputItemId
    )
    expect(directChildIds).toEqual([
        ITEM_PROSPECTOR_T1_PACKED,
        ITEM_TENDER_T1_PACKED,
        ITEM_TUG_T1_PACKED,
        ITEM_PORTER_T1_PACKED,
    ])

    for (const itemId of directChildIds) {
        const slots = getEntityLayout(itemId)?.slots
        expect(slots?.[0]).toMatchObject({type: 'engine', outputPct: 85})
        expect(slots?.[1]).toMatchObject({type: 'generator', outputPct: 85})
    }
})

test('Prospector children use 90 percent engine and power-core slots', () => {
    const childIds = eligibleUpgrades(ITEM_PROSPECTOR_T1_PACKED).map(
        (recipe) => recipe.outputItemId
    )
    expect(childIds).toEqual([ITEM_WRANGLER_T1_PACKED, ITEM_DREDGER_T1_PACKED])

    for (const itemId of childIds) {
        const slots = getEntityLayout(itemId)?.slots
        expect(slots?.[0]).toMatchObject({type: 'engine', outputPct: 90})
        expect(slots?.[1]).toMatchObject({type: 'generator', outputPct: 90})
    }
})
