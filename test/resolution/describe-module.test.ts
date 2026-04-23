import {describe, expect, test} from 'bun:test'
import {
    type CapabilityInput,
    describeModule,
    describeModuleForItem,
    describeModuleForSlot,
    type ModuleDescription,
    renderDescription,
    type ResolvedItem,
    type ResolvedModuleSlot,
} from '../../src/index-module'

describe('describeModule', () => {
    test('Engine produces the expected description', () => {
        const input: CapabilityInput = {
            capability: 'Engine',
            attributes: [
                {label: 'Thrust', value: 1025},
                {label: 'Drain', value: 40},
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
            capability: 'Generator',
            attributes: [
                {label: 'Capacity', value: 450},
                {label: 'Recharge', value: 3},
            ],
        })
        expect(desc?.id).toBe('module.generator.description')
        expect(desc?.template).toBe(
            'holds {capacity} maximum energy and restores {recharge} per second while recharging'
        )
        expect(desc?.params).toEqual({capacity: 450, recharge: 3})
        expect(desc?.highlightKeys).toEqual(['capacity', 'recharge'])
    })

    test('Gatherer produces the expected description', () => {
        const desc = describeModule({
            capability: 'Gatherer',
            attributes: [
                {label: 'Yield', value: 600},
                {label: 'Drain', value: 300},
                {label: 'Depth', value: 350},
                {label: 'Speed', value: 200},
            ],
        })
        expect(desc?.id).toBe('module.gatherer.description')
        expect(desc?.template).toBe(
            'mines resources at {yield} speed to a max depth of {depth} with {speed} gather speed while draining {drain} energy per second'
        )
        expect(desc?.params).toEqual({yield: 600, drain: 300, depth: 350, speed: 200})
        expect(desc?.highlightKeys).toEqual(['yield', 'depth', 'speed', 'drain'])
    })

    test('Loader produces the expected description', () => {
        const desc = describeModule({
            capability: 'Loader',
            attributes: [
                {label: 'Mass', value: 500},
                {label: 'Thrust', value: 100},
                {label: 'Quantity', value: 20},
            ],
        })
        expect(desc?.id).toBe('module.loader.description')
        expect(desc?.template).toBe(
            '{quantity} loader that generates {thrust} thrust with a weight of {mass} per unit'
        )
        expect(desc?.params).toEqual({quantity: 20, thrust: 100, mass: 500})
        expect(desc?.highlightKeys).toEqual(['quantity', 'thrust', 'mass'])
    })

    test('Crafter produces the expected description', () => {
        const desc = describeModule({
            capability: 'Crafter',
            attributes: [
                {label: 'Speed', value: 580},
                {label: 'Drain', value: 15},
            ],
        })
        expect(desc?.id).toBe('module.crafter.description')
        expect(desc?.template).toBe(
            'manufactures items at {speed} speed while draining {drain} energy per second'
        )
        expect(desc?.params).toEqual({speed: 580, drain: 15})
        expect(desc?.highlightKeys).toEqual(['speed', 'drain'])
    })

    test('Storage produces the expected description', () => {
        const desc = describeModule({
            capability: 'Storage',
            attributes: [{label: 'Capacity Bonus', value: 17}],
        })
        expect(desc?.id).toBe('module.storage.description')
        expect(desc?.template).toBe('boosts cargo capacity by {bonus}%')
        expect(desc?.params).toEqual({bonus: 17})
        expect(desc?.highlightKeys).toEqual(['bonus'])
    })

    test('Hauler produces the expected description', () => {
        const desc = describeModule({
            capability: 'Hauler',
            attributes: [
                {label: 'Capacity', value: 4},
                {label: 'Efficiency', value: 80},
                {label: 'Drain', value: 25},
            ],
        })
        expect(desc?.id).toBe('module.hauler.description')
        expect(desc?.template).toBe(
            'locks onto up to {capacity} targets at {efficiency} efficiency while draining {drain} energy per distance travelled per target'
        )
        expect(desc?.params).toEqual({capacity: 4, efficiency: 80, drain: 25})
        expect(desc?.highlightKeys).toEqual(['capacity', 'efficiency', 'drain'])
    })

    test('Unknown capability returns null', () => {
        expect(
            describeModule({capability: 'Teleporter', attributes: [{label: 'Range', value: 99}]})
        ).toBeNull()
    })

    test('Empty attributes returns null', () => {
        expect(describeModule({capability: 'Engine', attributes: []})).toBeNull()
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
                    capability: 'Engine',
                    attributes: [
                        {label: 'Thrust', value: 700},
                        {label: 'Drain', value: 45},
                    ],
                },
            ],
        } as unknown as ResolvedItem
        const viaItem = describeModuleForItem(r)
        const viaDirect = describeModule({
            capability: 'Engine',
            attributes: [
                {label: 'Thrust', value: 700},
                {label: 'Drain', value: 45},
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

    test('Slot missing name returns null', () => {
        const slot = {
            installed: true,
            attributes: [{label: 'Thrust', value: 100}],
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
            attributes: [
                {label: 'Thrust', value: 598},
                {label: 'Drain', value: 47},
            ],
        } as unknown as ResolvedModuleSlot
        const viaSlot = describeModuleForSlot(slot)
        const viaDirect = describeModule({
            capability: 'Engine',
            attributes: [
                {label: 'Thrust', value: 598},
                {label: 'Drain', value: 47},
            ],
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

    test('translate hook swaps template via id', () => {
        const translate = (id: string, fallback: string) =>
            id === 'module.engine.description'
                ? 'génère {thrust} de poussée tout en consommant {drain} énergie par distance'
                : fallback
        const spans = renderDescription(engineDesc, {translate})
        const text = spans.map((s) => s.text).join('')
        expect(text).toBe('génère 1,025 de poussée tout en consommant 40 énergie par distance')
    })

    test('translate hook fallback preserved when it returns the fallback arg', () => {
        const translate = (_id: string, fallback: string) => fallback
        const spans = renderDescription(engineDesc, {translate})
        const text = spans.map((s) => s.text).join('')
        expect(text).toBe(
            'generates 1,025 thrust for travel while draining 40 energy per distance travelled'
        )
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
