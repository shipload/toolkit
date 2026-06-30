import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {Checksum256} from '@wharfkit/antelope'
import {
    EntityClass,
    getEntityClass,
    getPackedEntityType,
    isLocationBuildable,
    ENTITY_SHIP,
    ENTITY_WAREHOUSE,
    ENTITY_CONTAINER,
} from '$lib'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_ORE_T1,
} from '$lib'

const testGameSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)

describe('getEntityClass', () => {
    test('ship maps to OrbitalVessel', () => {
        assert.equal(getEntityClass(ENTITY_SHIP), EntityClass.OrbitalVessel)
    })

    test('container maps to OrbitalVessel', () => {
        assert.equal(getEntityClass(ENTITY_CONTAINER), EntityClass.OrbitalVessel)
    })

    test('warehouse maps to OrbitalStructure', () => {
        assert.equal(getEntityClass(ENTITY_WAREHOUSE), EntityClass.OrbitalStructure)
    })

    test('string "ship" maps to OrbitalVessel', () => {
        assert.equal(getEntityClass('ship'), EntityClass.OrbitalVessel)
    })

    test('string "container" maps to OrbitalVessel', () => {
        assert.equal(getEntityClass('container'), EntityClass.OrbitalVessel)
    })

    test('string "warehouse" maps to OrbitalStructure', () => {
        assert.equal(getEntityClass('warehouse'), EntityClass.OrbitalStructure)
    })

    test('location throws', () => {
        assert.throws(() => getEntityClass('location' as any), /Entity type has no class/)
    })

    test('unknown type throws', () => {
        assert.throws(() => getEntityClass('unknown' as any), /Entity type has no class/)
    })
})

describe('getPackedEntityType', () => {
    test('ITEM_SHIP_T1_PACKED returns ship entity type', () => {
        const result = getPackedEntityType(ITEM_SHIP_T1_PACKED)
        assert.isNotNull(result)
        assert.equal(result!.toString(), 'ship')
    })

    test('ITEM_CONTAINER_T1_PACKED returns container entity type', () => {
        const result = getPackedEntityType(ITEM_CONTAINER_T1_PACKED)
        assert.isNotNull(result)
        assert.equal(result!.toString(), 'container')
    })

    test('ITEM_CONTAINER_T2_PACKED returns container entity type', () => {
        const result = getPackedEntityType(ITEM_CONTAINER_T2_PACKED)
        assert.isNotNull(result)
        assert.equal(result!.toString(), 'container')
    })

    test('ITEM_WAREHOUSE_T1_PACKED returns warehouse entity type', () => {
        const result = getPackedEntityType(ITEM_WAREHOUSE_T1_PACKED)
        assert.isNotNull(result)
        assert.equal(result!.toString(), 'warehouse')
    })

    test('resource item id returns null', () => {
        assert.isNull(getPackedEntityType(ITEM_ORE_T1))
    })

    test('unknown item id returns null', () => {
        assert.isNull(getPackedEntityType(9999))
    })
})

describe('isLocationBuildable', () => {
    test('planet coords return true', () => {
        assert.isTrue(isLocationBuildable(testGameSeed, {x: 1, y: 17}))
    })

    test('asteroid coords return false', () => {
        assert.isFalse(isLocationBuildable(testGameSeed, {x: 0, y: 1}))
    })

    test('nebula coords return false', () => {
        assert.isFalse(isLocationBuildable(testGameSeed, {x: 0, y: -3}))
    })

    test('ice field coords return false', () => {
        assert.isFalse(isLocationBuildable(testGameSeed, {x: -9, y: -5}))
    })

    test('empty coords return false', () => {
        assert.isFalse(isLocationBuildable(testGameSeed, {x: 0, y: 0}))
    })
})
