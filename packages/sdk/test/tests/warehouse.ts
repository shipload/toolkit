import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {UInt64} from '@wharfkit/antelope'
import {encodeStats, ITEM_LOADER_T1, makeWarehouse, ServerContract, Warehouse} from '$lib'

const loaderSeed = encodeStats([500, 500, 500, 500])

function mockLoaderModules() {
    return [{itemId: ITEM_LOADER_T1, stats: loaderSeed}]
}

function createCargoItem(goodId: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({
        item_id: goodId,
        quantity,
        stats: UInt64.from(0),
        modules: [],
    })
}

function makeStationaryWarehouse(cargo: ServerContract.Types.cargo_item[] = []) {
    return makeWarehouse({
        id: UInt64.from(1),
        owner: 'teamgreymass',
        name: 'Test Warehouse',
        coordinates: {x: 5, y: 10, z: 1000},
        capacity: 10000000,
        modules: mockLoaderModules(),
        cargo,
    })
}

function makeWarehouseWithSchedule() {
    return makeWarehouse({
        id: UInt64.from(2),
        owner: 'teamgreymass',
        name: 'Warehouse With Schedule',
        coordinates: {x: 0, y: 0, z: 1200},
        capacity: 10000000,
        modules: mockLoaderModules(),
        schedule: ServerContract.Types.schedule.from({
            started: '2024-06-04T23:41:09.000',
            tasks: [
                ServerContract.Types.task.from({
                    type: 0,
                    duration: 100,
                    cancelable: 0,
                    cargo: [],
                }),
            ],
        }),
    })
}

describe('Warehouse', () => {
    describe('sched.hasSchedule', () => {
        test('returns false when warehouse has no schedule', () => {
            const warehouse = makeStationaryWarehouse()
            assert.isFalse(warehouse.sched.hasSchedule)
        })

        test('returns true when warehouse has schedule with tasks', () => {
            const warehouse = makeWarehouseWithSchedule()
            assert.isTrue(warehouse.sched.hasSchedule)
        })
    })

    describe('isIdle', () => {
        test('returns true when warehouse has no schedule', () => {
            const warehouse = makeStationaryWarehouse()
            assert.isTrue(warehouse.isIdle)
        })

        test('returns false when warehouse has schedule', () => {
            const warehouse = makeWarehouseWithSchedule()
            assert.isFalse(warehouse.isIdle)
        })
    })

    describe('location', () => {
        test('returns Location object', () => {
            const warehouse = makeStationaryWarehouse()
            const loc = warehouse.location
            assert.equal(loc.coordinates.x.toNumber(), 5)
            assert.equal(loc.coordinates.y.toNumber(), 10)
        })
    })

    describe('orbitalAltitude', () => {
        test('returns z coordinate', () => {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.orbitalAltitude, 1000)
        })

        test('returns 0 when z is undefined', () => {
            const warehouse = makeWarehouse({
                id: UInt64.from(1),
                owner: 'teamgreymass',
                name: 'Test Warehouse',
                coordinates: {x: 5, y: 10},
                capacity: 10000000,
                modules: mockLoaderModules(),
            })
            assert.equal(warehouse.orbitalAltitude, 0)
        })
    })

    describe('cargo management', () => {
        test('cargo returns empty array when no cargo', () => {
            const warehouse = makeStationaryWarehouse()
            assert.deepEqual(warehouse.cargo, [])
        })

        test('cargo returns cargo items when provided', () => {
            const cargo1 = createCargoItem(1, 100)
            const cargo2 = createCargoItem(3, 50)
            const warehouse = makeStationaryWarehouse([cargo1, cargo2])
            assert.lengthOf(warehouse.cargo, 2)
        })

        test('totalCargoMass returns 0 when no cargo', () => {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.totalCargoMass.toNumber(), 0)
        })

        test('totalCargoMass calculates mass of all cargo', () => {
            const cargo = createCargoItem(1, 100)
            const warehouse = makeStationaryWarehouse([cargo])
            assert.isTrue(warehouse.totalCargoMass.gt(UInt64.from(0)))
        })

        test('getCargoForItem returns undefined when no cargo', () => {
            const warehouse = makeStationaryWarehouse()
            assert.isUndefined(warehouse.getCargoForItem(1))
        })

        test('getCargoForItem returns cargo for good', () => {
            const cargo = createCargoItem(1, 100)
            const warehouse = makeStationaryWarehouse([cargo])
            const found = warehouse.getCargoForItem(1)
            assert.isDefined(found)
            assert.isTrue(found!.item_id.equals(1))
        })
    })

    describe('availableCapacity', () => {
        test('returns full capacity when empty', () => {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.availableCapacity.toNumber(), 10000000)
        })

        test('returns reduced capacity when cargo loaded', () => {
            const cargo = createCargoItem(1, 100)
            const warehouse = makeStationaryWarehouse([cargo])
            assert.isTrue(warehouse.availableCapacity.lt(UInt64.from(10000000)))
        })
    })

    describe('hasSpace', () => {
        test('returns true when space available', () => {
            const warehouse = makeStationaryWarehouse()
            assert.isTrue(warehouse.hasSpace(UInt64.from(1000), 10))
        })

        test('returns false when no space', () => {
            const warehouse = makeStationaryWarehouse()
            assert.isFalse(warehouse.hasSpace(UInt64.from(10000000), 10))
        })
    })

    describe('isFull', () => {
        test('returns false when not full', () => {
            const warehouse = makeStationaryWarehouse()
            assert.isFalse(warehouse.isFull)
        })
    })

    describe('coordinates', () => {
        test('returns raw coordinates from entity', () => {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.coordinates.x.toNumber(), 5)
            assert.equal(warehouse.coordinates.y.toNumber(), 10)
        })
    })

    describe('schedule methods', () => {
        test('sched.duration returns total task duration', () => {
            const warehouse = makeWarehouseWithSchedule()
            assert.equal(warehouse.sched.duration(), 100)
        })

        test('sched.duration returns 0 when no schedule', () => {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.sched.duration(), 0)
        })

        test('sched.elapsed calculates elapsed time', () => {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.sched.elapsed(now), 50)
        })

        test('sched.remaining calculates remaining time', () => {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.sched.remaining(now), 50)
        })

        test('sched.complete returns false when not complete', () => {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.isFalse(warehouse.sched.complete(now))
        })

        test('sched.complete returns true when complete', () => {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:45:00.000Z')
            assert.isTrue(warehouse.sched.complete(now))
        })

        test('sched.currentTaskIndex returns correct task', () => {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.sched.currentTaskIndex(now), 0)
        })

        test('sched.currentTaskIndex returns -1 when no schedule', () => {
            const warehouse = makeStationaryWarehouse()
            const now = new Date()
            assert.equal(warehouse.sched.currentTaskIndex(now), -1)
        })
    })

    test('Warehouse constructed from entity_info hydrates modules from Struct field', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'warehouse',
            id: 20,
            owner: 'alice',
            entity_name: 'Test WH',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [{type: 4, installed: {item_id: 10200, stats: '0'}}],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        const wh = new Warehouse(ei)
        assert.lengthOf(wh.modules, 1)
        assert.isDefined(wh.modules[0].installed)
    })
})
