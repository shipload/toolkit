import {expect, test} from 'bun:test'
import {eligibleUpgrades} from '../../src/derivation/upgrades'
import {
    ITEM_ROUSTABOUT_T1_PACKED,
    ITEM_PROSPECTOR_T1_PACKED,
    ITEM_TENDER_T1_PACKED,
} from '../../src/data/item-ids'

test('eligibleUpgrades returns the immediate branches of a Roustabout T1', () => {
    const targets = eligibleUpgrades(ITEM_ROUSTABOUT_T1_PACKED)
        .map((r) => r.outputItemId)
        .sort()
    expect(targets).toEqual([ITEM_PROSPECTOR_T1_PACKED, ITEM_TENDER_T1_PACKED].sort())
})

test('eligibleUpgrades is empty for an item with no upgrade edges', () => {
    expect(eligibleUpgrades(ITEM_PROSPECTOR_T1_PACKED)).toEqual([])
})
