import {describe, expect, test} from 'bun:test'
import {makeEntity} from '../src/entities/makers'
import {Entity} from '../src/entities/entity'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../src/data/item-ids'

const baseState = {
    id: 1n,
    owner: 'alice',
    name: 'Test',
    coordinates: {x: 0, y: 0},
}

describe('makeEntity', () => {
    test('returns an Entity instance', () => {
        const e = makeEntity(ITEM_SHIP_T1_PACKED, baseState)
        expect(e).toBeInstanceOf(Entity)
    })

    test('ship template produces type=ship', () => {
        const e = makeEntity(ITEM_SHIP_T1_PACKED, baseState)
        expect(e.type.toString()).toBe('ship')
    })

    test('warehouse template produces type=warehouse', () => {
        const e = makeEntity(ITEM_WAREHOUSE_T1_PACKED, baseState)
        expect(e.type.toString()).toBe('warehouse')
    })

    test('extractor template produces type=extractor', () => {
        const e = makeEntity(ITEM_EXTRACTOR_T1_PACKED, baseState)
        expect(e.type.toString()).toBe('extractor')
    })

    test('factory template produces type=factory', () => {
        const e = makeEntity(ITEM_FACTORY_T1_PACKED, baseState)
        expect(e.type.toString()).toBe('factory')
    })

    test('container T1 and T2 both produce type=container', () => {
        const t1 = makeEntity(ITEM_CONTAINER_T1_PACKED, baseState)
        const t2 = makeEntity(ITEM_CONTAINER_T2_PACKED, baseState)
        expect(t1.type.toString()).toBe('container')
        expect(t2.type.toString()).toBe('container')
    })

    test('throws for unknown packed item IDs', () => {
        expect(() => makeEntity(99999, baseState)).toThrow()
    })
})
