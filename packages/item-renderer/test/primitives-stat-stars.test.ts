import {expect, test} from 'bun:test'
import {statStars, STAR_BLOCK_WIDTH} from '../src/primitives/stat-stars.ts'

test('draws exactly three star glyphs regardless of rating', () => {
    for (const n of [0, 1, 2, 3]) {
        const svg = statStars({x: 0, y: 20, n})
        expect((svg.match(/<path/g) ?? []).length).toBe(3)
    }
})

test('fills n stars with the on color and the rest with the empty color', () => {
    const svg = statStars({x: 0, y: 20, n: 2})
    expect((svg.match(/#ffce5c/g) ?? []).length).toBe(2)
    expect((svg.match(/rgba\(255,255,255,0\.16\)/g) ?? []).length).toBe(1)
})

test('clamps n into 0..3', () => {
    expect((statStars({x: 0, y: 20, n: 9}).match(/#ffce5c/g) ?? []).length).toBe(3)
    expect((statStars({x: 0, y: 20, n: -4}).match(/#ffce5c/g) ?? []).length).toBe(0)
})

test('exposes a fixed block width for layout reservation', () => {
    expect(typeof STAR_BLOCK_WIDTH).toBe('number')
    expect(STAR_BLOCK_WIDTH).toBeGreaterThan(0)
})
