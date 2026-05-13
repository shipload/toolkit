import {describe, expect, test} from 'bun:test'
import {
    EntityClass,
    ENTITY_FACTORY,
    getEntityClass,
    getPackedEntityType,
    isFactory,
} from '../src/data/kind-registry'
import {ITEM_FACTORY_T1_PACKED} from '../src/data/item-ids'
import {makeFactory} from '../src/entities/makers'
import {ITEM_GENERATOR_T1, ITEM_CRAFTER_T1} from '../src/data/item-ids'
import {MODULE_CRAFTER, MODULE_GENERATOR} from '../src/capabilities/modules'
import {computeFactoryCapabilities} from '../src/entities/factory'
import {computeShipCapabilities, type InstalledModule} from '../src/entities/ship-deploy'
import type {EntitySlot} from '../src/data/recipes-runtime'

describe('factory entity traits', () => {
    test('getEntityClass("factory") is PlanetaryStructure', () => {
        expect(getEntityClass('factory')).toBe(EntityClass.PlanetaryStructure)
    })

    test('getPackedEntityType(ITEM_FACTORY_T1_PACKED) is ENTITY_FACTORY', () => {
        const t = getPackedEntityType(ITEM_FACTORY_T1_PACKED)
        expect(t).not.toBeNull()
        expect(t!.equals(ENTITY_FACTORY)).toBe(true)
    })

    test('isFactory predicate', () => {
        expect(isFactory({type: ENTITY_FACTORY})).toBe(true)
        expect(isFactory({})).toBe(false)
    })
})

describe('makeFactory', () => {
    test('round-trips with no modules', () => {
        const fac = makeFactory({
            id: 1n,
            owner: 'alice',
            name: 'Test Factory',
            coordinates: {x: 0, y: 0, z: 500},
            hullmass: 25000,
            capacity: 1_000_000,
            energy: 0,
        })
        expect(fac.entity_name).toBe('Test Factory')
        expect(fac.type.equals('factory')).toBe(true)
        expect(fac.modules.length).toBe(2)
        expect(Number(fac.modules[0].type)).toBe(MODULE_GENERATOR)
        expect(Number(fac.modules[1].type)).toBe(MODULE_CRAFTER)
    })

    test('populates capabilities when modules installed', () => {
        const fac = makeFactory({
            id: 1n,
            owner: 'alice',
            name: 'Test',
            coordinates: {x: 0, y: 0, z: 500},
            hullmass: 25000,
            capacity: 1_000_000,
            energy: 1000,
            modules: [
                {itemId: ITEM_GENERATOR_T1, stats: 0n},
                {itemId: ITEM_CRAFTER_T1, stats: 0n},
            ],
        })
        expect(fac.generator).toBeDefined()
        expect(Number(fac.generator!.capacity)).toBeGreaterThan(0)
        expect(fac.crafter).toBeDefined()
        expect(Number(fac.crafter!.speed)).toBeGreaterThan(0)
    })
})

describe('computeFactoryCapabilities at 100% multipliers', () => {
    const factoryLayout: EntitySlot[] = [
        {type: 'generator', outputPct: 100},
        {type: 'crafter', outputPct: 100},
    ]
    const shipLayout: EntitySlot[] = Array.from({length: 5}, () => ({type: 'any', outputPct: 100}))

    test('generator capabilities match ship at same module + 100% slot', () => {
        const modules: InstalledModule[] = [{slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: 0n}]
        const fac = computeFactoryCapabilities(modules, factoryLayout)
        const ship = computeShipCapabilities(modules, shipLayout)
        expect(fac.generator).toEqual(ship.generator)
    })

    test('crafter capabilities match ship at same module + 100% slot', () => {
        const modules: InstalledModule[] = [{slotIndex: 1, itemId: ITEM_CRAFTER_T1, stats: 0n}]
        const fac = computeFactoryCapabilities(modules, factoryLayout)
        const ship = computeShipCapabilities([{...modules[0], slotIndex: 1}], shipLayout)
        expect(fac.crafter).toEqual(ship.crafter)
    })
})
