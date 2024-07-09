import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {PRECISION, ServerContract} from '$lib'
import {Chains} from '@wharfkit/common'
import {BlockTimestamp, Serializer, UInt64} from '@wharfkit/antelope'
import {Ship} from 'src/ship'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

const server = new ServerContract.Contract({client})

suite('Shipload', function () {
    let shipload: Shipload

    setup(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
    })

    suite('marketprice', function () {
        test('should return correct market price', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 10, y: 20}
            const good_id = 1
            const price = await shipload.marketprice(location, good_id)

            const {price: onChainMarketPrice} = await server.readonly('marketprice', {
                location,
                good_id,
            })

            assert.isTrue(price.equals(onChainMarketPrice))
        })
    })

    suite('marketprices', function () {
        test('should return correct market prices for all goods', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 10, y: 20}
            const goodPrices = await shipload.marketprices(location)

            const onChainMarketPrices = await server.readonly('marketprices', {
                location,
            })

            assert.equal(goodPrices.length, onChainMarketPrices.length)
            goodPrices.forEach((goodPrice, index) => {
                assert.isTrue(goodPrice.price.equals(onChainMarketPrices[index].price))
                assert(goodPrice.good.id.equals(onChainMarketPrices[index].id))
            })
        })
    })

    suite('getState', function () {
        test('should return the correct state', async function () {
            const state = await shipload.getState()
            const expectedState = await server.table('state').get()

            assert.deepEqual(state, expectedState)
        })
    })

    suite('hasSystem', function () {
        test('should return true if planet exists', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const hasSystem = await shipload.hasSystem(location)

            assert.isTrue(hasSystem)
        })

        test('should return false if planet does not exist', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 100, y: 100}
            const hasSystem = await shipload.hasSystem(location)

            assert.isFalse(hasSystem)
        })
    })

    suite('getShip', function () {
        test('success', async function () {
            const ship = await server.table('ship').get(UInt64.from(1))
            if (!ship) {
                throw new Error('No ship found')
            }
            const sdkShip = await shipload.getShip(1)
            assert.deepEqual(sdkShip, ship)
        })
    })

    suite('getShips', function () {
        test('success', async function () {
            const ships = await shipload.getShips('wharfkittest')
            assert.isArray(ships)
            assert.lengthOf(ships, 1)
            assert.instanceOf(ships[0], Ship)
        })
    })

    suite('findNearbyPlanets', function () {
        test('should return nearby planets', async function () {
            const origin: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const maxDistance = 1 * PRECISION
            const nearbyPlanets = await shipload.findNearbyPlanets(origin, maxDistance)
            const closestPlanet = nearbyPlanets[0]

            assert.deepEqual(closestPlanet.destination, {x: 0, y: 1})
            assert.equal(Number(closestPlanet.distance), 1 * PRECISION)
            assert.deepEqual(closestPlanet.origin, {
                x: 0,
                y: 0,
            })
        })
    })

    suite('travelplan', function () {
        test('should mirror API output', async function () {
            const ship = await server.table('ship').get()
            if (!ship) {
                throw new Error('Ship not found')
            }

            const api = await server.readonly('travelplan', {
                id: ship.id,
                origin: {x: 0, y: 0},
                destination: {x: 0, y: 1},
                recharge: true,
            })
            const travelplan = await shipload.travelplan(ship, {x: 0, y: 0}, {x: 0, y: 1}, true)

            // The times will be different, so just mock them as the same
            const mockTime = BlockTimestamp.from(0)
            api.departure = mockTime
            travelplan.departure = mockTime

            const result1 = ServerContract.Types.travel_plan.from(travelplan)
            const result2 = ServerContract.Types.travel_plan.from(api)
            assert.isTrue(result1.equals(result2))
        })
    })

    suite('getCargo', function () {
        test('success with ship_row', async function () {
            const ship = await server.table('ship').get(UInt64.from(1))
            if (!ship) {
                throw new Error('No ship found')
            }
            const cargoItems = await shipload.getCargo(ship)
            assert.lengthOf(cargoItems, 1)
            const cargoItem = cargoItems[0]
            assert.equal(Number(cargoItem.ship_id), 1)
            assert.equal(Number(cargoItem.good_id), 14)
            assert.equal(Number(cargoItem.owned), 18)
        })

        test('success with UInt64Type', async function () {
            const shipId = UInt64.from(1)
            const cargoItems = await shipload.getCargo(shipId)
            assert.lengthOf(cargoItems, 1)
            const cargoItem = cargoItems[0]
            assert.equal(Number(cargoItem.ship_id), 1)
            assert.equal(Number(cargoItem.good_id), 14)
            assert.equal(Number(cargoItem.owned), 18)
        })
    })
})
