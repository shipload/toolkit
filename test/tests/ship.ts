import {assert} from 'chai'
import {Int64, UInt32, UInt64} from '@wharfkit/antelope'
import {Coordinates, makeShip, ServerContract} from '$lib'

function createMockEngines() {
    return ServerContract.Types.movement_stats.from({
        thrust: 100000,
        drain: 250,
    })
}

function createMockGenerator() {
    return ServerContract.Types.energy_stats.from({
        capacity: 5000,
        recharge: 100,
    })
}

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
        quantity: UInt32.from(quantity),
        unit_cost: UInt64.from(unitCost),
    })
}

interface ShipOverrides {
    capacity?: number
    energy?: number
    cargo?: ServerContract.Types.cargo_item[]
}

function makeStationaryShip(overrides: ShipOverrides = {}) {
    return makeShip({
        id: 2,
        owner: 'teamgreymass',
        name: 'Stationary Ship',
        coordinates: Coordinates.from({x: Int64.from(5), y: Int64.from(10)}),
        hullmass: 500000,
        capacity: overrides.capacity ?? 1000000000,
        energy: overrides.energy ?? 5000,
        engines: createMockEngines(),
        generator: createMockGenerator(),
        loaders: createMockLoaders(),
        cargo: overrides.cargo ?? [],
    })
}

function makeShipWithSchedule() {
    return makeShip({
        id: 3,
        owner: 'teamgreymass',
        name: 'Ship With Schedule',
        coordinates: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
        hullmass: 500000,
        capacity: 1000000000,
        energy: 5000,
        engines: createMockEngines(),
        generator: createMockGenerator(),
        loaders: createMockLoaders(),
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
            assert.isTrue(ship.maxDistance.equals(200000))
            assert.equal(Number(ship.maxDistance), 200000)
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
            const cargo1 = createCargoItem(1, 100, 50)
            const cargo2 = createCargoItem(3, 50, 100)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2]})
            assert.lengthOf(ship.cargo, 2)
            assert.isTrue(ship.hasSellableCargo)
        })

        test('totalCargoMass returns 0 if no cargo', function () {
            const ship = makeStationaryShip()
            assert.equal(ship.totalCargoMass.toNumber(), 0)
        })

        test('totalCargoMass calculates mass of all cargo', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})
            assert.isTrue(ship.totalCargoMass.gt(UInt64.from(0)))
        })

        test('cargoValue returns 0 if no cargo', function () {
            const ship = makeStationaryShip()
            assert.equal(ship.cargoValue.toNumber(), 0)
        })

        test('cargoValue calculates total cost', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})
            assert.isTrue(ship.cargoValue.gt(UInt64.from(0)))
        })

        test('getCargoForGood returns undefined if no cargo', function () {
            const ship = makeStationaryShip()
            assert.isUndefined(ship.getCargoForGood(1))
        })

        test('getCargoForGood returns cargo for good', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})
            const found = ship.getCargoForGood(1)
            assert.isDefined(found)
            assert.isTrue(found!.good_id.equals(1))
        })

        test('sellableCargo returns cargo with quantity > 0', function () {
            const cargo1 = createCargoItem(1, 100, 50)
            const cargo2 = createCargoItem(3, 0, 100)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2]})
            const sellable = ship.sellableCargo
            assert.lengthOf(sellable, 1)
        })

        test('hasSellableCargo returns true when cargo exists', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})
            assert.isTrue(ship.hasSellableCargo)
        })

        test('hasSellableCargo returns false with zero quantity cargo', function () {
            const cargo = createCargoItem(1, 0, 50)
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
            const cargo = createCargoItem(1, 100, 50)
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
            const ship = makeStationaryShip({capacity: 600000})
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
            const ship = makeStationaryShip({capacity: 600000})
            assert.isTrue(ship.isFull)
        })
    })

    suite('energyPercent', function () {
        test('calculates energy percentage', function () {
            const ship = makeStationaryShip()
            assert.equal(ship.energyPercent, 100)
        })
    })

    suite('needsRecharge', function () {
        test('returns false when fully charged', function () {
            const ship = makeStationaryShip()
            assert.isFalse(ship.needsRecharge)
        })

        test('returns true when not fully charged', function () {
            const ship = makeStationaryShip({energy: 1000})
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

    suite('calculateSaleValue', function () {
        test('returns zeros with no cargo', function () {
            const ship = makeStationaryShip()
            const result = ship.calculateSaleValue(new Map())
            assert.equal(result.revenue.toNumber(), 0)
            assert.equal(result.profit.toNumber(), 0)
            assert.equal(result.cost.toNumber(), 0)
        })

        test('calculates sale value with cargo and prices', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})

            const prices = new Map<number, UInt64>()
            prices.set(1, UInt64.from(100))

            const result = ship.calculateSaleValue(prices)
            assert.isTrue(result.revenue.gt(UInt64.from(0)))
        })

        test('handles missing price for good', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})

            const prices = new Map<number, UInt64>()

            const result = ship.calculateSaleValue(prices)
            assert.equal(result.revenue.toNumber(), 0)
        })

        test('calculates profit correctly', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})

            const prices = new Map<number, UInt64>()
            prices.set(1, UInt64.from(100))

            const result = ship.calculateSaleValue(prices)
            const expectedRevenue = 100 * 100
            const expectedCost = 50 * 100
            const expectedProfit = expectedRevenue - expectedCost

            assert.equal(result.revenue.toNumber(), expectedRevenue)
            assert.equal(result.cost.toNumber(), expectedCost)
            assert.equal(result.profit.toNumber(), expectedProfit)
        })

        test('profit is zero when cost exceeds revenue', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})

            const prices = new Map<number, UInt64>()
            prices.set(1, UInt64.from(10))

            const result = ship.calculateSaleValue(prices)
            assert.equal(result.profit.toNumber(), 0)
        })

        test('skips cargo with zero quantity', function () {
            const cargoWithQty = createCargoItem(1, 100, 50)
            const cargoEmpty = createCargoItem(3, 0, 50)
            const ship = makeStationaryShip({cargo: [cargoWithQty, cargoEmpty]})

            const prices = new Map<number, UInt64>()
            prices.set(1, UInt64.from(100))
            prices.set(3, UInt64.from(200))

            const result = ship.calculateSaleValue(prices)
            const expectedRevenue = 100 * 100
            const expectedCost = 50 * 100
            assert.equal(result.revenue.toNumber(), expectedRevenue)
            assert.equal(result.cost.toNumber(), expectedCost)
        })
    })

    suite('calculateSaleValueFromArray', function () {
        test('converts array to map and calculates', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})

            const prices = [UInt64.from(0), UInt64.from(100)]

            const result = ship.calculateSaleValueFromArray(prices)
            assert.isTrue(result.revenue.gt(UInt64.from(0)))
        })
    })

    suite('afterSellGoods', function () {
        test('returns empty array when no cargo', function () {
            const ship = makeStationaryShip()
            const result = ship.afterSellGoods([{goodId: 1, quantity: 5}])
            assert.lengthOf(result, 0)
        })

        test('decreases quantity by sold amount', function () {
            const cargo1 = createCargoItem(1, 100, 50)
            const cargo2 = createCargoItem(2, 50, 100)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2]})

            const result = ship.afterSellGoods([{goodId: 1, quantity: 30}])

            assert.lengthOf(result, 2)
            assert.equal(result[0].quantity.toNumber(), 70)
            assert.equal(result[1].quantity.toNumber(), 50)
        })

        test('sets quantity to 0 when selling more than available', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})

            const result = ship.afterSellGoods([{goodId: 1, quantity: 150}])

            assert.lengthOf(result, 1)
            assert.equal(result[0].quantity.toNumber(), 0)
        })

        test('only affects goods being sold', function () {
            const cargo1 = createCargoItem(1, 100, 50)
            const cargo2 = createCargoItem(2, 50, 100)
            const cargo3 = createCargoItem(3, 75, 80)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2, cargo3]})

            const result = ship.afterSellGoods([
                {goodId: 1, quantity: 20},
                {goodId: 3, quantity: 75},
            ])

            assert.equal(result[0].quantity.toNumber(), 80)
            assert.equal(result[1].quantity.toNumber(), 50)
            assert.equal(result[2].quantity.toNumber(), 0)
        })

        test('does not modify original cargo', function () {
            const cargo = createCargoItem(1, 100, 50)
            const ship = makeStationaryShip({cargo: [cargo]})

            const result = ship.afterSellGoods([{goodId: 1, quantity: 30}])

            assert.equal(ship.cargo[0].quantity.toNumber(), 100)
            assert.equal(result[0].quantity.toNumber(), 70)
        })
    })

    suite('afterSellAllGoods', function () {
        test('returns empty array when no cargo', function () {
            const ship = makeStationaryShip()
            const result = ship.afterSellAllGoods()
            assert.lengthOf(result, 0)
        })

        test('sets quantity to 0 for all cargo', function () {
            const cargo1 = createCargoItem(1, 100, 50)
            const cargo2 = createCargoItem(2, 50, 100)
            const cargo3 = createCargoItem(3, 75, 80)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2, cargo3]})

            const result = ship.afterSellAllGoods()

            assert.lengthOf(result, 3)
            assert.equal(result[0].quantity.toNumber(), 0)
            assert.equal(result[1].quantity.toNumber(), 0)
            assert.equal(result[2].quantity.toNumber(), 0)
        })

        test('does not modify original cargo', function () {
            const cargo1 = createCargoItem(1, 100, 50)
            const cargo2 = createCargoItem(2, 50, 100)
            const ship = makeStationaryShip({cargo: [cargo1, cargo2]})

            const result = ship.afterSellAllGoods()

            assert.equal(ship.cargo[0].quantity.toNumber(), 100)
            assert.equal(ship.cargo[1].quantity.toNumber(), 50)
            assert.equal(result[0].quantity.toNumber(), 0)
            assert.equal(result[1].quantity.toNumber(), 0)
        })
    })
})
