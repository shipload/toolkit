import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {ITEM_ORE_T1, ITEM_GAS_T1, tierOfReserve} from '$lib'

describe('tierOfReserve', () => {
    test('Ore T1 (mass 52k): 100 units → small (implied 5.2 M kg)', () => {
        assert.equal(tierOfReserve(100, ITEM_ORE_T1), 'small')
    })

    test('Ore T1: 70 units → small (implied 3.64 M kg, just above floor)', () => {
        assert.equal(tierOfReserve(70, ITEM_ORE_T1), 'small')
    })

    test('Ore T1: 500 units → medium (implied 26 M kg)', () => {
        assert.equal(tierOfReserve(500, ITEM_ORE_T1), 'medium')
    })

    test('Ore T1: 3000 units → large (implied 156 M kg)', () => {
        assert.equal(tierOfReserve(3000, ITEM_ORE_T1), 'large')
    })

    test('Gas T1 (mass 15k): 240 units → small (implied 3.6 M kg, lighter resource)', () => {
        assert.equal(tierOfReserve(240, ITEM_GAS_T1), 'small')
    })

    test('returns null for zero reserve', () => {
        assert.isNull(tierOfReserve(0, ITEM_ORE_T1))
    })

    test('returns null for negative reserve', () => {
        assert.isNull(tierOfReserve(-1, ITEM_ORE_T1))
    })

    test('Ore T1: 20 units → null (implied 1.04 M kg, below Small floor)', () => {
        assert.isNull(tierOfReserve(20, ITEM_ORE_T1))
    })
})
