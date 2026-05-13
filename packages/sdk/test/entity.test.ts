import {describe, expect, test} from 'bun:test'
import kindRegistry from '../src/data/kind-registry.json'
import {
    EntityClass,
    getEntityClass,
    getKindMeta,
    isContainer,
    isExtractor,
    isFactory,
    isNexus,
    isShip,
    isWarehouse,
} from '../src/data/kind-registry'
import {Entity} from '../src/entities/entity'
import {makeEntity} from '../src/entities/makers'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../src/data/item-ids'

const PREDICATE_BY_KIND: Record<string, (e: {type?: any}) => boolean> = {
    ship: isShip,
    warehouse: isWarehouse,
    extractor: isExtractor,
    factory: isFactory,
    container: isContainer,
    nexus: isNexus,
}

const PACKED_ITEM_BY_KIND: Record<string, number | undefined> = {
    ship: ITEM_SHIP_T1_PACKED,
    warehouse: ITEM_WAREHOUSE_T1_PACKED,
    extractor: ITEM_EXTRACTOR_T1_PACKED,
    factory: ITEM_FACTORY_T1_PACKED,
    container: ITEM_CONTAINER_T1_PACKED,
    nexus: undefined,
}

const baseState = {
    id: 1n,
    owner: 'alice',
    name: 'Test',
    coordinates: {x: 0, y: 0},
}

describe('Entity unification — registry-driven', () => {
    describe('kind traits', () => {
        for (const k of kindRegistry.kinds) {
            test(`${k.kind}: getEntityClass returns a valid class`, () => {
                const cls = getEntityClass(k.kind)
                expect([EntityClass.OrbitalVessel, EntityClass.PlanetaryStructure]).toContain(cls)
            })

            test(`${k.kind}: getKindMeta resolves`, () => {
                const meta = getKindMeta(k.kind)
                expect(meta).toBeDefined()
                expect(meta!.kind.toString()).toBe(k.kind)
            })

            test(`${k.kind}: predicate matches`, () => {
                const predicate = PREDICATE_BY_KIND[k.kind]
                expect(predicate, `no predicate registered for ${k.kind}`).toBeDefined()
                const meta = getKindMeta(k.kind)!
                expect(predicate({type: meta.kind})).toBeTrue()
            })
        }
    })

    describe('makeEntity per kind', () => {
        for (const k of kindRegistry.kinds) {
            const packed = PACKED_ITEM_BY_KIND[k.kind]
            if (packed === undefined) continue

            test(`${k.kind}: makeEntity produces matching kind`, () => {
                const e = makeEntity(packed, {
                    id: 1n,
                    owner: 'alice',
                    name: `Test ${k.kind}`,
                    coordinates: {x: 0, y: 0},
                })
                expect(e).toBeInstanceOf(Entity)
                expect(e.type.toString()).toBe(k.kind)
            })
        }
    })

    describe('makeEntity rejects unknown templates', () => {
        test('throws for unknown packed item IDs', () => {
            expect(() => makeEntity(99999, baseState)).toThrow()
        })
    })

    describe('EntityTypeName drift detection', () => {
        test('every kind in kind-registry.json is in PREDICATE_BY_KIND', () => {
            for (const k of kindRegistry.kinds) {
                expect(PREDICATE_BY_KIND[k.kind], `EntityTypeName missing for ${k.kind}`).toBeDefined()
            }
        })
    })
})
