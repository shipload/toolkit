import {assert} from 'chai'
import {
    getModuleCapabilityType,
    isModuleItem,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    MODULE_ANY,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_HAULER,
    MODULE_LOADER,
    moduleAccepts,
} from '$lib'

suite('modules', () => {
    test('MODULE_ANY accepts any module type', () => {
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_ENGINE))
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_GENERATOR))
    })

    test('typed slot only accepts matching type', () => {
        assert.isTrue(moduleAccepts(MODULE_ENGINE, MODULE_ENGINE))
        assert.isFalse(moduleAccepts(MODULE_ENGINE, MODULE_GENERATOR))
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
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_GATHERER))
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_LOADER))
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_CRAFTER))
    })

    test('typed slots accept matching new types', () => {
        assert.isTrue(moduleAccepts(MODULE_GATHERER, MODULE_GATHERER))
        assert.isFalse(moduleAccepts(MODULE_GATHERER, MODULE_ENGINE))
        assert.isTrue(moduleAccepts(MODULE_LOADER, MODULE_LOADER))
        assert.isFalse(moduleAccepts(MODULE_LOADER, MODULE_GENERATOR))
        assert.isTrue(moduleAccepts(MODULE_CRAFTER, MODULE_CRAFTER))
        assert.isFalse(moduleAccepts(MODULE_CRAFTER, MODULE_GATHERER))
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
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_HAULER))
    })

    test('MODULE_LOADER slot rejects MODULE_HAULER', () => {
        assert.isFalse(moduleAccepts(MODULE_LOADER, MODULE_HAULER))
    })

    test('getModuleCapabilityType returns MODULE_HAULER for ITEM_HAULER_T1', () => {
        assert.equal(getModuleCapabilityType(ITEM_HAULER_T1), MODULE_HAULER)
    })

    test('isModuleItem identifies ITEM_HAULER_T1', () => {
        assert.isTrue(isModuleItem(ITEM_HAULER_T1))
    })
})
