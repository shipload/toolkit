import {assert} from 'chai'
import {UInt16, UInt64} from '@wharfkit/antelope'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_ENGINE_T1,
    ITEM_EXTRACTOR_T1,
    ITEM_GENERATOR_T1,
    ITEM_HULL_PLATES,
    ITEM_LOADER_T1,
    ITEM_MANUFACTURING_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_THRUSTER_CORE,
    resolveItem,
} from '$lib'

suite('resolveItem', function () {
    test('resolves a resource by item ID without seed', function () {
        const result = resolveItem(UInt16.from(26))
        assert.equal(result.itemType, 'resource')
        assert.isDefined(result.name)
        assert.isDefined(result.tier)
        assert.isDefined(result.category)
        assert.isUndefined(result.stats)
        assert.isUndefined(result.attributes)
    })

    test('resolves a resource with seed and returns stats', function () {
        const result = resolveItem(UInt16.from(26), UInt64.from(12345))
        assert.equal(result.itemType, 'resource')
        assert.isDefined(result.stats)
        assert.isArray(result.stats)
        assert.lengthOf(result.stats!, 3)
        for (const stat of result.stats!) {
            assert.isDefined(stat.key)
            assert.isDefined(stat.label)
            assert.isDefined(stat.abbreviation)
            assert.isNumber(stat.value)
            assert.isDefined(stat.color)
            assert.isDefined(stat.category)
        }
        assert.isUndefined(result.attributes)
    })

    test('resolves a component by item ID', function () {
        const result = resolveItem(UInt16.from(ITEM_HULL_PLATES))
        assert.equal(result.itemType, 'component')
        assert.equal(result.icon, 'HP')
        assert.isUndefined(result.stats)
    })

    test('resolves a component with seed and returns stats', function () {
        const result = resolveItem(UInt16.from(ITEM_THRUSTER_CORE), UInt64.from(99999))
        assert.equal(result.itemType, 'component')
        assert.isDefined(result.stats)
        assert.isAbove(result.stats!.length, 0)
        assert.isUndefined(result.attributes)
    })

    test('resolves a module by item ID', function () {
        const result = resolveItem(UInt16.from(ITEM_ENGINE_T1))
        assert.equal(result.itemType, 'module')
        assert.equal(result.icon, 'EN')
        assert.isUndefined(result.stats)
        assert.isUndefined(result.attributes)
    })

    test('resolves a module with seed and returns attributes', function () {
        const result = resolveItem(UInt16.from(ITEM_ENGINE_T1), UInt64.from(55555))
        assert.equal(result.itemType, 'module')
        assert.isUndefined(result.stats)
        assert.isDefined(result.attributes)
        assert.lengthOf(result.attributes!, 1)
        assert.equal(result.attributes![0].capability, 'Engine')
        const attrNames = result.attributes![0].attributes.map((a) => a.label)
        assert.include(attrNames, 'Thrust')
        assert.include(attrNames, 'Drain')
    })

    test('resolves all module types with correct capability names', function () {
        const expectations: [number, string, string[]][] = [
            [ITEM_ENGINE_T1, 'Engine', ['Thrust', 'Drain']],
            [ITEM_GENERATOR_T1, 'Generator', ['Capacity', 'Recharge']],
            [ITEM_EXTRACTOR_T1, 'Extractor', ['Rate', 'Drain', 'Depth', 'Drill']],
            [ITEM_LOADER_T1, 'Loader', ['Mass', 'Thrust', 'Quantity']],
            [ITEM_MANUFACTURING_T1, 'Manufacturing', ['Speed', 'Drain']],
        ]
        for (const [itemId, capName, attrNames] of expectations) {
            const result = resolveItem(UInt16.from(itemId), UInt64.from(12345))
            assert.lengthOf(result.attributes!, 1, `${capName} should have 1 group`)
            assert.equal(result.attributes![0].capability, capName)
            const labels = result.attributes![0].attributes.map((a) => a.label)
            for (const name of attrNames) {
                assert.include(labels, name, `${capName} missing ${name}`)
            }
        }
    })

    test('resolves a packed entity by item ID', function () {
        const result = resolveItem(UInt16.from(ITEM_CONTAINER_T1_PACKED))
        assert.equal(result.itemType, 'entity')
        assert.isUndefined(result.stats)
    })

    test('resolves a packed ship with seed and returns hull attributes', function () {
        const result = resolveItem(UInt16.from(ITEM_SHIP_T1_PACKED), UInt64.from(77777))
        assert.equal(result.itemType, 'entity')
        assert.isDefined(result.attributes)
        const hullGroup = result.attributes!.find((g) => g.capability === 'Hull')
        assert.isDefined(hullGroup)
        const labels = hullGroup!.attributes.map((a) => a.label)
        assert.include(labels, 'Mass')
        assert.include(labels, 'Capacity')
    })

    test('accepts plain numbers for itemId and seed', function () {
        const result = resolveItem(26, 12345)
        assert.equal(result.itemType, 'resource')
    })
})
