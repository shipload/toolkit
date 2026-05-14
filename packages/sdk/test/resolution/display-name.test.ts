import {expect, test} from 'bun:test'
import {displayName, displayNameWithTier} from '../../src/resolution/display-name'
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

test('displayNameWithTier appends (Tn) to a resource name', () => {
    const resolved = resolveItem(101)
    expect(displayNameWithTier(resolved)).toBe('Crude Ore (T1)')
})

test('displayNameWithTier appends (Tn) to a higher-tier resource', () => {
    const resolved = resolveItem(203)
    expect(displayNameWithTier(resolved)).toBe('Pure Crystal (T3)')
})

test('displayNameWithTier appends (Tn) to a component', () => {
    const resolved = resolveItem(10001)
    expect(displayNameWithTier(resolved)).toBe('Hull Plates (T1)')
})

test('displayNameWithTier preserves tier number in suffix', () => {
    const resolved = {itemType: 'module' as const, tier: 7, name: 'Engine'}
    expect(displayNameWithTier(resolved)).toBe('Engine (T7)')
})
