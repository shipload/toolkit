import {describe, expect, test} from 'bun:test'
import {
    EntityClass,
    ENTITY_EXTRACTOR,
    getEntityClass,
    getPackedEntityType,
    isExtractor,
} from '../src/data/kind-registry'
import {ITEM_EXTRACTOR_T1_PACKED} from '../src/data/item-ids'
import {makeExtractor} from '../src/entities/makers'
import {ITEM_GENERATOR_T1, ITEM_GATHERER_T1} from '../src/data/item-ids'
import {MODULE_GATHERER, MODULE_GENERATOR} from '../src/capabilities/modules'
import {computeExtractorCapabilities} from '../src/entities/extractor'
import {computeShipCapabilities, type InstalledModule} from '../src/entities/ship-deploy'
import type {EntitySlot} from '../src/data/recipes-runtime'

describe('extractor entity traits', () => {
    test('getEntityClass("extractor") is PlanetaryStructure', () => {
        expect(getEntityClass('extractor')).toBe(EntityClass.PlanetaryStructure)
    })

    test('getPackedEntityType(ITEM_EXTRACTOR_T1_PACKED) is ENTITY_EXTRACTOR', () => {
        const t = getPackedEntityType(ITEM_EXTRACTOR_T1_PACKED)
        expect(t).not.toBeNull()
        expect(t!.equals(ENTITY_EXTRACTOR)).toBe(true)
    })

    test('isExtractor predicate', () => {
        expect(isExtractor({type: ENTITY_EXTRACTOR})).toBe(true)
        expect(isExtractor({})).toBe(false)
    })
})

describe('makeExtractor', () => {
    test('round-trips with no modules', () => {
        const ext = makeExtractor({
            id: 1n,
            owner: 'alice',
            name: 'Test Extractor',
            coordinates: {x: 0, y: 0, z: 500},
            hullmass: 25000,
            capacity: 1_000_000,
            energy: 0,
        })
        expect(ext.entity_name).toBe('Test Extractor')
        expect(ext.modules.length).toBe(2)
        expect(Number(ext.modules[0].type)).toBe(MODULE_GENERATOR)
        expect(Number(ext.modules[1].type)).toBe(MODULE_GATHERER)
    })

    test('populates capabilities when modules installed', () => {
        const ext = makeExtractor({
            id: 1n,
            owner: 'alice',
            name: 'Test',
            coordinates: {x: 0, y: 0, z: 500},
            hullmass: 25000,
            capacity: 1_000_000,
            energy: 1000,
            modules: [
                {itemId: ITEM_GENERATOR_T1, stats: 0n},
                {itemId: ITEM_GATHERER_T1, stats: 0n},
            ],
        })
        expect(ext.generator).toBeDefined()
        expect(Number(ext.generator!.capacity)).toBeGreaterThan(0)
        expect(ext.gatherer).toBeDefined()
        expect(Number(ext.gatherer!.yield)).toBeGreaterThan(0)
    })
})

describe('computeExtractorCapabilities at 100% multipliers', () => {
    const extractorLayout: EntitySlot[] = [
        {type: 'generator', outputPct: 100},
        {type: 'gatherer', outputPct: 100},
    ]
    const shipLayout: EntitySlot[] = Array.from({length: 5}, () => ({type: 'any', outputPct: 100}))

    test('generator capabilities match ship at same module + 100% slot', () => {
        const modules: InstalledModule[] = [{slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: 0n}]
        const ext = computeExtractorCapabilities(modules, extractorLayout)
        const ship = computeShipCapabilities(modules, shipLayout)
        expect(ext.generator).toEqual(ship.generator)
    })

    test('gatherer capabilities match ship at same module + 100% slot', () => {
        const modules: InstalledModule[] = [{slotIndex: 1, itemId: ITEM_GATHERER_T1, stats: 0n}]
        const ext = computeExtractorCapabilities(modules, extractorLayout)
        const ship = computeShipCapabilities([{...modules[0], slotIndex: 1}], shipLayout)
        expect(ext.gatherer).toEqual(ship.gatherer)
    })
})
