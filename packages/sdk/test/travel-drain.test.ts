import {expect, test} from 'bun:test'
import {computeEffectiveModuleStat} from '../src/derivation/stat-scaling'
import {computeTravelDrain} from '../src/nft/description'

test('module stat scaling holds starter quality fixed and tapers higher quality', () => {
    expect(computeEffectiveModuleStat(213)).toBe(213)
    expect(computeEffectiveModuleStat(500)).toBe(327)
    expect(computeEffectiveModuleStat(999)).toBe(527)
})

test('single average engine costs 156 energy per cell', () => {
    expect(computeTravelDrain(775, 500)).toBe(156_000)
})
test('two average engines reduce per-tile cost by a square-root factor', () => {
    expect(computeTravelDrain(1550, 500)).toBe(110_308)
})
test('maxed-quality single engine is cheaper', () => {
    expect(computeTravelDrain(1149, 999)).toBe(107_262)
})
test('low-quality starter engine is pricier', () => {
    expect(computeTravelDrain(625, 300)).toBe(185_833)
})
test('starter Roustabout thrust stays at the pre-curve drain level', () => {
    expect(computeTravelDrain(447, 213)).toBe(224_517)
})
