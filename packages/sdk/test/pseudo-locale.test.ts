import {afterEach, describe, expect, test} from 'bun:test'
import {
    computeEntitySheet,
    describeItem,
    describeModuleForItem,
    displayName,
    encodeStats,
    getCapabilityAttributeRows,
    getItem,
    getItems,
    getProducersForAttribute,
    getRecipe,
    getStatMappings,
    getStatMappingsForStat,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_STORAGE_T1,
    ITEM_WORKSHOP_T1_PACKED,
    measureGoal,
    resolveItem,
    SDK_TEXT,
    setTranslator,
    statFlow,
    statFlowByResource,
    statFlowPlates,
} from '../src'

const OPEN = '⟦'
const CLOSE = '⟧'
const NUMBER = '§'

let calls = 0

const pseudo = {
    text: (_id: string, fallback: string) => `${OPEN}${++calls}|${fallback}${CLOSE}`,
    number: (n: number, options?: Intl.NumberFormatOptions) =>
        `${NUMBER}${n.toLocaleString('en-US', options)}`,
}

function normalize(value: unknown): unknown {
    if (typeof value === 'string') return value.replace(/⟦\d+\||[⟦⟧§]/g, '')
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]))
    }
    return value
}

function plain(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? String(v) : v)))
}

function underBoth<T>(run: () => T): {english: unknown; translated: unknown} {
    setTranslator(undefined)
    const english = plain(run())
    setTranslator(pseudo)
    try {
        return {english, translated: plain(run())}
    } finally {
        setTranslator(undefined)
    }
}

function expectSameLogic<T>(run: () => T): void {
    const {english, translated} = underBoth(run)
    expect(normalize(translated)).toEqual(english)
}

const STATS = encodeStats([400, 500, 600, 700, 800, 900])
const crafted = getItems().filter((item) => getRecipe(item.id))

afterEach(() => setTranslator(undefined))

describe('SDK_TEXT', () => {
    test('ids are lowercase dotted keys with English values', () => {
        const ids = Object.keys(SDK_TEXT)
        expect(ids.length).toBeGreaterThan(300)
        for (const id of ids) {
            expect(id).toMatch(/^[a-z0-9-]+(\.[a-zA-Z0-9-]+)+$/)
            expect(SDK_TEXT[id].length).toBeGreaterThan(0)
        }
    })

    test('a registered translator reaches item, family and composed text', () => {
        setTranslator(pseudo)
        expect(getItem(10100).name).toMatch(/^⟦\d+\|Engine⟧$/)
        expect(normalize(displayName({...resolveItem(101), itemType: 'resource'}))).toBe(
            'Crude Ore (T1)'
        )
        expect(displayName({...resolveItem(101), itemType: 'resource'})).toContain(OPEN)
        expect(describeItem(resolveItem(101, STATS))).toContain('§')
    })

    test('clearing the translator restores English', () => {
        setTranslator(pseudo)
        setTranslator(undefined)
        expect(getItem(10100).name).toBe('Engine')
    })
})

describe('logic is independent of display text', () => {
    test('resolveItem and describeModuleForItem', () => {
        expectSameLogic(() =>
            getItems().map((item) => {
                const resolved = resolveItem(item.id, STATS)
                return {resolved, description: describeModuleForItem(resolved)}
            })
        )
    })

    test('module descriptions keep their params under translation', () => {
        const {english, translated} = underBoth(() =>
            getItems()
                .filter((item) => item.type === 'module')
                .map((item) => describeModuleForItem(resolveItem(item.id, STATS))?.params ?? null)
        )
        expect(translated).toEqual(english)
        expect((english as unknown[]).filter(Boolean).length).toBeGreaterThan(0)
    })

    test('stat mappings and capability rows', () => {
        expectSameLogic(() => ({
            mappings: getStatMappings(),
            rows: getCapabilityAttributeRows(),
            producers: getProducersForAttribute('Movement', 'thrust'),
            byKey: getStatMappingsForStat('strength').length,
        }))
    })

    test('stat flow routes and plates', () => {
        expectSameLogic(() =>
            crafted.map((item) => ({
                flow: statFlow(item.id),
                byResource: statFlowByResource(item.id),
                plates: statFlowPlates(item.id),
            }))
        )
    })

    test('goal measures', () => {
        const goals = crafted.filter((item) => item.type === 'module' || item.type === 'entity')
        expectSameLogic(() => goals.map((item) => measureGoal(item.id)))
    })

    test('entity sheets group identical workers', () => {
        expectSameLogic(() => [
            computeEntitySheet({
                itemId: ITEM_WORKSHOP_T1_PACKED,
                modules: [0, 1, 2, 3, 4].map((slotIndex) => ({
                    slotIndex,
                    itemId: ITEM_CRAFTER_T1,
                    stats: STATS,
                })),
            }),
            computeEntitySheet({
                itemId: ITEM_SHIP_T1_PACKED,
                modules: [
                    ITEM_ENGINE_T1,
                    ITEM_GENERATOR_T1,
                    ITEM_GATHERER_T1,
                    ITEM_LOADER_T1,
                    ITEM_STORAGE_T1,
                ].map((itemId, slotIndex) => ({slotIndex, itemId, stats: STATS})),
                cargoMass: 1234,
            }),
        ])
    })
})
