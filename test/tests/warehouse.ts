import {assert} from 'chai'
import {UInt64} from '@wharfkit/antelope'
import {makeWarehouse, ServerContract} from '$lib'

function createMockLoaders() {
    return ServerContract.Types.loader_stats.from({
        mass: 100000,
        quantity: 1,
        thrust: 100,
    })
}

function createCargoItem(goodId: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({
        item_id: goodId,
        quantity,
        modules: [],
    })
}

function makeStationaryWarehouse(cargo: ServerContract.Types.cargo_item[] = []) {
    return makeWarehouse({
        id: 1,
        owner: 'teamgreymass',
        name: 'Test Warehouse',
        coordinates: {x: 5, y: 10, z: 1000},
        capacity: 10000000,
        loaders: createMockLoaders(),
        cargo,
    })
}

function makeWarehouseWithSchedule() {
    return makeWarehouse({
        id: 2,
        owner: 'teamgreymass',
        name: 'Warehouse With Schedule',
        coordinates: {x: 0, y: 0, z: 1200},
        capacity: 10000000,
        loaders: createMockLoaders(),
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

suite('Warehouse', function () {
    suite('sched.hasSchedule', function () {
        test('returns false when warehouse has no schedule', function () {
            const warehouse = makeStationaryWarehouse()
            assert.isFalse(warehouse.sched.hasSchedule)
        })

        test('returns true when warehouse has schedule with tasks', function () {
            const warehouse = makeWarehouseWithSchedule()
            assert.isTrue(warehouse.sched.hasSchedule)
        })
    })

    suite('isIdle', function () {
        test('returns true when warehouse has no schedule', function () {
            const warehouse = makeStationaryWarehouse()
            assert.isTrue(warehouse.isIdle)
        })

        test('returns false when warehouse has schedule', function () {
            const warehouse = makeWarehouseWithSchedule()
            assert.isFalse(warehouse.isIdle)
        })
    })

    suite('location', function () {
        test('returns Location object', function () {
            const warehouse = makeStationaryWarehouse()
            const loc = warehouse.location
            assert.equal(loc.coordinates.x.toNumber(), 5)
            assert.equal(loc.coordinates.y.toNumber(), 10)
        })
    })

    suite('orbitalAltitude', function () {
        test('returns z coordinate', function () {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.orbitalAltitude, 1000)
        })

        test('returns 0 when z is undefined', function () {
            const warehouse = makeWarehouse({
                id: 1,
                owner: 'teamgreymass',
                name: 'Test Warehouse',
                coordinates: {x: 5, y: 10},
                capacity: 10000000,
                loaders: createMockLoaders(),
            })
            assert.equal(warehouse.orbitalAltitude, 0)
        })
    })

    suite('cargo management', function () {
        test('cargo returns empty array when no cargo', function () {
            const warehouse = makeStationaryWarehouse()
            assert.deepEqual(warehouse.cargo, [])
        })

        test('cargo returns cargo items when provided', function () {
            const cargo1 = createCargoItem(1, 100)
            const cargo2 = createCargoItem(3, 50)
            const warehouse = makeStationaryWarehouse([cargo1, cargo2])
            assert.lengthOf(warehouse.cargo, 2)
        })

        test('totalCargoMass returns 0 when no cargo', function () {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.totalCargoMass.toNumber(), 0)
        })

        test('totalCargoMass calculates mass of all cargo', function () {
            const cargo = createCargoItem(1, 100)
            const warehouse = makeStationaryWarehouse([cargo])
            assert.isTrue(warehouse.totalCargoMass.gt(UInt64.from(0)))
        })

        test('getCargoForItem returns undefined when no cargo', function () {
            const warehouse = makeStationaryWarehouse()
            assert.isUndefined(warehouse.getCargoForItem(1))
        })

        test('getCargoForItem returns cargo for good', function () {
            const cargo = createCargoItem(1, 100)
            const warehouse = makeStationaryWarehouse([cargo])
            const found = warehouse.getCargoForItem(1)
            assert.isDefined(found)
            assert.isTrue(found!.item_id.equals(1))
        })
    })

    suite('availableCapacity', function () {
        test('returns full capacity when empty', function () {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.availableCapacity.toNumber(), 10000000)
        })

        test('returns reduced capacity when cargo loaded', function () {
            const cargo = createCargoItem(1, 100)
            const warehouse = makeStationaryWarehouse([cargo])
            assert.isTrue(warehouse.availableCapacity.lt(UInt64.from(10000000)))
        })
    })

    suite('hasSpace', function () {
        test('returns true when space available', function () {
            const warehouse = makeStationaryWarehouse()
            assert.isTrue(warehouse.hasSpace(UInt64.from(1000), 10))
        })

        test('returns false when no space', function () {
            const warehouse = makeStationaryWarehouse()
            assert.isFalse(warehouse.hasSpace(UInt64.from(10000000), 10))
        })
    })

    suite('isFull', function () {
        test('returns false when not full', function () {
            const warehouse = makeStationaryWarehouse()
            assert.isFalse(warehouse.isFull)
        })
    })

    suite('coordinates', function () {
        test('returns raw coordinates from entity', function () {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.coordinates.x.toNumber(), 5)
            assert.equal(warehouse.coordinates.y.toNumber(), 10)
        })
    })

    suite('schedule methods', function () {
        test('sched.duration returns total task duration', function () {
            const warehouse = makeWarehouseWithSchedule()
            assert.equal(warehouse.sched.duration(), 100)
        })

        test('sched.duration returns 0 when no schedule', function () {
            const warehouse = makeStationaryWarehouse()
            assert.equal(warehouse.sched.duration(), 0)
        })

        test('sched.elapsed calculates elapsed time', function () {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.sched.elapsed(now), 50)
        })

        test('sched.remaining calculates remaining time', function () {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.sched.remaining(now), 50)
        })

        test('sched.complete returns false when not complete', function () {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.isFalse(warehouse.sched.complete(now))
        })

        test('sched.complete returns true when complete', function () {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:45:00.000Z')
            assert.isTrue(warehouse.sched.complete(now))
        })

        test('sched.currentTaskIndex returns correct task', function () {
            const warehouse = makeWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.sched.currentTaskIndex(now), 0)
        })

        test('sched.currentTaskIndex returns -1 when no schedule', function () {
            const warehouse = makeStationaryWarehouse()
            const now = new Date()
            assert.equal(warehouse.sched.currentTaskIndex(now), -1)
        })
    })
})
