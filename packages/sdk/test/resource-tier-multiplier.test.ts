import {describe, expect, test} from 'bun:test'
import {applyResourceTierMultiplier} from '../src/derivation/tiers'

describe('applyResourceTierMultiplier', () => {
    test('T1 multiplies units by 20', () => {
        expect(applyResourceTierMultiplier(1000, 1)).toBe(20000)
    })
    test('T10 multiplies units by 1.9', () => {
        expect(applyResourceTierMultiplier(1000, 10)).toBe(1900)
    })
    test('floors to integer and never below 1', () => {
        expect(applyResourceTierMultiplier(1, 10)).toBe(1) // floor(1*19/10)=1
        expect(applyResourceTierMultiplier(7, 8)).toBe(22) // floor(7*32/10)=22
    })
    test('clamps out-of-range tiers', () => {
        expect(applyResourceTierMultiplier(1000, 0)).toBe(20000)
        expect(applyResourceTierMultiplier(1000, 11)).toBe(1900)
    })
})
