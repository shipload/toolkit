import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {
    ActionsManager,
    EntitiesManager,
    EpochsManager,
    LocationsManager,
    PlayersManager,
    PRECISION,
    ServerContract,
    TradesManager,
} from '$lib'
import {Chains} from '@wharfkit/common'
import {APIClient, UInt64} from '@wharfkit/antelope'
import {Ship} from 'src/ship'
import {Contract} from '@wharfkit/contract'

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

    suite('getters', function () {
        test('client returns APIClient', function () {
            assert.instanceOf(shipload.client, APIClient)
        })

        test('server returns Contract', function () {
            assert.instanceOf(shipload.server, Contract)
        })

        test('platform returns Contract', function () {
            assert.instanceOf(shipload.platform, Contract)
        })

        test('entities returns EntitiesManager', function () {
            assert.instanceOf(shipload.entities, EntitiesManager)
        })

        test('players returns PlayersManager', function () {
            assert.instanceOf(shipload.players, PlayersManager)
        })

        test('locations returns LocationsManager', function () {
            assert.instanceOf(shipload.locations, LocationsManager)
        })

        test('trades returns TradesManager', function () {
            assert.instanceOf(shipload.trades, TradesManager)
        })

        test('epochs returns EpochsManager', function () {
            assert.instanceOf(shipload.epochs, EpochsManager)
        })

        test('actions returns ActionsManager', function () {
            assert.instanceOf(shipload.actions, ActionsManager)
        })
    })

    suite('getMarketPrice', function () {
        test('getMarketPrice matches readonly', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const good_id = 1
            const helper = await shipload.locations.getMarketPrice(location, good_id)
            const api = await server.readonly('getlocation', {
                x: location.x,
                y: location.y,
            })
            const goodInfo = api.goods.find((g) => g.id.equals(good_id))
            assert.isDefined(goodInfo)
            assert.isTrue(helper.price.equals(goodInfo!.price))
        })
    })

    suite('getMarketPrices', function () {
        test('getMarketPrices matches readonly', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 1}
            const goodPrices = await shipload.locations.getMarketPrices(location)

            const onChainLocation = await server.readonly('getlocation', {
                x: location.x,
                y: location.y,
            })

            assert.equal(goodPrices.length, onChainLocation.goods.length)
            goodPrices.forEach((goodPrice: {price: UInt64; good: {id: UInt64}}, index: number) => {
                assert.isTrue(goodPrice.price.equals(onChainLocation.goods[index].price))
                assert(goodPrice.good.id.equals(onChainLocation.goods[index].id))
            })
        })
    })

    suite('getState', function () {
        test('should return GameState with correct values', async function () {
            const state = await shipload.getState()
            const expectedState = await server.table('state').get()

            assert.isDefined(expectedState)
            assert.instanceOf(state, ServerContract.Types.state_row)
            assert.equal(state.enabled, expectedState!.enabled)
            assert.isTrue(state.epoch.equals(expectedState!.epoch))
            assert.isTrue(state.salt.equals(expectedState!.salt))
            assert.isTrue(state.ships.equals(expectedState!.ships))
            assert.isTrue(state.seed.equals(expectedState!.seed))
            assert.isTrue(state.commit.equals(expectedState!.commit))
        })
    })

    suite('hasSystem', function () {
        test('should return true if planet exists', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const hasSystem = await shipload.locations.hasSystem(location)

            assert.isTrue(hasSystem)
        })

        test('should return false if planet does not exist', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 100, y: 100}
            const hasSystem = await shipload.locations.hasSystem(location)

            assert.isFalse(hasSystem)
        })
    })

    suite('getShip', function () {
        test('success', async function () {
            const sdkShip = await shipload.entities.getShip(1)
            assert.instanceOf(sdkShip, Ship)
            assert.isTrue(sdkShip.id.equals(1))
            assert.isDefined(sdkShip.owner)
            assert.isDefined(sdkShip.name)
        })
    })

    suite('getShips', function () {
        test('success', async function () {
            const ships = await shipload.entities.getShips('wharfkittest')
            assert.isArray(ships)
        })
    })

    suite('findNearbyPlanets', function () {
        test('should return nearby planets', async function () {
            const origin: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const maxDistance = 1 * PRECISION
            const nearbyPlanets = await shipload.locations.findNearbyPlanets(origin, maxDistance)
            const closestPlanet = nearbyPlanets[0]

            assert.deepEqual(closestPlanet.destination, {x: 0, y: 1})
            assert.equal(Number(closestPlanet.distance), 1 * PRECISION)
            assert.deepEqual(closestPlanet.origin, {
                x: 0,
                y: 0,
            })
        })
    })
})
