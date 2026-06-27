import {expect, test} from 'bun:test'
import {computeTravelDrain} from '../src/nft/description'

test('single average engine anchors to 118', () => {
    expect(computeTravelDrain(775, 500)).toBe(118)
})
test('two average engines halve the per-tile cost', () => {
    expect(computeTravelDrain(1550, 500)).toBe(59)
})
test('maxed-quality single engine is cheaper', () => {
    expect(computeTravelDrain(1149, 999)).toBe(66)
})
test('low-quality starter engine is pricier', () => {
    expect(computeTravelDrain(625, 300)).toBe(156)
})
