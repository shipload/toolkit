import {describe, expect, test} from 'bun:test'
import {Name} from '@wharfkit/antelope'
import {
    CAP_DEMOLISH,
    CAP_MODULES,
    CAP_UNDEPLOY,
    CAP_WRAP,
    EntityClass,
    getEntityClass,
    getKindMeta,
    getPackedEntityType,
    getTemplateMeta,
    kindCan,
    type EntityTypeName,
} from '../src/data/kind-registry'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../src/data/item-ids'

describe('kind-registry', () => {
    test('getKindMeta returns metadata for each registered kind', () => {
        for (const kind of ['ship', 'warehouse', 'extractor', 'factory', 'container', 'nexus'] as EntityTypeName[]) {
            const meta = getKindMeta(kind)
            expect(meta, `missing kind ${kind}`).toBeDefined()
            expect(meta!.kind.toString()).toBe(kind)
        }
    })

    test('getKindMeta returns undefined for unknown kinds', () => {
        expect(getKindMeta(Name.from('definitely.not'))).toBeUndefined()
    })

    test('ship has wrap | undeploy | modules', () => {
        expect(kindCan('ship', CAP_WRAP)).toBeTrue()
        expect(kindCan('ship', CAP_UNDEPLOY)).toBeTrue()
        expect(kindCan('ship', CAP_MODULES)).toBeTrue()
        expect(kindCan('ship', CAP_DEMOLISH)).toBeFalse()
    })

    test('warehouse has demolish | modules but not wrap', () => {
        expect(kindCan('warehouse', CAP_WRAP)).toBeFalse()
        expect(kindCan('warehouse', CAP_DEMOLISH)).toBeTrue()
        expect(kindCan('warehouse', CAP_MODULES)).toBeTrue()
    })

    test('container has wrap | undeploy but not modules', () => {
        expect(kindCan('container', CAP_WRAP)).toBeTrue()
        expect(kindCan('container', CAP_UNDEPLOY)).toBeTrue()
        expect(kindCan('container', CAP_MODULES)).toBeFalse()
    })

    test('nexus has no capabilities (system kind)', () => {
        expect(kindCan('nexus', CAP_WRAP)).toBeFalse()
        expect(kindCan('nexus', CAP_UNDEPLOY)).toBeFalse()
        expect(kindCan('nexus', CAP_DEMOLISH)).toBeFalse()
        expect(kindCan('nexus', CAP_MODULES)).toBeFalse()
    })

    test('kindCan returns false for unknown kinds rather than throwing', () => {
        expect(kindCan(Name.from('definitely.not'), CAP_MODULES)).toBeFalse()
    })

    test('getEntityClass returns correct class per kind', () => {
        expect(getEntityClass('ship')).toBe(EntityClass.OrbitalVessel)
        expect(getEntityClass('container')).toBe(EntityClass.OrbitalVessel)
        expect(getEntityClass('nexus')).toBe(EntityClass.OrbitalVessel)
        expect(getEntityClass('warehouse')).toBe(EntityClass.PlanetaryStructure)
        expect(getEntityClass('extractor')).toBe(EntityClass.PlanetaryStructure)
        expect(getEntityClass('factory')).toBe(EntityClass.PlanetaryStructure)
    })

    test('getEntityClass throws for unknown kinds', () => {
        expect(() => getEntityClass(Name.from('definitely.not'))).toThrow()
    })

    test('getPackedEntityType resolves item IDs to kinds', () => {
        expect(getPackedEntityType(ITEM_SHIP_T1_PACKED)?.toString()).toBe('ship')
        expect(getPackedEntityType(ITEM_WAREHOUSE_T1_PACKED)?.toString()).toBe('warehouse')
        expect(getPackedEntityType(ITEM_CONTAINER_T1_PACKED)?.toString()).toBe('container')
        expect(getPackedEntityType(ITEM_CONTAINER_T2_PACKED)?.toString()).toBe('container')
    })

    test('getPackedEntityType returns null for non-template item IDs', () => {
        expect(getPackedEntityType(99999)).toBeNull()
    })

    test('getTemplateMeta exposes displayLabel field (may be empty)', () => {
        const t = getTemplateMeta(ITEM_SHIP_T1_PACKED)
        expect(t).toBeDefined()
        expect(typeof t!.displayLabel).toBe('string')
    })
})
