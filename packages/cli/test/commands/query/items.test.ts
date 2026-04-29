import {expect, test} from 'bun:test'
import {getItem} from '@shipload/sdk'
import {renderPretty} from '../../../src/commands/query/items'

test('items renders list with item name and tonnes mass', () => {
    const out = renderPretty([getItem(501)])
    expect(out).toContain('Biomass')
    expect(out).toContain('42 t')
    expect(out).not.toContain('42000')
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
