import {assert} from 'chai'
import {Checksum256, UInt64} from '@wharfkit/antelope'
import {Coordinates, ServerContract} from '$lib'
import {Location, toLocation} from 'src/location'
import {Good, GoodPrice, PRECISION} from 'src/types'

const testSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)

const origin = Coordinates.from({x: 0, y: 0})

function createGoodPrice(id: number, price: number, supply: number): GoodPrice {
    const good = Good.from({
        id,
        name: `Good ${id}`,
        description: `Description for good ${id}`,
        base_price: UInt64.from(price),
        mass: UInt64.from(1000).multiplying(PRECISION),
    })
    return GoodPrice.from({
        id,
        good,
        price: UInt64.from(price),
        supply: UInt64.from(supply),
    })
}

function createLocationRow(
    id: number,
    coords: Coordinates,
    epoch: UInt64,
    goodId: number,
    supply: number
) {
    return ServerContract.Types.location_row.from({
        id,
        coordinates: coords,
        epoch,
        good_id: goodId,
        supply,
    })
}

suite('Location', function () {
    suite('constructor and from', function () {
        test('creates Location from coordinates', function () {
            const coords = Coordinates.from({x: 5, y: 10})
            const location = new Location(coords)
            assert.equal(location.coordinates.x.toNumber(), 5)
            assert.equal(location.coordinates.y.toNumber(), 10)
        })

        test('static from creates Location', function () {
            const coords = Coordinates.from({x: 5, y: 10})
            const location = Location.from(coords)
            assert.equal(location.coordinates.x.toNumber(), 5)
            assert.equal(location.coordinates.y.toNumber(), 10)
        })
    })

    suite('hasSystemAt', function () {
        test('returns boolean for system check', function () {
            const location = Location.from(origin)
            const result = location.hasSystemAt(testSeed)
            assert.isBoolean(result)
        })

        test('caches result for same seed', function () {
            const location = Location.from(origin)
            const result1 = location.hasSystemAt(testSeed)
            const result2 = location.hasSystemAt(testSeed)
            assert.equal(result1, result2)
        })

        test('recalculates for different seed', function () {
            const location = Location.from(origin)
            const seed1 = Checksum256.from(
                'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
            )
            const seed2 = Checksum256.from(
                'b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2'
            )
            location.hasSystemAt(seed1)
            location.hasSystemAt(seed2)
        })
    })

    suite('market prices', function () {
        test('marketPrices returns undefined if not cached', function () {
            const location = Location.from(origin)
            assert.isUndefined(location.marketPrices)
        })

        test('setMarketPrices and marketPrices work together', function () {
            const location = Location.from(origin)
            const prices = [createGoodPrice(1, 100, 50), createGoodPrice(3, 200, 30)]
            location.setMarketPrices(prices)
            assert.lengthOf(location.marketPrices!, 2)
        })

        test('getPrice returns price for specific good', function () {
            const location = Location.from(origin)
            const prices = [createGoodPrice(1, 100, 50), createGoodPrice(3, 200, 30)]
            location.setMarketPrices(prices)
            const price = location.getPrice(1)
            assert.isDefined(price)
            assert.equal(price!.price.toNumber(), 100)
        })

        test('getPrice returns undefined for missing good', function () {
            const location = Location.from(origin)
            const prices = [createGoodPrice(1, 100, 50)]
            location.setMarketPrices(prices)
            assert.isUndefined(location.getPrice(99))
        })

        test('getPrice returns undefined if no prices cached', function () {
            const location = Location.from(origin)
            assert.isUndefined(location.getPrice(1))
        })
    })

    suite('findNearby', function () {
        test('returns array of distances', function () {
            const location = Location.from(origin)
            const nearby = location.findNearby(testSeed, 20)
            assert.isArray(nearby)
        })
    })

    suite('equals', function () {
        test('returns true for same coordinates', function () {
            const location1 = Location.from(Coordinates.from({x: 5, y: 10}))
            const location2 = Location.from(Coordinates.from({x: 5, y: 10}))
            assert.isTrue(location1.equals(location2))
        })

        test('returns false for different coordinates', function () {
            const location1 = Location.from(Coordinates.from({x: 5, y: 10}))
            const location2 = Location.from(Coordinates.from({x: 5, y: 11}))
            assert.isFalse(location1.equals(location2))
        })

        test('compares with raw coordinates object', function () {
            const location = Location.from(Coordinates.from({x: 5, y: 10}))
            const coords = Coordinates.from({x: 5, y: 10})
            assert.isTrue(location.equals(coords))
        })
    })

    suite('location rows / supply data', function () {
        test('locationRows returns undefined if not cached', function () {
            const location = Location.from(origin)
            assert.isUndefined(location.locationRows)
        })

        test('setLocationRows and locationRows work together', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [createLocationRow(1, origin, epoch, 1, 100)]
            location.setLocationRows(rows, epoch)
            assert.lengthOf(location.locationRows!, 1)
        })

        test('getSupply returns supply for specific good', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [
                createLocationRow(1, origin, epoch, 1, 100),
                createLocationRow(2, origin, epoch, 3, 50),
            ]
            location.setLocationRows(rows, epoch)
            const supply = location.getSupply(1)
            assert.isDefined(supply)
            assert.equal(supply!.toNumber(), 100)
        })

        test('getSupply returns undefined for missing good', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [createLocationRow(1, origin, epoch, 1, 100)]
            location.setLocationRows(rows, epoch)
            assert.isUndefined(location.getSupply(99))
        })

        test('getSupply returns undefined if no rows cached', function () {
            const location = Location.from(origin)
            assert.isUndefined(location.getSupply(1))
        })

        test('availableGoods returns goods with supply > 0', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [
                createLocationRow(1, origin, epoch, 1, 100),
                createLocationRow(2, origin, epoch, 3, 0),
            ]
            location.setLocationRows(rows, epoch)
            const available = location.availableGoods
            assert.isDefined(available)
            assert.lengthOf(available!, 1)
        })

        test('availableGoods returns undefined if no rows cached', function () {
            const location = Location.from(origin)
            assert.isUndefined(location.availableGoods)
        })

        test('hasGood returns true if supply > 0', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [createLocationRow(1, origin, epoch, 1, 100)]
            location.setLocationRows(rows, epoch)
            assert.isTrue(location.hasGood(1))
        })

        test('hasGood returns false if supply = 0', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [createLocationRow(1, origin, epoch, 1, 0)]
            location.setLocationRows(rows, epoch)
            assert.isFalse(location.hasGood(1))
        })

        test('hasGood returns false if not cached', function () {
            const location = Location.from(origin)
            assert.isFalse(location.hasGood(1))
        })

        test('epoch returns cached epoch', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(42)
            const rows = [createLocationRow(1, origin, epoch, 1, 100)]
            location.setLocationRows(rows, epoch)
            assert.equal(location.epoch!.toNumber(), 42)
        })

        test('epoch returns undefined if not cached', function () {
            const location = Location.from(origin)
            assert.isUndefined(location.epoch)
        })
    })

    suite('cache status', function () {
        test('hasCachedData returns false initially', function () {
            const location = Location.from(origin)
            assert.isFalse(location.hasCachedData)
        })

        test('hasCachedData returns true after setting prices', function () {
            const location = Location.from(origin)
            location.setMarketPrices([createGoodPrice(1, 100, 50)])
            assert.isTrue(location.hasCachedData)
        })

        test('hasCachedData returns true after setting rows', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            location.setLocationRows([createLocationRow(1, origin, epoch, 1, 100)], epoch)
            assert.isTrue(location.hasCachedData)
        })

        test('hasSupplyData returns false initially', function () {
            const location = Location.from(origin)
            assert.isFalse(location.hasSupplyData)
        })

        test('hasSupplyData returns true after setting rows', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            location.setLocationRows([createLocationRow(1, origin, epoch, 1, 100)], epoch)
            assert.isTrue(location.hasSupplyData)
        })
    })

    suite('clearCache', function () {
        test('clears all cached data', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            location.setMarketPrices([createGoodPrice(1, 100, 50)])
            location.setLocationRows([createLocationRow(1, origin, epoch, 1, 100)], epoch)
            assert.isTrue(location.hasCachedData)

            location.clearCache()
            assert.isFalse(location.hasCachedData)
            assert.isUndefined(location.marketPrices)
            assert.isUndefined(location.locationRows)
            assert.isUndefined(location.epoch)
        })
    })

    suite('withUpdatedSupply', function () {
        test('creates new location with updated market price supply', function () {
            const location = Location.from(origin)
            const prices = [createGoodPrice(1, 100, 50)]
            location.setMarketPrices(prices)

            const newLocation = location.withUpdatedSupply(1, -10)
            assert.equal(newLocation.marketPrices![0].supply.toNumber(), 40)
        })

        test('creates new location with increased supply', function () {
            const location = Location.from(origin)
            const prices = [createGoodPrice(1, 100, 50)]
            location.setMarketPrices(prices)

            const newLocation = location.withUpdatedSupply(1, 10)
            assert.equal(newLocation.marketPrices![0].supply.toNumber(), 60)
        })

        test('creates new location with updated location row supply', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [createLocationRow(1, origin, epoch, 1, 100)]
            location.setLocationRows(rows, epoch)

            const newLocation = location.withUpdatedSupply(1, -20)
            assert.equal(newLocation.locationRows![0].supply.toNumber(), 80)
        })

        test('does not modify original location', function () {
            const location = Location.from(origin)
            const prices = [createGoodPrice(1, 100, 50)]
            location.setMarketPrices(prices)

            location.withUpdatedSupply(1, -10)
            assert.equal(location.marketPrices![0].supply.toNumber(), 50)
        })

        test('preserves other goods', function () {
            const location = Location.from(origin)
            const prices = [createGoodPrice(1, 100, 50), createGoodPrice(3, 200, 30)]
            location.setMarketPrices(prices)

            const newLocation = location.withUpdatedSupply(1, -10)
            assert.equal(newLocation.marketPrices![0].supply.toNumber(), 40)
            assert.equal(newLocation.marketPrices![1].supply.toNumber(), 30)
        })

        test('preserves cached system info', function () {
            const location = Location.from(origin)
            location.hasSystemAt(testSeed)

            const newLocation = location.withUpdatedSupply(1, -10)
            assert.isDefined(newLocation)
        })

        test('preserves other location rows when updating one good', function () {
            const location = Location.from(origin)
            const epoch = UInt64.from(1)
            const rows = [
                createLocationRow(1, origin, epoch, 1, 100),
                createLocationRow(2, origin, epoch, 3, 50),
            ]
            location.setLocationRows(rows, epoch)

            const newLocation = location.withUpdatedSupply(1, -20)
            assert.equal(newLocation.locationRows![0].supply.toNumber(), 80)
            assert.equal(newLocation.locationRows![1].supply.toNumber(), 50)
        })
    })
})

suite('toLocation helper', function () {
    test('returns Location unchanged', function () {
        const location = Location.from(Coordinates.from({x: 5, y: 10}))
        const result = toLocation(location)
        assert.strictEqual(result, location)
    })

    test('converts coordinates to Location', function () {
        const coords = Coordinates.from({x: 5, y: 10})
        const result = toLocation(coords)
        assert.instanceOf(result, Location)
        assert.equal(result.coordinates.x.toNumber(), 5)
        assert.equal(result.coordinates.y.toNumber(), 10)
    })
})
