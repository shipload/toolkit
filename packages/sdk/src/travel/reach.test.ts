import {expect, test} from 'bun:test'
import type {RouteMoverInput} from './route-simulator'
import {computeGroupPerLegReach, computePerLegReach, type ReachStats} from './reach'

// Type-level: a RouteMoverInput (webapp's mover shape) must satisfy ReachStats with no cast.
function acceptsReachStats(_s: ReachStats): void {}
function checkRouteMoverAssignable(m: RouteMoverInput) {
    acceptsReachStats(m)
}
void checkRouteMoverAssignable

test('capacity basis: reach is generator capacity over engine drain, unrounded', () => {
    const reach = computePerLegReach({generator: {capacity: 550n}, engines: {drain: 100n}})
    expect(reach).toBe(5.5)
})

test('capacity basis is the default when opts is omitted', () => {
    const reach = computePerLegReach({generator: {capacity: 1000n}, engines: {drain: 250n}})
    expect(reach).toBe(4)
})

test('current basis prefers generator capacity over current energy, matching the webapp fallback', () => {
    const reach = computePerLegReach(
        {generator: {capacity: 1000n}, engines: {drain: 100n}, energy: 250n},
        {basis: 'current'}
    )
    expect(reach).toBe(10)
})

test('current basis falls back to current energy when there is no generator', () => {
    const reach = computePerLegReach({engines: {drain: 100n}, energy: 350n}, {basis: 'current'})
    expect(reach).toBe(3.5)
})

test('current basis with a lower current energy still returns the capacity-derived reach', () => {
    const reach = computePerLegReach(
        {generator: {capacity: 900n}, engines: {drain: 90n}, energy: 90n},
        {basis: 'current'}
    )
    expect(reach).toBe(10)
    expect(reach).not.toBe(1)
})

test('capacity basis throws for a generator-less mover', () => {
    expect(() => computePerLegReach({engines: {drain: 100n}})).toThrow()
})

test('current basis throws when there is no current energy figure either', () => {
    expect(() => computePerLegReach({engines: {drain: 100n}}, {basis: 'current'})).toThrow()
})

test('an empty mover list has zero reach rather than throwing', () => {
    expect(computeGroupPerLegReach([])).toBe(0)
})

test('a group with no moving entity has zero reach', () => {
    const reach = computeGroupPerLegReach([{generator: {capacity: 1000n}}])
    expect(reach).toBe(0)
})

test('a RouteMoverInput-shaped mover with hasMovement: false is excluded from the group', () => {
    const mover: ReachStats = {
        hasMovement: false,
        engines: {drain: 100},
        generator: {capacity: 1000},
    }
    expect(computeGroupPerLegReach([mover])).toBe(0)
})

test('hasMovement defaults to true when absent', () => {
    const mover: ReachStats = {engines: {drain: 100}, generator: {capacity: 1000}}
    expect(computeGroupPerLegReach([mover])).toBe(10)
})

test('group reach is the minimum across movers', () => {
    const fast: ReachStats = {engines: {drain: 100n}, generator: {capacity: 1000n}}
    const slow: ReachStats = {engines: {drain: 100n}, generator: {capacity: 550n}}
    expect(computeGroupPerLegReach([fast, slow])).toBe(5.5)
})

// Settled by contracts/test/server/reach-parity.test.ts: the contract truncates, so ceiling here would overclaim reach.
test('rounding: a fractional reach is left unrounded, not ceiled', () => {
    const reach = computePerLegReach({generator: {capacity: 550n}, engines: {drain: 100n}})
    expect(reach).not.toBe(Math.ceil(reach))
    expect(Math.floor(reach)).toBe(5)
})
