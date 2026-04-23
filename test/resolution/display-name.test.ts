import {expect, test} from 'bun:test'
import {displayName} from '../../src/resolution/display-name'
import {resolveItem} from '../../src/resolution/resolve-item'

test('displayName for T1 Ore returns "Crude Ore"', () => {
    const resolved = resolveItem(101)
    expect(displayName(resolved)).toBe('Crude Ore')
})

test('displayName for T3 Crystal returns "Pure Crystal"', () => {
    const resolved = resolveItem(203)
    expect(displayName(resolved)).toBe('Pure Crystal')
})

test('displayName for component uses name field directly', () => {
    const resolved = resolveItem(10001)
    expect(displayName(resolved)).toBe('Hull Plates')
})
