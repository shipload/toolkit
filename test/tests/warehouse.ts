import {assert} from 'chai'
import {Int64, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '$lib'
import {Warehouse} from 'src/warehouse'
import {Location} from 'src/location'

function createMockLoaders() {
    return ServerContract.Types.loader_stats.from({
        mass: 100000,
        quantity: 1,
        thrust: 100,
    })
}

function createCargoItem(goodId: number, quantity: number, unitCost: number) {
    return ServerContract.Types.cargo_item.from({
        good_id: goodId,
        quantity,
        unit_cost: unitCost,
    })
}

function createStationaryWarehouse(cargo: ServerContract.Types.cargo_item[] = []) {
    return Warehouse.fromState({
        id: 1,
        owner: 'teamgreymass',
        name: 'Test Warehouse',
        location: {x: 5, y: 10, z: 1000},
        capacity: 10000000,
        loaders: createMockLoaders(),
        cargo,
    })
}

function createWarehouseWithSchedule() {
    return Warehouse.fromState({
        id: 2,
        owner: 'teamgreymass',
        name: 'Warehouse With Schedule',
        location: {x: 0, y: 0, z: 1200},
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
    suite('hasSchedule', function () {
        test('returns false when warehouse has no schedule', function () {
            const warehouse = createStationaryWarehouse()
            assert.isFalse(warehouse.hasSchedule)
        })

        test('returns true when warehouse has schedule with tasks', function () {
            const warehouse = createWarehouseWithSchedule()
            assert.isTrue(warehouse.hasSchedule)
        })
    })

    suite('isIdle', function () {
        test('returns true when warehouse has no schedule', function () {
            const warehouse = createStationaryWarehouse()
            assert.isTrue(warehouse.isIdle)
        })

        test('returns false when warehouse has schedule', function () {
            const warehouse = createWarehouseWithSchedule()
            assert.isFalse(warehouse.isIdle)
        })
    })

    suite('currentLocation', function () {
        test('returns coordinates', function () {
            const warehouse = createStationaryWarehouse()
            const loc = warehouse.currentLocation
            assert.isTrue(loc.x.equals(5))
            assert.isTrue(loc.y.equals(10))
        })
    })

    suite('orbitalAltitude', function () {
        test('returns z coordinate', function () {
            const warehouse = createStationaryWarehouse()
            assert.equal(warehouse.orbitalAltitude, 1000)
        })

        test('returns 0 when z is undefined', function () {
            const warehouse = Warehouse.fromState({
                id: 1,
                owner: 'teamgreymass',
                name: 'Test Warehouse',
                location: {x: 5, y: 10},
                capacity: 10000000,
                loaders: createMockLoaders(),
            })
            assert.equal(warehouse.orbitalAltitude, 0)
        })
    })

    suite('cargo management', function () {
        test('cargo returns empty array when no cargo', function () {
            const warehouse = createStationaryWarehouse()
            assert.deepEqual(warehouse.cargo, [])
        })

        test('cargo returns cargo items when provided', function () {
            const cargo1 = createCargoItem(1, 100, 50)
            const cargo2 = createCargoItem(3, 50, 100)
            const warehouse = createStationaryWarehouse([cargo1, cargo2])
            assert.lengthOf(warehouse.cargo, 2)
        })

        test('totalCargoMass returns 0 when no cargo', function () {
            const warehouse = createStationaryWarehouse()
            assert.equal(warehouse.totalCargoMass.toNumber(), 0)
        })

        test('totalCargoMass calculates mass of all cargo', function () {
            const cargo = createCargoItem(1, 100, 50)
            const warehouse = createStationaryWarehouse([cargo])
            assert.isTrue(warehouse.totalCargoMass.gt(UInt64.from(0)))
        })

        test('cargoValue returns 0 when no cargo', function () {
            const warehouse = createStationaryWarehouse()
            assert.equal(warehouse.cargoValue.toNumber(), 0)
        })

        test('cargoValue calculates total cost', function () {
            const cargo = createCargoItem(1, 100, 50)
            const warehouse = createStationaryWarehouse([cargo])
            assert.isTrue(warehouse.cargoValue.gt(UInt64.from(0)))
        })

        test('getCargoForGood returns undefined when no cargo', function () {
            const warehouse = createStationaryWarehouse()
            assert.isUndefined(warehouse.getCargoForGood(1))
        })

        test('getCargoForGood returns cargo for good', function () {
            const cargo = createCargoItem(1, 100, 50)
            const warehouse = createStationaryWarehouse([cargo])
            const found = warehouse.getCargoForGood(1)
            assert.isDefined(found)
            assert.isTrue(found!.good_id.equals(1))
        })
    })

    suite('availableCapacity', function () {
        test('returns full capacity when empty', function () {
            const warehouse = createStationaryWarehouse()
            assert.equal(warehouse.availableCapacity.toNumber(), 10000000)
        })

        test('returns reduced capacity when cargo loaded', function () {
            const cargo = createCargoItem(1, 100, 50)
            const warehouse = createStationaryWarehouse([cargo])
            assert.isTrue(warehouse.availableCapacity.lt(UInt64.from(10000000)))
        })
    })

    suite('hasSpace', function () {
        test('returns true when space available', function () {
            const warehouse = createStationaryWarehouse()
            assert.isTrue(warehouse.hasSpace(UInt64.from(1000), 10))
        })

        test('returns false when no space', function () {
            const warehouse = createStationaryWarehouse()
            assert.isFalse(warehouse.hasSpace(UInt64.from(10000000), 10))
        })
    })

    suite('isFull', function () {
        test('returns false when not full', function () {
            const warehouse = createStationaryWarehouse()
            assert.isFalse(warehouse.isFull)
        })
    })

    suite('locationObject', function () {
        test('returns Location object', function () {
            const warehouse = createStationaryWarehouse()
            const loc = warehouse.locationObject
            assert.equal(loc.coordinates.x.toNumber(), 5)
            assert.equal(loc.coordinates.y.toNumber(), 10)
        })
    })

    suite('setLocation', function () {
        test('sets cached location', function () {
            const warehouse = createStationaryWarehouse()
            const newLoc = Location.from({x: Int64.from(99), y: Int64.from(99)})
            warehouse.setLocation(newLoc)
            assert.equal(warehouse.locationObject.coordinates.x.toNumber(), 99)
        })
    })

    suite('schedule methods', function () {
        test('scheduleDuration returns total task duration', function () {
            const warehouse = createWarehouseWithSchedule()
            assert.equal(warehouse.scheduleDuration(), 100)
        })

        test('scheduleDuration returns 0 when no schedule', function () {
            const warehouse = createStationaryWarehouse()
            assert.equal(warehouse.scheduleDuration(), 0)
        })

        test('scheduleElapsed calculates elapsed time', function () {
            const warehouse = createWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.scheduleElapsed(now), 50)
        })

        test('scheduleRemaining calculates remaining time', function () {
            const warehouse = createWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.scheduleRemaining(now), 50)
        })

        test('scheduleComplete returns false when not complete', function () {
            const warehouse = createWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.isFalse(warehouse.scheduleComplete(now))
        })

        test('scheduleComplete returns true when complete', function () {
            const warehouse = createWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:45:00.000Z')
            assert.isTrue(warehouse.scheduleComplete(now))
        })

        test('currentTaskIndex returns correct task', function () {
            const warehouse = createWarehouseWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(warehouse.currentTaskIndex(now), 0)
        })

        test('currentTaskIndex returns -1 when no schedule', function () {
            const warehouse = createStationaryWarehouse()
            const now = new Date()
            assert.equal(warehouse.currentTaskIndex(now), -1)
        })
    })
})
