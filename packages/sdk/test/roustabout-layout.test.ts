import {expect, test} from 'bun:test'
import {
    ITEM_DREDGER_T2_PACKED,
    ITEM_PORTER_T1_PACKED,
    ITEM_PROSPECTOR_T1_PACKED,
    ITEM_PROSPECTOR_T2_AUX_PACKED,
    ITEM_PROSPECTOR_T2_PACKED,
    ITEM_ROUSTABOUT_T1_PACKED,
    ITEM_SMITH_T1_PACKED,
    ITEM_TENDER_T1_PACKED,
    ITEM_TUG_T1_PACKED,
    ITEM_WRIGHT_T1_PACKED,
    eligibleUpgrades,
    getEntityLayout,
} from '../src/index'

test('Roustabout support slots operate at 80 percent', () => {
    expect(getEntityLayout(ITEM_ROUSTABOUT_T1_PACKED)?.slots).toEqual([
        {type: 'generator', outputPct: 80, maxTier: 1},
        {type: 'engine', outputPct: 80, maxTier: 1},
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
        ITEM_WRIGHT_T1_PACKED,
        ITEM_TUG_T1_PACKED,
        ITEM_PORTER_T1_PACKED,
        ITEM_SMITH_T1_PACKED,
    ])

    for (const itemId of directChildIds) {
        const slots = getEntityLayout(itemId)?.slots
        expect(slots?.[0]).toMatchObject({type: 'generator', outputPct: 85})
        expect(slots?.[1]).toMatchObject({type: 'engine', outputPct: 85})
    }
})

test('Prospector T1 upgrades into Prospector T2 at 90 percent engine and power-core slots', () => {
    const childIds = eligibleUpgrades(ITEM_PROSPECTOR_T1_PACKED).map(
        (recipe) => recipe.outputItemId
    )
    expect(childIds).toEqual([ITEM_PROSPECTOR_T2_PACKED])

    const slots = getEntityLayout(ITEM_PROSPECTOR_T2_PACKED)?.slots
    expect(slots?.[0]).toMatchObject({type: 'generator', outputPct: 90})
    expect(slots?.[1]).toMatchObject({type: 'engine', outputPct: 90})
})

test('Prospector T2 has a single power core, engine, and gatherer slot', () => {
    expect(getEntityLayout(ITEM_PROSPECTOR_T2_PACKED)?.slots).toEqual([
        {type: 'generator', outputPct: 90, maxTier: 2},
        {type: 'engine', outputPct: 90, maxTier: 2},
        {type: 'gatherer', outputPct: 100, maxTier: 2},
    ])
})

test('Prospector T2 upgrades into the Prospector T2 AUX and Dredger T2', () => {
    const childIds = eligibleUpgrades(ITEM_PROSPECTOR_T2_PACKED).map(
        (recipe) => recipe.outputItemId
    )
    expect(childIds).toEqual([ITEM_PROSPECTOR_T2_AUX_PACKED, ITEM_DREDGER_T2_PACKED])
})
