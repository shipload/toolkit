import {test, expect} from 'bun:test'
import {renderShipPanel} from '../src/templates/ship-panel.ts'
import {tokens} from '../src/tokens/index.ts'

test('renderShipPanel with empty slots renders empty module rows', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [
            {
                capability: 'Hull',
                attributes: [
                    {label: 'Mass', value: 100},
                    {label: 'Capacity', value: 5000},
                ],
            },
        ],
        slots: [{installed: false}, {installed: false}, {installed: false}],
    })
    expect(svg).toContain('Ship')
    expect(svg).toContain('Mass')
    expect(svg).toContain('Capacity')
    expect((svg.match(/Empty module/g) ?? []).length).toBe(3)
})

test('renderShipPanel never uses gold accent', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [{capability: 'Hull', attributes: [{label: 'Mass', value: 100}]}],
        slots: [
            {
                name: 'Engine T1',
                capability: 'Engine',
                installed: true,
                description: [
                    {text: 'generates '},
                    {text: '500', highlight: true},
                    {text: ' thrust'},
                ],
            },
            {installed: false},
        ],
    })
    expect(svg).not.toContain(tokens.colors.text.accent)
    expect(svg).not.toContain('#f4c96b')
})

test('renderShipPanel renders installed slots as capability-colored prose', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [{capability: 'Hull', attributes: [{label: 'Mass', value: 100}]}],
        slots: [
            {
                name: 'Engine T1',
                capability: 'Engine',
                installed: true,
                description: [
                    {text: 'generates '},
                    {text: '500', highlight: true},
                    {text: ' thrust for travel'},
                ],
            },
            {
                name: 'Generator T1',
                capability: 'Generator',
                installed: true,
                description: [
                    {text: 'holds '},
                    {text: '1000', highlight: true},
                    {text: ' maximum energy'},
                ],
            },
        ],
    })
    // Capability prose labels.
    expect(svg).toContain('Engine:')
    expect(svg).toContain('Generator:')
    // Prose body + highlighted numbers present.
    expect(svg).toContain('generates')
    expect(svg).toContain('500')
    expect(svg).toContain('maximum energy')
    expect(svg).toContain('1000')
    // Capability colors drive the labels.
    expect(svg).toContain(tokens.colors.capability.engine)
    expect(svg).toContain(tokens.colors.capability.generator)
    // White (primary) for highlighted numbers.
    expect(svg).toContain(tokens.colors.text.primary)
})

test('renderShipPanel uses the entity identity (cyan) for badge + hex chip', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        quantity: 3,
        attributes: [{capability: 'Hull', attributes: [{label: 'Mass', value: 100}]}],
        slots: [{installed: false}],
    })
    expect(svg).toContain('SH')
    expect(svg).toContain('×3')
    expect(svg).toContain(tokens.colors.brand.cyan)
})

test('renderShipPanel renders title with small grey tier suffix', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [{capability: 'Hull', attributes: [{label: 'Mass', value: 100}]}],
        slots: [{installed: false}],
    })
    expect(svg).toContain('<tspan')
    expect(svg).toMatch(/>\s*T1<\/tspan>/)
    expect(svg).not.toContain('(Packed)')
    expect(svg).toContain(tokens.colors.text.secondary)
})

test('renderShipPanel mixed slots (installed + empty)', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [{capability: 'Hull', attributes: [{label: 'Mass', value: 100}]}],
        slots: [
            {
                name: 'Engine T1',
                capability: 'Engine',
                installed: true,
                description: [
                    {text: 'generates '},
                    {text: '500', highlight: true},
                    {text: ' thrust'},
                ],
            },
            {installed: false},
            {installed: false},
        ],
    })
    expect(svg).toContain('Engine:')
    expect((svg.match(/Empty module/g) ?? []).length).toBe(2)
})
