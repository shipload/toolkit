import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {marketprice, PRECISION, ServerContract} from '$lib'
import {Chains} from '@wharfkit/common'
import {BlockTimestamp, Serializer, UInt64} from '@wharfkit/antelope'
import {Ship} from 'src/ship'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

const server = new ServerContract.Contract({client})
const state = ServerContract.Types.state_row.from({
    enabled: true,
    epoch: 1,
    salt: 1,
    ships: 1,
    seed: '6d1c0555c799c087b843764ab5becff74f626f162e382c918427797072c97e89',
    commit: '6d1c0555c799c087b843764ab5becff74f626f162e382c918427797072c97e89',
})

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
        test('marketprice matches readonly', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const good_id = 1
            const helper = await shipload.marketprice(location, good_id)
            const derived = marketprice(
                location,
                good_id,
                '0be1140ada53742f96d665c114fa693bd1512f886b6949b08b570fd70b764e83',
                state
            )
            const api = await server.readonly('marketprice', {
                location,
                good_id,
            })

            console.log(JSON.stringify(derived))
            console.log(JSON.stringify(helper))
            console.log(JSON.stringify(api))
            // assert.isTrue(price.equals(onChainMarketPrice))
        })
    })

    suite('marketp2rices', function () {
        test('marketp2rices matches readonly', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 1}
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
            console.log(state)
            const expectedState = await server.table('state').get()
            console.log(expectedState)

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
            assert.lengthOf(ships, 3)
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

    // TODO: Rewrite so they don't use state that could be changing
    // suite('getCargo', function () {
    //     test('success with ship_row', async function () {
    //         const ship = await server.table('ship').get(UInt64.from(1))
    //         if (!ship) {
    //             throw new Error('No ship found')
    //         }
    //         const cargoItems = await shipload.getCargo(ship)
    //         assert.lengthOf(cargoItems, 1)
    //         const cargoItem = cargoItems[0]
    //         assert.equal(Number(cargoItem.ship_id), 1)
    //         assert.equal(Number(cargoItem.good_id), 14)
    //         assert.equal(Number(cargoItem.owned), 18)
    //     })

    //     test('success with UInt64Type', async function () {
    //         const shipId = UInt64.from(1)
    //         const cargoItems = await shipload.getCargo(shipId)
    //         assert.lengthOf(cargoItems, 1)
    //         const cargoItem = cargoItems[0]
    //         assert.equal(Number(cargoItem.ship_id), 1)
    //         assert.equal(Number(cargoItem.good_id), 14)
    //         assert.equal(Number(cargoItem.owned), 18)
    //     })
    // })
})
