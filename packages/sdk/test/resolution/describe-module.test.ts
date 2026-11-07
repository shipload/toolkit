import {describe, expect, test} from 'bun:test'
import {
    type CapabilityInput,
    describeModule,
    describeModuleForItem,
    describeModuleForSlot,
    type ModuleDescription,
    renderDescription,
    setTranslator,
    type ResolvedItem,
    type ResolvedModuleSlot,
} from '../../src/index-module'

describe('describeModule', () => {
    test('Engine produces the expected description', () => {
        const input: CapabilityInput = {
            key: 'engine',
            attributes: [
                {key: 'thrust', value: 1025},
                {key: 'drain', value: 40},
            ],
        }
        const desc = describeModule(input)
        expect(desc).not.toBeNull()
        expect(desc?.id).toBe('module.engine.description')
        expect(desc?.template).toBe(
            'generates {thrust} thrust for travel while draining {drain} energy per distance travelled'
        )
        expect(desc?.params).toEqual({thrust: 1025, drain: 40})
        expect(desc?.highlightKeys).toEqual(['thrust', 'drain'])
    })

    test('Generator produces the expected description', () => {
        const desc = describeModule({
            key: 'generator',
            attributes: [
                {key: 'capacity', value: 450},
                {key: 'recharge', value: 197},
            ],
        })
        expect(desc?.id).toBe('module.generator.description')
        expect(desc?.template).toBe(
            'holds {capacity} maximum energy and restores {recharge} energy each minute while recharging'
        )
        expect(desc?.params).toEqual({capacity: 450, recharge: 197})
        expect(desc?.highlightKeys).toEqual(['capacity', 'recharge'])
    })

    test('Gatherer produces the expected description', () => {
        const desc = describeModule({
            key: 'gatherer',
            attributes: [
                {key: 'yield', value: 600},
                {key: 'drain', value: 300},
                {key: 'depth', value: 350},
            ],
        })
        expect(desc?.id).toBe('module.gatherer.description')
        expect(desc?.template).toBe(
            'mines resources at {yield} yield to a max depth of {depth} while draining {drain} energy per minute'
        )
        expect(desc?.params).toEqual({yield: 600, drain: 1.8, depth: 350})
        expect(desc?.highlightKeys).toEqual(['yield', 'depth', 'drain'])
    })

    test('Loader produces the expected description', () => {
        const desc = describeModule({
            key: 'loading',
            attributes: [
                {key: 'payload', value: 705},
                {key: 'thrust', value: 100},
                {key: 'quantity', value: 1},
            ],
        })
        expect(desc?.id).toBe('module.loading.description')
        expect(desc?.template).toBe(
            'generates {thrust} thrust and launches loads that are {payload}% cargo'
        )
        expect(desc?.params).toEqual({thrust: 100, payload: 70.5})
        expect(desc?.highlightKeys).toEqual(['thrust', 'payload'])
    })

    test('Crafter produces the expected description', () => {
        const desc = describeModule({
            key: 'crafting',
            attributes: [
                {key: 'speed', value: 580},
                {key: 'drain', value: 15},
            ],
        })
        expect(desc?.id).toBe('module.crafting.description')
        expect(desc?.template).toBe(
            'manufactures items at {speed} speed while draining {drain} energy per minute'
        )
        expect(desc?.params).toEqual({speed: 580, drain: 3.5})
        expect(desc?.highlightKeys).toEqual(['speed', 'drain'])
    })

    test('Storage capability produces the Cargo Bay capacity description', () => {
        const desc = describeModule({
            key: 'storage',
            attributes: [{key: 'cargo-capacity', value: 60_000_000}],
        })
        expect(desc?.id).toBe('module.storage.description')
        expect(desc?.template).toBe('adds {capacity} cargo capacity')
        expect(desc?.params).toEqual({capacity: 60_000_000})
        expect(desc?.highlightKeys).toEqual(['capacity'])
    })

    test('Energy capability with only Energy Capacity produces the Battery Bank description', () => {
        const desc = describeModule({
            key: 'energy',
            attributes: [{key: 'energy-capacity', value: 10_000}],
        })
        expect(desc?.id).toBe('module.energy-capacity.description')
        expect(desc?.template).toBe('adds {capacity} energy capacity')
        expect(desc?.params).toEqual({capacity: 10_000})
        expect(desc?.highlightKeys).toEqual(['capacity'])
    })

    test('Hauler produces the expected description', () => {
        const desc = describeModule({
            key: 'hauling',
            attributes: [
                {key: 'capacity', value: 4},
                {key: 'efficiency', value: 80},
                {key: 'drain', value: 25},
            ],
        })
        expect(desc?.id).toBe('module.hauling.description')
        expect(desc?.template).toBe(
            'locks onto up to {capacity} targets at {efficiency} efficiency while draining {drain} energy per distance travelled per target'
        )
        expect(desc?.params).toEqual({capacity: 4, efficiency: 80, drain: 25})
        expect(desc?.highlightKeys).toEqual(['capacity', 'efficiency', 'drain'])
    })

    test('Unknown capability returns null', () => {
        expect(
            describeModule({key: 'teleporter', attributes: [{key: 'range', value: 99}]})
        ).toBeNull()
    })

    test('Empty attributes returns null', () => {
        expect(describeModule({key: 'engine', attributes: []})).toBeNull()
    })
})

describe('describeModuleForItem', () => {
    test('Non-module ResolvedItem returns null', () => {
        const r = {
            itemId: 101,
            name: 'Crude Ore',
            icon: '',
            tier: 't1',
            mass: 100,
            itemType: 'resource',
        } as unknown as ResolvedItem
        expect(describeModuleForItem(r)).toBeNull()
    })

    test('Module with no attributes returns null', () => {
        const r = {
            itemId: 10106,
            name: 'Hauler Module T1',
            icon: '',
            tier: 't1',
            mass: 0,
            itemType: 'module',
            attributes: undefined,
        } as unknown as ResolvedItem
        expect(describeModuleForItem(r)).toBeNull()
    })

    test('Module with empty primary group returns null', () => {
        const r = {
            itemId: 10106,
            name: 'Hauler Module T1',
            icon: '',
            tier: 't1',
            mass: 0,
            itemType: 'module',
            attributes: [],
        } as unknown as ResolvedItem
        expect(describeModuleForItem(r)).toBeNull()
    })

    test('Happy path equals describeModule on attributes[0]', () => {
        const r = {
            itemId: 10100,
            name: 'Engine T1',
            icon: '',
            tier: 't1',
            mass: 0,
            itemType: 'module',
            attributes: [
                {
                    key: 'engine',
                    attributes: [
                        {key: 'thrust', value: 700},
                        {key: 'drain', value: 45},
                    ],
                },
            ],
        } as unknown as ResolvedItem
        const viaItem = describeModuleForItem(r)
        const viaDirect = describeModule({
            key: 'engine',
            attributes: [
                {key: 'thrust', value: 700},
                {key: 'drain', value: 45},
            ],
        })
        expect(viaItem).toEqual(viaDirect)
    })
})

describe('describeModuleForSlot', () => {
    test('Un-installed slot returns null', () => {
        const slot: ResolvedModuleSlot = {installed: false}
        expect(describeModuleForSlot(slot)).toBeNull()
    })

    test('Slot missing capability key returns null', () => {
        const slot = {
            installed: true,
            attributes: [{key: 'thrust', value: 100}],
        } as unknown as ResolvedModuleSlot
        expect(describeModuleForSlot(slot)).toBeNull()
    })

    test('Slot missing attributes returns null', () => {
        const slot = {
            installed: true,
            name: 'Engine',
        } as unknown as ResolvedModuleSlot
        expect(describeModuleForSlot(slot)).toBeNull()
    })

    test('Happy path equals describeModule with {capability, attributes}', () => {
        const slot = {
            installed: true,
            name: 'Engine',
            capabilityKey: 'engine',
            attributes: [
                {key: 'thrust', value: 598},
                {key: 'drain', value: 47},
            ],
        } as unknown as ResolvedModuleSlot
        const viaSlot = describeModuleForSlot(slot)
        const viaDirect = describeModule({
            key: 'engine',
            attributes: [
                {key: 'thrust', value: 598},
                {key: 'drain', value: 47},
            ],
        })
        expect(viaSlot).toEqual(viaDirect)
    })

    test('describeModuleForSlot uses capability when installed module name differs', () => {
        const slot = {
            installed: true,
            name: 'Cargo Hold',
            capabilityKey: 'storage',
            attributes: [{key: 'cargo-capacity', value: 60_000_000}],
        } as unknown as ResolvedModuleSlot
        const viaSlot = describeModuleForSlot(slot)
        const viaDirect = describeModule({
            key: 'storage',
            attributes: [{key: 'cargo-capacity', value: 60_000_000}],
        })
        expect(viaSlot).toEqual(viaDirect)
    })
})

describe('renderDescription', () => {
    const engineDesc: ModuleDescription = {
        id: 'module.engine.description',
        template:
            'generates {thrust} thrust for travel while draining {drain} energy per distance travelled',
        params: {thrust: 1025, drain: 40},
        highlightKeys: ['thrust', 'drain'],
    }

    test('Default options interpolate + format numbers + mark highlights', () => {
        const spans = renderDescription(engineDesc)
        const text = spans.map((s) => s.text).join('')
        expect(text).toBe(
            'generates 1,025 thrust for travel while draining 40 energy per distance travelled'
        )
        const highlighted = spans.filter((s) => s.highlight).map((s) => s.text)
        expect(highlighted).toEqual(['1,025', '40'])
    })

    test('registered translator swaps template via id', () => {
        setTranslator({
            text: (id, fallback) =>
                id === 'module.engine.description'
                    ? 'génère {thrust} de poussée tout en consommant {drain} énergie par distance'
                    : fallback,
        })
        try {
            const spans = renderDescription(engineDesc)
            const text = spans.map((s) => s.text).join('')
            expect(text).toBe('génère 1,025 de poussée tout en consommant 40 énergie par distance')
        } finally {
            setTranslator(undefined)
        }
    })

    test('registered number formatter applies to params', () => {
        setTranslator({number: (n) => n.toLocaleString('de-DE')})
        try {
            const spans = renderDescription(engineDesc)
            expect(spans.map((s) => s.text).join('')).toBe(
                'generates 1.025 thrust for travel while draining 40 energy per distance travelled'
            )
        } finally {
            setTranslator(undefined)
        }
    })

    test('formatNumber hook swaps number formatting', () => {
        const formatNumber = (n: number) => n.toString().padStart(5, '0')
        const spans = renderDescription(engineDesc, {formatNumber})
        const text = spans.map((s) => s.text).join('')
        expect(text).toBe(
            'generates 01025 thrust for travel while draining 00040 energy per distance travelled'
        )
    })

    test('Missing param key emits literal {paramName} as non-highlighted', () => {
        const desc: ModuleDescription = {
            id: 'test.missing',
            template: 'hello {missing} world',
            params: {},
            highlightKeys: [],
        }
        const spans = renderDescription(desc)
        const text = spans.map((s) => s.text).join('')
        expect(text).toBe('hello {missing} world')
        const highlighted = spans.filter((s) => s.highlight)
        expect(highlighted).toHaveLength(0)
    })

    test('Spans preserve structure for retokenization', () => {
        const spans = renderDescription(engineDesc)
        expect(spans.length).toBeGreaterThanOrEqual(5)
        expect(spans.find((s) => s.text === '1,025')?.highlight).toBe(true)
        expect(spans.find((s) => s.text === '40')?.highlight).toBe(true)
    })
})
