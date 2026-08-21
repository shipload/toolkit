import {describe, expect, test} from 'bun:test'
import {resolveLockedAmount, wrapCostKey} from './nft'

describe('resolveLockedAmount', () => {
    test('no fee refunds the full cost', () => {
        expect(resolveLockedAmount(5_0000n, 0)).toBe(5_0000n)
    })
    test('2% fee floors the fee and refunds the remainder', () => {
        expect(resolveLockedAmount(5_0000n, 200)).toBe(4_9000n)
    })
    test('rounding floors the fee (contract uses integer division)', () => {
        expect(resolveLockedAmount(101n, 250)).toBe(99n) // fee = floor(101*250/10000)=2
    })
})

describe('wrapCostKey', () => {
    test('packs item type and tier as (type << 8) | tier', () => {
        expect(wrapCostKey(0, 1).toString()).toBe('1')
        expect(wrapCostKey(3, 2).toString()).toBe('770')
    })
})
