import {assert} from 'chai'

import {
    deserializeAsset,
    deserializeComponent,
    deserializeEntity,
    deserializeModule,
    deserializeResource,
    ITEM_ENGINE_T1,
    ITEM_HULL_PLATES,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '$lib'

suite('NFT deserializers', function () {
    test('deserializeResource: basic round-trip fields', function () {
        const data = {quantity: 10, seed: '12345', origin_x: '100', origin_y: '-50'}
        const result = deserializeResource(data, 26) // iron
        assert.equal(result.item_id, 26)
        assert.equal(result.quantity, 10)
        assert.equal(result.seed, '12345')
        assert.isUndefined(result.modules)
    })

    test('deserializeComponent: basic round-trip fields', function () {
        const data = {
            quantity: 3,
            seed: '9999',
            origin_x: '0',
            origin_y: '0',
            strength: 500,
            density: 200,
        }
        const result = deserializeComponent(data, ITEM_HULL_PLATES)
        assert.equal(result.item_id, ITEM_HULL_PLATES)
        assert.equal(result.quantity, 3)
        assert.equal(result.seed, '9999')
    })

    test('deserializeModule: basic round-trip fields', function () {
        const data = {
            quantity: 1,
            seed: '42',
            origin_x: '0',
            origin_y: '0',
            volatility: 100,
            thermal: 200,
            thrust: 500,
            drain: 10,
        }
        const result = deserializeModule(data, ITEM_ENGINE_T1)
        assert.equal(result.item_id, ITEM_ENGINE_T1)
        assert.equal(result.seed, '42')
    })

    test('deserializeEntity ship T1: reconstitutes 5-slot module array with only slot 0 filled', function () {
        const data = {
            quantity: 1,
            seed: '2864434397',
            origin_x: '0',
            origin_y: '0',
            module_items: [ITEM_ENGINE_T1, 0, 0, 0, 0],
            module_seeds: ['287454020', '0', '0', '0', '0'],
            description: 'Ship T1 - Hull ...',
        }
        const result = deserializeEntity(data, ITEM_SHIP_T1_PACKED)
        assert.equal(result.item_id, ITEM_SHIP_T1_PACKED)
        assert.isArray(result.modules)
        assert.lengthOf(result.modules!, 5)
        assert.deepEqual(result.modules![0].installed, {
            item_id: ITEM_ENGINE_T1,
            seed: '287454020',
        })
        assert.isUndefined(result.modules![1].installed)
        assert.isUndefined(result.modules![4].installed)
    })

    test('deserializeEntity warehouse T1: preserves slot types', function () {
        const data = {
            quantity: 1,
            seed: '100',
            origin_x: '0',
            origin_y: '0',
            module_items: [0, 0, 0, 0, 0],
            module_seeds: ['0', '0', '0', '0', '0'],
        }
        const result = deserializeEntity(data, ITEM_WAREHOUSE_T1_PACKED)
        assert.lengthOf(result.modules!, 5)
        assert.notEqual(result.modules![0].type, result.modules![1].type)
        for (const slot of result.modules!) {
            assert.isUndefined(slot.installed)
        }
    })

    test('deserializeAsset dispatches by item type', function () {
        const resource = deserializeAsset(
            {quantity: 5, seed: '1', origin_x: '0', origin_y: '0'},
            26
        )
        assert.isUndefined(resource.modules)

        const entity = deserializeAsset(
            {
                quantity: 1,
                seed: '1',
                origin_x: '0',
                origin_y: '0',
                module_items: [0, 0, 0, 0, 0],
                module_seeds: ['0', '0', '0', '0', '0'],
            },
            ITEM_SHIP_T1_PACKED
        )
        assert.lengthOf(entity.modules!, 5)
    })
})
