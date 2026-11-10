import {test, expect} from 'bun:test'
import {renderShipPanel} from '../src/templates/ship-panel.ts'
import {tokens} from '../src/tokens/index.ts'

const HULL = [
    {key: 'hull', capability: 'Hull', attributes: [{key: 'mass', label: 'Mass', value: 100}]},
]

test('renderShipPanel with empty slots renders empty module rows', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [
            {
                key: 'hull',
                capability: 'Hull',
                attributes: [
                    {key: 'mass', label: 'Mass', value: 100},
                    {key: 'capacity', label: 'Capacity', value: 5000},
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

test('renderShipPanel reads the hull group and its mass rows by key', () => {
    const english = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [
            {
                key: 'hull',
                capability: 'Hull',
                attributes: [{key: 'capacity', label: 'Capacity', value: 5_000_000}],
            },
        ],
        slots: [{installed: true, name: 'Engine', capabilityKey: 'engine', rows: []}],
    })
    const translated = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: [
            {
                key: 'hull',
                capability: '선체',
                attributes: [{key: 'capacity', label: '용량', value: 5_000_000}],
            },
        ],
        slots: [{installed: true, name: '엔진', capabilityKey: 'engine', rows: []}],
    })
    const values = (svg: string) => [...svg.matchAll(/>([^<]*\d[^<]*)<\/text>/g)].map((m) => m[1])
    expect(values(translated)).toEqual(values(english))
    expect(translated).toContain(tokens.colors.capability.engine)
})

test('renderShipPanel never uses gold accent', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: HULL,
        slots: [
            {
                name: 'Engine',
                capabilityKey: 'engine',
                installed: true,
                rows: [
                    {label: 'Speed', value: '40 ly/hr'},
                    {label: 'Drain', value: '191 energy/ly'},
                ],
            },
            {installed: false},
        ],
    })
    expect(svg).not.toContain(tokens.colors.text.accent)
    expect(svg).not.toContain('#f4c96b')
})

test('renderShipPanel renders installed slots as named figure rows', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: HULL,
        slots: [
            {
                name: 'Engine',
                capabilityKey: 'engine',
                installed: true,
                rows: [
                    {label: 'Speed', value: '40 ly/hr'},
                    {label: 'Drain', value: '191 energy/ly'},
                ],
            },
            {
                name: 'Power Core',
                capabilityKey: 'generator',
                installed: true,
                rows: [
                    {label: 'Capacity', value: '+1,544 energy'},
                    {label: 'Recharge', value: '+262 energy/min'},
                ],
            },
        ],
    })
    expect(svg).toContain('>Engine</text>')
    expect(svg).toContain('>Power Core</text>')
    expect(svg).not.toContain('Generator')
    expect(svg).toContain('>40 ly/hr</text>')
    expect(svg).toContain('>+262 energy/min</text>')
    expect(svg).toContain(tokens.colors.capability.engine)
    expect(svg).toContain(tokens.colors.capability.generator)
    expect(svg).toContain(tokens.colors.text.primary)
})

test('renderShipPanel uses the detailed entity icon and cyan badge identity', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        quantity: 3,
        attributes: HULL,
        slots: [{installed: false}],
    })
    expect(svg).toContain('data-entity="ship"')
    expect(svg).toContain('×3')
    expect(svg).toContain(tokens.colors.brand.cyan)
})

test('renderShipPanel renders title with small grey tier suffix', () => {
    const svg = renderShipPanel({
        name: 'Ship',
        tier: 1,
        attributes: HULL,
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
        attributes: HULL,
        slots: [
            {
                name: 'Engine',
                capabilityKey: 'engine',
                installed: true,
                rows: [
                    {label: 'Speed', value: '40 ly/hr'},
                    {label: 'Drain', value: '191 energy/ly'},
                ],
            },
            {installed: false},
            {installed: false},
        ],
    })
    expect(svg).toContain('>Engine</text>')
    expect((svg.match(/Empty module/g) ?? []).length).toBe(2)
})
