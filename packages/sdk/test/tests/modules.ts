import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {
    getModuleCapabilityType,
    isModuleItem,
    ITEM_BUILDER_T2,
    ITEM_CRAFTER_T1,
    ITEM_CRAFTER_T2,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_LOADER_T2,
    ITEM_WARP_T2,
    MODULE_ANY,
    MODULE_AUX,
    MODULE_BATTERY,
    MODULE_BUILDER,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_HAULER,
    MODULE_LOADER,
    MODULE_WARP,
    moduleAccepts,
    moduleDisplayName,
} from '$lib'

describe('modules', () => {
    test('MODULE_ANY accepts any module type', () => {
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_ENGINE, false))
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_GENERATOR, false))
    })

    test('typed slot only accepts matching type', () => {
        assert.isTrue(moduleAccepts(MODULE_ENGINE, MODULE_ENGINE, false))
        assert.isFalse(moduleAccepts(MODULE_ENGINE, MODULE_GENERATOR, false))
    })

    test('getModuleCapabilityType returns correct type', () => {
        assert.equal(getModuleCapabilityType(ITEM_ENGINE_T1), MODULE_ENGINE)
        assert.equal(getModuleCapabilityType(ITEM_GENERATOR_T1), MODULE_GENERATOR)
    })

    test('isModuleItem identifies modules', () => {
        assert.isTrue(isModuleItem(ITEM_ENGINE_T1))
        assert.isTrue(isModuleItem(ITEM_GENERATOR_T1))
        assert.isFalse(isModuleItem(10001))
    })

    test('MODULE_ANY accepts new module types', () => {
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_GATHERER, false))
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_LOADER, false))
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_CRAFTER, false))
    })

    test('typed slots accept matching new types', () => {
        assert.isTrue(moduleAccepts(MODULE_GATHERER, MODULE_GATHERER, false))
        assert.isFalse(moduleAccepts(MODULE_GATHERER, MODULE_ENGINE, false))
        assert.isTrue(moduleAccepts(MODULE_LOADER, MODULE_LOADER, false))
        assert.isFalse(moduleAccepts(MODULE_LOADER, MODULE_GENERATOR, false))
        assert.isTrue(moduleAccepts(MODULE_CRAFTER, MODULE_CRAFTER, false))
        assert.isFalse(moduleAccepts(MODULE_CRAFTER, MODULE_GATHERER, false))
    })

    test('getModuleCapabilityType returns correct type for new modules', () => {
        assert.equal(getModuleCapabilityType(ITEM_GATHERER_T1), MODULE_GATHERER)
        assert.equal(getModuleCapabilityType(ITEM_LOADER_T1), MODULE_LOADER)
        assert.equal(getModuleCapabilityType(ITEM_CRAFTER_T1), MODULE_CRAFTER)
    })

    test('isModuleItem identifies new modules', () => {
        assert.isTrue(isModuleItem(ITEM_GATHERER_T1))
        assert.isTrue(isModuleItem(ITEM_LOADER_T1))
        assert.isTrue(isModuleItem(ITEM_CRAFTER_T1))
    })

    test('MODULE_ANY accepts MODULE_HAULER', () => {
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_HAULER, false))
    })

    test('MODULE_LOADER slot rejects MODULE_HAULER', () => {
        assert.isFalse(moduleAccepts(MODULE_LOADER, MODULE_HAULER, false))
    })

    test('getModuleCapabilityType returns MODULE_HAULER for ITEM_HAULER_T1', () => {
        assert.equal(getModuleCapabilityType(ITEM_HAULER_T1), MODULE_HAULER)
    })

    test('isModuleItem identifies ITEM_HAULER_T1', () => {
        assert.isTrue(isModuleItem(ITEM_HAULER_T1))
    })

    test('MODULE_AUX slot on a ship accepts generator, engine, and battery modules', () => {
        assert.isTrue(moduleAccepts(MODULE_AUX, MODULE_GENERATOR, false))
        assert.isTrue(moduleAccepts(MODULE_AUX, MODULE_ENGINE, false))
        assert.isTrue(moduleAccepts(MODULE_AUX, MODULE_BATTERY, false))
    })

    test('MODULE_AUX slot on a structure refuses an engine', () => {
        assert.isTrue(moduleAccepts(MODULE_AUX, MODULE_GENERATOR, true))
        assert.isFalse(moduleAccepts(MODULE_AUX, MODULE_ENGINE, true))
        assert.isTrue(moduleAccepts(MODULE_AUX, MODULE_BATTERY, true))
    })

    test('MODULE_AUX slot rejects MODULE_GATHERER', () => {
        assert.isFalse(moduleAccepts(MODULE_AUX, MODULE_GATHERER, false))
    })

    test('T2 modules missing from the old hand-maintained switch resolve to a real capability type', () => {
        assert.equal(getModuleCapabilityType(ITEM_LOADER_T2), MODULE_LOADER)
        assert.equal(getModuleCapabilityType(ITEM_CRAFTER_T2), MODULE_CRAFTER)
        assert.equal(getModuleCapabilityType(ITEM_WARP_T2), MODULE_WARP)
        assert.equal(getModuleCapabilityType(ITEM_BUILDER_T2), MODULE_BUILDER)
    })

    test('T2 modules missing from the old hand-maintained switch are recognized as modules', () => {
        assert.isTrue(isModuleItem(ITEM_LOADER_T2))
        assert.isTrue(isModuleItem(ITEM_CRAFTER_T2))
        assert.isTrue(isModuleItem(ITEM_WARP_T2))
        assert.isTrue(isModuleItem(ITEM_BUILDER_T2))
    })

    test('T2 modules missing from the old hand-maintained switch get a real display name', () => {
        assert.equal(moduleDisplayName(ITEM_LOADER_T2), 'Shuttle Bay')
        assert.equal(moduleDisplayName(ITEM_CRAFTER_T2), 'Fabricator')
        assert.equal(moduleDisplayName(ITEM_WARP_T2), 'Warp Drive')
        assert.equal(moduleDisplayName(ITEM_BUILDER_T2), 'Assembly Arm')
    })
})
