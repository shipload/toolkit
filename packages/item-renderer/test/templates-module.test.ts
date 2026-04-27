import {test, expect} from 'bun:test'
import {resolveItem} from '@shipload/sdk'
import {renderModule} from '../src/templates/module.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

const CASES = [
    'engineT1',
    'generatorT1',
    'gathererT1',
    'loaderT1',
    'crafterT1',
    'storageT1',
    'haulerT1',
] as const

for (const name of CASES) {
    test(`matches the committed ${name} snapshot`, async () => {
        const item = FIXTURES[name]
        const resolved = resolveItem(item.item_id, item.stats, item.modules)
        const svg = renderModule(item, resolved)
        expect(svg).toMatchSnapshot(`module-${name}.svg`)
    })
}

test('Engine template embeds the narrative description', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('generates')
    expect(svg).toContain('thrust for travel')
    expect(svg).toContain('while draining')
    expect(svg).toContain('distance travelled')
})

test('Hauler template falls back to compact rows when description is null', () => {
    const item = FIXTURES.haulerT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('Hauler')
})

test('renderModule ranges mode shows capability header without narrative or attribute values', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id)
    const svg = renderModule(item, resolved, {mode: 'ranges'})
    expect(svg).toContain('ENGINE')
    expect(svg).not.toMatch(/>\d{3,}<\/(text|tspan)>/)
    expect(svg).toContain('MODULE')
})

test('renderModule values mode (default) still shows narrative', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats)
    const svg = renderModule(item, resolved)
    expect(svg).toMatch(/thrust|energy|generates/)
})

test('renderModule ranges mode matches snapshot', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id)
    const svg = renderModule(item, resolved, {mode: 'ranges'})
    expect(svg).toMatchSnapshot('module-ranges')
})
