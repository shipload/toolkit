import {expect, test} from 'bun:test'
import {UInt16} from '@wharfkit/antelope'
import {fetchAllRecipes, renderDetail, renderList} from '../../../src/commands/query/recipe'

const sample = {
    output_item_id: 10001,
    output_mass: 4000,
    inputs: [{item_id: 101, quantity: 15}],
    stat_slots: [{sources: [{input_index: 0, input_stat_index: 0}]}],
    blend_weights: [],
    output_item: {id: 10001, mass: 4000},
    input_items: [],
}

test('recipe list shows count and per-row summary', () => {
    const out = renderList([sample, {...sample, output_item_id: 10002}] as any)
    expect(out).toContain('Recipes (2)')
    expect(out).toContain('10001')
    expect(out).toContain('10002')
})

test('recipe detail shows output + inputs + stat slots', () => {
    const out = renderDetail(sample as any)
    expect(out).toContain('Output')
    expect(out).toContain('Plate')
    expect(out).toContain('Inputs')
    expect(out).toContain('15')
    expect(out).toContain('Stat slots')
})

test('renderList never renders a malformed tier label', () => {
    const r = {
        output_item_id: 10001,
        output_mass: 4000,
        inputs: [{item_id: 101, quantity: 15}],
        stat_slots: [],
        blend_weights: [],
    }
    const out = renderList([r] as any)
    expect(out).not.toContain('TNaN')
    expect(out).not.toContain('Tundefined')
})

test('renderList derives tier label from the resolved input item', () => {
    const r = {
        output_item_id: 10100,
        output_mass: 150000,
        inputs: [{item_id: 10001, quantity: 6}],
        stat_slots: [],
        blend_weights: [],
    }
    const out = renderList([r] as any)
    expect(out).toContain('T1')
})

test('renderList does not repeat id in output item name', () => {
    const r = {
        output_item_id: 10001,
        output_mass: 4000,
        inputs: [{item_id: 101, quantity: 15}],
        stat_slots: [],
        blend_weights: [],
    }
    const out = renderList([r] as any)
    expect(out).not.toMatch(/\(id:\d+\)/)
})

test('renderDetail does not repeat id in output line', () => {
    const r = {
        output_item_id: 10001,
        output_mass: 4000,
        inputs: [{item_id: 101, quantity: 15}],
        stat_slots: [],
        blend_weights: [],
    }
    const out = renderDetail(r as any)
    expect(out).not.toMatch(/\(id:\d+\)/)
})

test('renderDetail shows output mass in tonnes not kg', () => {
    const r = {
        output_item_id: 10001,
        output_mass: 50000,
        inputs: [{item_id: 101, quantity: 15}],
        stat_slots: [],
        blend_weights: [],
    }
    const out = renderDetail(r as any)
    expect(out).toContain('50 t')
    expect(out).not.toContain('50000')
})

test('fetchAllRecipes pages with numeric lower_bound when ids decode as UInt16', async () => {
    const calls: unknown[] = []
    const firstPage = Array.from({length: 50}, (_, i) => ({
        output_item_id: UInt16.from(10000 + i),
        output_mass: 4000,
        inputs: [],
        stat_slots: [],
        blend_weights: [],
    }))
    firstPage[49].output_item_id = UInt16.from(11106)
    const readonly = async (_action: string, params: {lower_bound: number}) => {
        calls.push(params.lower_bound)
        if (calls.length === 1) return {recipes: firstPage}
        return {recipes: []}
    }
    const all = await fetchAllRecipes(readonly as any)
    expect(all.length).toBe(50)
    expect(calls).toEqual([0, 11107])
})
