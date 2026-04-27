import {expect, test} from 'bun:test'
import {render} from '../../../src/commands/tools/verify-tiers'

test('render prints radius and tier breakdown', () => {
    const out = render(100, {
        counts: {small: 10, medium: 5, large: 2, massive: 1, motherlode: 0},
        yielded: 18,
        inGap: 0,
        maxReserve: 2500,
        totalCells: 1000,
        nonEmpty: 200,
        strata: 50,
    })
    expect(out).toContain('radius=100')
    expect(out).toContain('small')
    expect(out).toContain('10')
    expect(out).toContain('motherlode')
})

test('render flags in-gap reserves when present', () => {
    const out = render(50, {
        counts: {small: 0, medium: 0, large: 0, massive: 0, motherlode: 0},
        yielded: 5,
        inGap: 5,
        maxReserve: 90,
        totalCells: 100,
        nonEmpty: 20,
        strata: 10,
    })
    expect(out).toContain('in gap:')
    expect(out).toContain('outside defined tier ranges')
})
