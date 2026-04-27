import {assert} from 'chai'
import {Int64, UInt32, UInt64} from '@wharfkit/antelope'

import {
    Coordinates,
    encodeStats,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T1,
    makeShip,
    ServerContract,
    Ship,
} from '$lib'

const seed = encodeStats([500, 500, 500, 500])

function mockModules() {
    return [
        {itemId: ITEM_ENGINE_T1, stats: seed},
        {itemId: ITEM_GENERATOR_T1, stats: seed},
        {itemId: ITEM_LOADER_T1, stats: seed},
    ]
}

function createCargoItem(goodId: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({
        item_id: goodId,
        quantity: UInt32.from(quantity),
        stats: UInt64.from(0),
        modules: [],
    })
}

interface ShipOverrides {
    capacity?: number
    energy?: number
    cargo?: ServerContract.Types.cargo_item[]
}

function makeStationaryShip(overrides: ShipOverrides = {}) {
    return makeShip({
        id: UInt64.from(2),
        owner: 'teamgreymass',
        name: 'Stationary Ship',
        coordinates: Coordinates.from({x: Int64.from(5), y: Int64.from(10)}),
        hullmass: 500000,
        capacity: overrides.capacity ?? 1000000000,
        energy: overrides.energy ?? 5000,
        modules: mockModules(),
        cargo: overrides.cargo ?? [],
    })
}

function makeShipWithSchedule() {
    return makeShip({
        id: UInt64.from(3),
        owner: 'teamgreymass',
        name: 'Ship With Schedule',
        coordinates: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
        hullmass: 500000,
        capacity: 1000000000,
        energy: 5000,
        modules: mockModules(),
        cargo: [],
        schedule: ServerContract.Types.schedule.from({
            started: '2024-06-04T23:41:09.000',
            tasks: [
                ServerContract.Types.task.from({
                    type: 3,
                    duration: 100,
                    cancelable: 0,
                    location: {x: 10, y: 20},
                    cargo: [],
                }),
            ],
        }),
    })
}

suite('Ship', function () {
    suite('maxDistance', function () {
        test('calculates max distance from capacity/drain', function () {
            const ship = makeStationaryShip()
            // seed [500,500,500,500] → gen.capacity=383, eng.drain=43 → floor(383/43)*10000 = 80000
            assert.isTrue(ship.maxDistance.equals(80000))
            assert.equal(Number(ship.maxDistance), 80000)
        })
    })

    suite('sched.hasSchedule', function () {
        test('returns false when ship has no schedule', function () {
            const ship = makeStationaryShip()
            assert.isFalse(ship.sched.hasSchedule)
        })

        test('returns true when ship has schedule with tasks', function () {
            const ship = makeShipWithSchedule()
            assert.isTrue(ship.sched.hasSchedule)
        })
    })

    suite('isIdle', function () {
        test('returns true when ship has no schedule', function () {
            const ship = makeStationaryShip()
            assert.isTrue(ship.isIdle)
        })

        test('returns false when ship has schedule', function () {
            const ship = makeShipWithSchedule()
            assert.isFalse(ship.isIdle)
        })
    })

    suite('location', function () {
        test('returns Location object', function () {
            const ship = makeStationaryShip()
            const loc = ship.location
            assert.equal(loc.coordinates.x.toNumber(), 5)
            assert.equal(loc.coordinates.y.toNumber(), 10)
        })
    })

    suite('cargo management', function () {
        test('cargo returns empty array if no cargo', function () {
            const ship = makeStationaryShip()
            assert.deepEqual(ship.cargo, [])
        })

        test('hasSellableCargo returns false if no cargo', function () {
            const ship = makeStationaryShip()
            assert.isFalse(ship.hasSellableCargo)
        })

        test('cargo returns items when ship has cargo', function () {
            const cargo1 = createCargoItem(1, 100)
            const cargo2 = createCargoItem(3, 50)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2]})
            assert.lengthOf(ship.cargo, 2)
            assert.isTrue(ship.hasSellableCargo)
        })

        test('totalCargoMass returns 0 if no cargo', function () {
            const ship = makeStationaryShip()
            assert.equal(ship.totalCargoMass.toNumber(), 0)
        })

        test('totalCargoMass calculates mass of all cargo', function () {
            const cargo = createCargoItem(1, 100)
            const ship = makeStationaryShip({cargo: [cargo]})
            assert.isTrue(ship.totalCargoMass.gt(UInt64.from(0)))
        })

        test('getCargoForItem returns undefined if no cargo', function () {
            const ship = makeStationaryShip()
            assert.isUndefined(ship.getCargoForItem(1))
        })

        test('getCargoForItem returns cargo for good', function () {
            const cargo = createCargoItem(1, 100)
            const ship = makeStationaryShip({cargo: [cargo]})
            const found = ship.getCargoForItem(1)
            assert.isDefined(found)
            assert.isTrue(found!.item_id.equals(1))
        })

        test('sellableCargo returns cargo with quantity > 0', function () {
            const cargo1 = createCargoItem(1, 100)
            const cargo2 = createCargoItem(3, 0)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2]})
            const sellable = ship.sellableCargo
            assert.lengthOf(sellable, 1)
        })

        test('hasSellableCargo returns true when cargo exists', function () {
            const cargo = createCargoItem(1, 100)
            const ship = makeStationaryShip({cargo: [cargo]})
            assert.isTrue(ship.hasSellableCargo)
        })

        test('hasSellableCargo returns false with zero quantity cargo', function () {
            const cargo = createCargoItem(1, 0)
            const ship = makeStationaryShip({cargo: [cargo]})
            assert.isFalse(ship.hasSellableCargo)
        })
    })

    suite('totalMass', function () {
        test('returns ship mass without cargo', function () {
            const ship = makeStationaryShip()
            const mass = ship.totalMass
            assert.isTrue(mass.gt(UInt64.from(0)))
        })

        test('includes cargo mass when present', function () {
            const shipWithoutCargo = makeStationaryShip()
            const massWithoutCargo = shipWithoutCargo.totalMass
            const cargo = createCargoItem(1, 100)
            const shipWithCargo = makeStationaryShip({cargo: [cargo]})
            const massWithCargo = shipWithCargo.totalMass
            assert.isTrue(massWithCargo.gt(massWithoutCargo))
        })
    })

    suite('hasSpace', function () {
        test('returns true when space available', function () {
            const ship = makeStationaryShip()
            assert.isTrue(ship.hasSpace(UInt64.from(1000), 10))
        })

        test('returns false when no space', function () {
            const ship = makeStationaryShip()
            assert.isFalse(ship.hasSpace(UInt64.from(1000000000), 10))
        })
    })

    suite('availableCapacity', function () {
        test('returns available capacity', function () {
            const ship = makeStationaryShip()
            const space = ship.availableCapacity
            assert.isTrue(space.gt(UInt64.from(0)))
        })

        test('returns 0 when full', function () {
            // hullmass=500_000 + loader mass 1000*1 = 501_000 → capacity=501_000 is full
            const ship = makeStationaryShip({capacity: 501000})
            assert.isTrue(ship.availableCapacity.equals(UInt64.from(0)))
        })
    })

    suite('coordinates', function () {
        test('returns raw coordinates from entity', function () {
            const ship = makeStationaryShip()
            assert.equal(ship.coordinates.x.toNumber(), 5)
            assert.equal(ship.coordinates.y.toNumber(), 10)
        })
    })

    suite('isFull', function () {
        test('returns false when not full', function () {
            const ship = makeStationaryShip()
            assert.isFalse(ship.isFull)
        })

        test('returns true when at max mass', function () {
            // hullmass=500_000 + loader mass 1000*1 = 501_000 → capacity=501_000 is full
            const ship = makeStationaryShip({capacity: 501000})
            assert.isTrue(ship.isFull)
        })
    })

    suite('energyPercent', function () {
        test('calculates energy percentage', function () {
            // energy=383 matches gen.capacity=383 for seed [500,500,500,500] → 100%
            const ship = makeStationaryShip({energy: 383})
            assert.equal(ship.energyPercent, 100)
        })
    })

    suite('needsRecharge', function () {
        test('returns false when fully charged', function () {
            // energy=5000 > gen.capacity=383 → fully charged
            const ship = makeStationaryShip()
            assert.isFalse(ship.needsRecharge)
        })

        test('returns true when not fully charged', function () {
            // energy=100 < gen.capacity=383 → needs recharge
            const ship = makeStationaryShip({energy: 100})
            assert.isTrue(ship.needsRecharge)
        })
    })

    suite('hasEnergyFor', function () {
        test('returns true when enough energy', function () {
            const ship = makeStationaryShip()
            assert.isTrue(ship.hasEnergyFor(UInt64.from(10000)))
        })

        test('returns false when insufficient energy', function () {
            const ship = makeStationaryShip()
            assert.isFalse(ship.hasEnergyFor(UInt64.from(100000000)))
        })
    })

    test('Ship constructed from entity_info hydrates modules from Struct field', function () {
        const ei = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 10,
            owner: 'alice',
            entity_name: 'Test',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [
                {type: 1, installed: {item_id: 10100, stats: '0'}},
                {type: 2, installed: undefined},
            ],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        const ship = new Ship(ei)
        assert.lengthOf(ship.modules, 2)
        assert.isDefined(ship.modules[0].installed)
        assert.isUndefined(ship.modules[1].installed)
    })
})
