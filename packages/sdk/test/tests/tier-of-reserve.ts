import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {ITEM_ORE_T1, ITEM_GAS_T1, tierOfReserve} from '$lib'

// Resource mass is uniform (1000 kg/t) since the mass-as-quantity collapse on
// 2026-05-27. Reserve-tier thresholds (RESERVE_TIERS, in kg) are unchanged, so
// the unit counts that map into each tier scale by 1/1000 relative to a 1000 kg
// unit: Small floor 3.6 M kg = 3600 t, Medium 24 M–48 M kg, Large 96 M–168 M kg.
describe('tierOfReserve', () => {
    test('Ore T1: 5000 t → small (implied 5 M kg)', () => {
        assert.equal(tierOfReserve(5000, ITEM_ORE_T1), 'small')
    })

    test('Ore T1: 3700 t → small (implied 3.7 M kg, just above floor)', () => {
        assert.equal(tierOfReserve(3700, ITEM_ORE_T1), 'small')
    })

    test('Ore T1: 30000 t → medium (implied 30 M kg)', () => {
        assert.equal(tierOfReserve(30000, ITEM_ORE_T1), 'medium')
    })

    test('Ore T1: 130000 t → large (implied 130 M kg)', () => {
        assert.equal(tierOfReserve(130000, ITEM_ORE_T1), 'large')
    })

    test('Gas T1: 5000 t → small (uniform mass, same as Ore)', () => {
        assert.equal(tierOfReserve(5000, ITEM_GAS_T1), 'small')
    })

    test('returns null for zero reserve', () => {
        assert.isNull(tierOfReserve(0, ITEM_ORE_T1))
    })

    test('returns null for negative reserve', () => {
        assert.isNull(tierOfReserve(-1, ITEM_ORE_T1))
    })

    test('Ore T1: 1000 t → null (implied 1 M kg, below Small floor)', () => {
        assert.isNull(tierOfReserve(1000, ITEM_ORE_T1))
    })
})
