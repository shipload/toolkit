import {afterEach, expect, test} from 'bun:test'
import {displayName} from '../../src/resolution/display-name'
import {resolveItem} from '../../src/resolution/resolve-item'
import {COMPONENT_TIER_PREFIXES, MODULE_TIER_PREFIXES} from '../../src/types'

test('resource T1: prefix + category + (Tn)', () => {
    const resolved = resolveItem(101) // ITEM_ORE_T1
    expect(displayName(resolved)).toBe('Crude Ore (T1)')
})

test('resource T3: prefix + category + (Tn)', () => {
    const resolved = resolveItem(203) // T3 Crystal
    expect(displayName(resolved)).toBe('Pure Crystal (T3)')
})

test('component with empty prefix table: bare name + (Tn)', () => {
    expect(displayName({itemType: 'component', tier: 1, name: 'Plate'})).toBe('Plate (T1)')
})

test('module with empty prefix table: bare name + (Tn)', () => {
    expect(displayName({itemType: 'module', tier: 1, name: 'Thrusters'})).toBe('Thrusters (T1)')
})

test('entity (no prefix table at all): bare name + (Tn)', () => {
    expect(displayName({itemType: 'entity', tier: 1, name: 'Scout'})).toBe('Scout (T1)')
})

test('packed-entity (no prefix table at all): bare name + (Tn)', () => {
    expect(displayName({itemType: 'packed-entity', tier: 2, name: 'Warehouse'})).toBe(
        'Warehouse (T2)'
    )
})

test('resource missing category falls back to "Resource"', () => {
    expect(displayName({itemType: 'resource', tier: 1, name: ''})).toBe('Crude Resource (T1)')
})

test('out-of-range resource tier: no prefix, suffix still rendered', () => {
    expect(displayName({itemType: 'resource', tier: 99, category: 'ore', name: ''})).toBe(
        'Ore (T99)'
    )
})

test('extension-hook: filling MODULE_TIER_PREFIXES produces a prefix', () => {
    MODULE_TIER_PREFIXES[1] = 'Mk I'
    try {
        expect(displayName({itemType: 'module', tier: 1, name: 'Thrusters'})).toBe(
            'Mk I Thrusters (T1)'
        )
    } finally {
        delete MODULE_TIER_PREFIXES[1]
    }
})

test('extension-hook: filling COMPONENT_TIER_PREFIXES produces a prefix', () => {
    COMPONENT_TIER_PREFIXES[2] = 'Mk II'
    try {
        expect(displayName({itemType: 'component', tier: 2, name: 'Plate'})).toBe(
            'Mk II Plate (T2)'
        )
    } finally {
        delete COMPONENT_TIER_PREFIXES[2]
    }
})

afterEach(() => {
    for (const k of Object.keys(MODULE_TIER_PREFIXES)) delete MODULE_TIER_PREFIXES[Number(k)]
    for (const k of Object.keys(COMPONENT_TIER_PREFIXES)) delete COMPONENT_TIER_PREFIXES[Number(k)]
})
