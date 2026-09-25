import {expect, test} from 'bun:test'
import {getComponentProcess, getItem} from '@shipload/sdk'
import {renderPretty, selectItems} from '../../../src/commands/query/items'

test('items renders list with item name and tonnes mass', () => {
    const out = renderPretty([getItem(501)])
    expect(out).toContain('Biomass')
    expect(out).toContain('1 t')
    expect(out).not.toContain('1000')
})

test('items shows module subtype in Type column', () => {
    const out = renderPretty([getItem(10100), getItem(10102)])
    expect(out).toContain('Engine module')
    expect(out).toContain('Gatherer module')
})

test('items shows category column for resources', () => {
    const out = renderPretty([getItem(101)])
    expect(out).toContain('Ore')
})

test('items list header reflects count', () => {
    const out = renderPretty([getItem(101), getItem(201)])
    expect(out).toContain('Items (2)')
})

test('items names the component kind in the Type column', () => {
    const out = renderPretty([getItem(10001), getItem(10005)])
    expect(out).toContain('Refined component')
    expect(out).toContain('Machined component')
})

test('--process lists only components of that kind', () => {
    const machined = selectItems({process: 'machined', tier: 1})
    expect(machined.length).toBe(5)
    expect(machined.every((item) => getComponentProcess(item.id) === 'machined')).toBe(true)
})

test('--process rejects an unknown kind and a non-component type', () => {
    expect(() => selectItems({process: 'forged'})).toThrow('Invalid --process')
    expect(() => selectItems({process: 'refined', type: 'module'})).toThrow('Invalid --process')
})
