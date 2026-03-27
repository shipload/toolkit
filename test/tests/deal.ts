import {assert} from 'chai'
import {Int64, UInt16, UInt64} from '@wharfkit/antelope'
import {findBestDeal, findDealsForShip, makeShip, ServerContract} from '$lib'
import {Location} from 'src/location'
import {Coordinates, Good, GoodPrice, PRECISION} from 'src/types'

function makeTestShip(overrides: {capacity?: number; hullmass?: number} = {}) {
    return makeShip({
        id: 1,
        owner: 'testplayer',
        name: 'Test Ship',
        coordinates: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
        hullmass: overrides.hullmass ?? 500000,
        capacity: overrides.capacity ?? 1000000000,
        energy: 5000,
        engines: ServerContract.Types.movement_stats.from({
            thrust: 100000,
            drain: 250,
        }),
        generator: ServerContract.Types.energy_stats.from({
            capacity: 5000,
            recharge: 100,
        }),
        loaders: ServerContract.Types.loader_stats.from({
            mass: 100000,
            quantity: 1,
            thrust: 100,
        }),
        cargo: [],
    })
}

function createLocation(x: number, y: number) {
    return Location.from({x: Int64.from(x), y: Int64.from(y)})
}

function createGoodPrice(id: number, price: number, supply: number) {
    const good = Good.from({
        id: UInt16.from(id),
        name: `Good ${id}`,
        description: `Description for good ${id}`,
        base_price: UInt64.from(price),
        mass: UInt64.from(35000).multiplying(PRECISION),
    })
    return GoodPrice.from({
        id: UInt16.from(id),
        good,
        price: UInt64.from(price),
        supply: UInt64.from(supply),
    })
}

suite('deal', function () {
    suite('findDealsForShip', function () {
        test('finds profitable deals at nearby locations', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5), createLocation(10, 10)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 50)]
                }
                if (x === 5) {
                    return [createGoodPrice(1, 150, 100)]
                }
                return [createGoodPrice(1, 200, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices
            )

            assert.isArray(deals)
            assert.isAbove(deals.length, 0)
            assert.isAbove(Number(deals[0].profitPerUnit), 0)
            assert.isAbove(deals[0].profitPerSecond, 0)
        })

        test('returns empty array when no profitable deals', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 50)]
                }
                return [createGoodPrice(1, 50, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices
            )

            assert.isArray(deals)
            assert.equal(deals.length, 0)
        })

        test('filters by minimum profit per second', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(100, 100)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 50)]
                }
                return [createGoodPrice(1, 101, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices,
                {
                    minProfitPerSecond: 1000,
                }
            )

            assert.isArray(deals)
            assert.equal(deals.length, 0)
        })

        test('filters by minimum margin percent', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 50)]
                }
                return [createGoodPrice(1, 105, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices,
                {
                    minMarginPercent: 50,
                }
            )

            assert.isArray(deals)
            assert.equal(deals.length, 0)
        })

        test('limits by player balance', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 500)]
                }
                return [createGoodPrice(1, 200, 1000)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices,
                {
                    playerBalance: 1000,
                }
            )

            assert.isAbove(deals.length, 0)
            assert.isAtMost(Number(deals[0].maxQuantity), 10)
        })

        test('limits by maxDeals option', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [
                createLocation(5, 5),
                createLocation(10, 10),
                createLocation(15, 15),
            ]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 100), createGoodPrice(3, 200, 100)]
                }
                return [createGoodPrice(1, 200, 100), createGoodPrice(3, 400, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices,
                {
                    maxDeals: 2,
                }
            )

            assert.isAtMost(deals.length, 2)
        })

        test('sorts deals by profit per second descending', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5), createLocation(10, 10)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 100)]
                }
                if (x === 5) {
                    return [createGoodPrice(1, 150, 100)]
                }
                return [createGoodPrice(1, 200, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices
            )

            if (deals.length > 1) {
                assert.isAtLeast(deals[0].profitPerSecond, deals[1].profitPerSecond)
            }
        })

        test('skips goods with zero supply', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 0)]
                }
                return [createGoodPrice(1, 200, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices
            )

            assert.equal(deals.length, 0)
        })

        test('skips goods not available at destination', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 50)]
                }
                return [createGoodPrice(3, 200, 100)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices
            )

            assert.equal(deals.length, 0)
        })

        test('respects cargo capacity limits', async function () {
            const ship = makeTestShip({capacity: 1000000, hullmass: 999000})

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 1000)]
                }
                return [createGoodPrice(1, 200, 1000)]
            }

            const deals = await findDealsForShip(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices,
                {
                    playerBalance: 100000,
                }
            )

            if (deals.length > 0) {
                const goodMass = 35000 * PRECISION
                const availableMass = 1000000 - 999000
                const maxBySpace = Math.floor(availableMass / goodMass)
                assert.isAtMost(Number(deals[0].maxQuantity), maxBySpace)
            }
        })
    })

    suite('findBestDeal', function () {
        test('returns the best deal', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5), createLocation(10, 10)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 100)]
                }
                if (x === 5) {
                    return [createGoodPrice(1, 150, 100)]
                }
                return [createGoodPrice(1, 300, 100)]
            }

            const deal = await findBestDeal(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices
            )

            assert.isDefined(deal)
            assert.isAbove(deal!.profitPerSecond, 0)
        })

        test('returns undefined when no deals available', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 50)]
                }
                return [createGoodPrice(1, 50, 100)]
            }

            const deal = await findBestDeal(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices
            )

            assert.isUndefined(deal)
        })

        test('passes options to findDealsForShip', async function () {
            const ship = makeTestShip()

            const getNearbyLocations = async () => [createLocation(5, 5)]

            const getMarketPrices = async (loc: Coordinates) => {
                const x = Number(loc.x)
                if (x === 0) {
                    return [createGoodPrice(1, 100, 50)]
                }
                return [createGoodPrice(1, 105, 100)]
            }

            const deal = await findBestDeal(
                ship,
                Coordinates.from(ship.coordinates),
                getNearbyLocations,
                getMarketPrices,
                {
                    minMarginPercent: 50,
                }
            )

            assert.isUndefined(deal)
        })
    })
})
