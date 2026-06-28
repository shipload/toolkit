import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {ITEM_ORE_T1, ITEM_GAS_T1, tierOfReserve} from '$lib'

// tierOfReserve reverses the per-tier multiplier; T1's 20x makes Small read 72k-288k units, Medium 480k-960k, Large 1.92M-3.36M.
describe('tierOfReserve', () => {
    test('Ore T1: 100000 units → small (base 5000, implied 5 M kg)', () => {
        assert.equal(tierOfReserve(100000, ITEM_ORE_T1), 'small')
    })

    test('Ore T1: 74000 units → small (base 3700, just above floor)', () => {
        assert.equal(tierOfReserve(74000, ITEM_ORE_T1), 'small')
    })

    test('Ore T1: 600000 units → medium (base 30000, implied 30 M kg)', () => {
        assert.equal(tierOfReserve(600000, ITEM_ORE_T1), 'medium')
    })

    test('Ore T1: 2600000 units → large (base 130000, implied 130 M kg)', () => {
        assert.equal(tierOfReserve(2600000, ITEM_ORE_T1), 'large')
    })

    test('Gas T1: 100000 units → small (uniform mass, same as Ore)', () => {
        assert.equal(tierOfReserve(100000, ITEM_GAS_T1), 'small')
    })

    test('returns null for zero reserve', () => {
        assert.isNull(tierOfReserve(0, ITEM_ORE_T1))
    })

    test('returns null for negative reserve', () => {
        assert.isNull(tierOfReserve(-1, ITEM_ORE_T1))
    })

    test('Ore T1: 20000 units → null (base 1000, below Small floor)', () => {
        assert.isNull(tierOfReserve(20000, ITEM_ORE_T1))
    })
})
