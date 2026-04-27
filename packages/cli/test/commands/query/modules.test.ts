import {expect, test} from 'bun:test'
import {render} from '../../../src/commands/query/modules'

test('modules renders rows with id, type, tier, mass', () => {
    const input = {
        modules: [{id: 20001, mass: 50000, module_type: 1, tier: 2}],
    }
    const out = render(input as any, false)
    expect(out).toContain('Modules (1)')
    expect(out).toContain('20001')
    expect(out).toContain('type 1')
    expect(out).toContain('tier 2')
    expect(out).toContain('50000')
})

test('modules --raw emits JSON', () => {
    const out = render({modules: []} as any, true)
    expect(JSON.parse(out)).toEqual({modules: []})
})
