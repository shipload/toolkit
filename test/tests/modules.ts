import {assert} from 'chai'
import {
    getModuleCapabilityType,
    isModuleItem,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    MODULE_ANY,
    MODULE_ENGINE,
    MODULE_GENERATOR,
    moduleAccepts,
} from '$lib'

suite('modules', function () {
    test('MODULE_ANY accepts any module type', function () {
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_ENGINE))
        assert.isTrue(moduleAccepts(MODULE_ANY, MODULE_GENERATOR))
    })

    test('typed slot only accepts matching type', function () {
        assert.isTrue(moduleAccepts(MODULE_ENGINE, MODULE_ENGINE))
        assert.isFalse(moduleAccepts(MODULE_ENGINE, MODULE_GENERATOR))
    })

    test('getModuleCapabilityType returns correct type', function () {
        assert.equal(getModuleCapabilityType(ITEM_ENGINE_T1), MODULE_ENGINE)
        assert.equal(getModuleCapabilityType(ITEM_GENERATOR_T1), MODULE_GENERATOR)
    })

    test('isModuleItem identifies modules', function () {
        assert.isTrue(isModuleItem(ITEM_ENGINE_T1))
        assert.isTrue(isModuleItem(ITEM_GENERATOR_T1))
        assert.isFalse(isModuleItem(10001))
    })
})
