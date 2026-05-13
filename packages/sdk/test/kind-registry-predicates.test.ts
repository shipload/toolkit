import {describe, expect, test} from 'bun:test'
import {Name} from '@wharfkit/antelope'
import {
    ENTITY_CONTAINER,
    ENTITY_EXTRACTOR,
    ENTITY_FACTORY,
    ENTITY_NEXUS,
    ENTITY_SHIP,
    ENTITY_WAREHOUSE,
    isContainer,
    isExtractor,
    isFactory,
    isNexus,
    isShip,
    isWarehouse,
} from '../src/data/kind-registry'

describe('kind-registry predicates and Name constants', () => {
    test('ENTITY_* constants resolve to expected name strings', () => {
        expect(ENTITY_SHIP.toString()).toBe('ship')
        expect(ENTITY_WAREHOUSE.toString()).toBe('warehouse')
        expect(ENTITY_EXTRACTOR.toString()).toBe('extractor')
        expect(ENTITY_FACTORY.toString()).toBe('factory')
        expect(ENTITY_CONTAINER.toString()).toBe('container')
        expect(ENTITY_NEXUS.toString()).toBe('nexus')
    })

    test('isShip narrows correctly', () => {
        expect(isShip({type: ENTITY_SHIP})).toBeTrue()
        expect(isShip({type: ENTITY_WAREHOUSE})).toBeFalse()
        expect(isShip({})).toBeFalse()
    })

    test('isNexus narrows correctly', () => {
        expect(isNexus({type: ENTITY_NEXUS})).toBeTrue()
        expect(isNexus({type: ENTITY_SHIP})).toBeFalse()
    })

    test('each predicate matches its own entity type and only its own', () => {
        const allTypes = [
            ['ship', isShip, ENTITY_SHIP],
            ['warehouse', isWarehouse, ENTITY_WAREHOUSE],
            ['extractor', isExtractor, ENTITY_EXTRACTOR],
            ['factory', isFactory, ENTITY_FACTORY],
            ['container', isContainer, ENTITY_CONTAINER],
            ['nexus', isNexus, ENTITY_NEXUS],
        ] as const

        for (const [name, predicate, constant] of allTypes) {
            expect(predicate({type: constant}), `${name} matches itself`).toBeTrue()
            for (const [, otherPredicate, otherConstant] of allTypes) {
                if (otherConstant === constant) continue
                expect(otherPredicate({type: constant}), `${name} doesn't match other`).toBeFalse()
            }
        }
    })
})
