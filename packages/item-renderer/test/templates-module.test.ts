import {test, expect} from 'bun:test'
import {resolveItem} from '@shipload/sdk'
import {renderModule} from '../src/templates/module.ts'
import {tokens} from '../src/tokens/index.ts'
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

const FIGURE_LINES: Record<string, {heading: string; rows: [string, string][]}> = {
    gathererT1: {
        heading: 'GATHERING',
        rows: [
            ['Yield', '41.0 t/min'],
            ['Depth', '1,000 km'],
            ['Drain', '13.1 energy/min'],
        ],
    },
    crafterT1: {
        heading: 'CRAFTING',
        rows: [
            ['Speed', '34.8 t/min'],
            ['Drain', '99 energy/k t'],
        ],
    },
    loaderT1: {
        heading: 'SHUTTLING',
        rows: [
            ['Transfer', '984 t/min'],
            ['Payload', '80.7%'],
            ['Shuttles', '1'],
        ],
    },
    engineT1: {
        heading: 'MOVEMENT',
        rows: [
            ['Speed', '40 ly/hr'],
            ['Drain', '191 energy/ly'],
        ],
    },
}

for (const [name, expected] of Object.entries(FIGURE_LINES)) {
    test(`${name} draws its figure lines under the ${expected.heading} heading`, () => {
        const item = FIXTURES[name as keyof typeof FIXTURES]
        const resolved = resolveItem(item.item_id, item.stats, item.modules)
        const svg = renderModule(item, resolved)
        expect(svg).toContain(`>${expected.heading}</text>`)
        for (const [label, value] of expected.rows) {
            expect(svg).toContain(`>${label}</text>`)
            expect(svg).toContain(`>${value}</text>`)
        }
    })
}

test('module cards never print a banned capability noun', () => {
    for (const name of CASES) {
        const item = FIXTURES[name]
        const svg = renderModule(item, resolveItem(item.item_id, item.stats, item.modules))
        const words = [...svg.matchAll(/>([^<]+)</g)].map((m) => m[1]).join(' ')
        expect(words).not.toMatch(/gatherer|crafter|loader|loading|hauler|generator/i)
    }
})

test('Engine template renders the module icon in the header', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('data-module="engine"')
    expect(svg).not.toContain('>00</text>')
})

test('Engine figures draw values in white, never gold', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain(tokens.colors.text.primary)
    expect(svg).not.toContain(tokens.colors.text.accent)
    expect(svg).not.toContain('#f4c96b')
})

test('Hauler template wraps its long Handling figure', () => {
    const item = FIXTURES.haulerT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('>TOWING</text>')
    expect(svg).toContain('>+11% travel time per towed</text>')
    expect(svg).toContain('>container, plus its weight</text>')
})

test('renderModule ranges mode shows the activity heading without figures', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id)
    const svg = renderModule(item, resolved, {mode: 'ranges'})
    expect(svg).toContain('MOVEMENT')
    expect(svg).not.toContain('ly/hr')
    expect(svg).not.toMatch(/>\d{3,}<\/(text|tspan)>/)
})

test('renderModule omits the Type row', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).not.toContain('MODULE · T1')
})

test('renderModule ranges mode matches snapshot', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id)
    const svg = renderModule(item, resolved, {mode: 'ranges'})
    expect(svg).toMatchSnapshot('module-ranges')
})

test('renders tier suffix in the module name', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).toContain('<tspan')
    expect(svg).toMatch(/>\s*T1<\/tspan>/)
    expect(svg).not.toContain('(T1)')
})

test('renders Location row when location is provided', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved, {location: {x: 22, y: 8}})
    expect(svg).toContain('Location')
    expect(svg).toContain('22, 8')
})

test('omits Location row when location is absent', () => {
    const item = FIXTURES.engineT1
    const resolved = resolveItem(item.item_id, item.stats, item.modules)
    const svg = renderModule(item, resolved)
    expect(svg).not.toContain('Location')
})
