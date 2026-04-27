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
} from '$lib'
import {Chains} from '@wharfkit/common'
import {APIClient} from '@wharfkit/antelope'
import {Ship} from 'src/ship'
import {Contract} from '@wharfkit/contract'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

const server = new ServerContract.Contract({client})

suite('Shipload', () => {
    let shipload: Shipload

    setup(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
    })

    suite('getters', () => {
        test('client returns APIClient', () => {
            assert.instanceOf(shipload.client, APIClient)
        })

        test('server returns Contract', () => {
            assert.instanceOf(shipload.server, Contract)
        })

        test('platform returns Contract', () => {
            assert.instanceOf(shipload.platform, Contract)
        })

        test('entities returns EntitiesManager', () => {
            assert.instanceOf(shipload.entities, EntitiesManager)
        })

        test('players returns PlayersManager', () => {
            assert.instanceOf(shipload.players, PlayersManager)
        })

        test('locations returns LocationsManager', () => {
            assert.instanceOf(shipload.locations, LocationsManager)
        })

        test('epochs returns EpochsManager', () => {
            assert.instanceOf(shipload.epochs, EpochsManager)
        })

        test('actions returns ActionsManager', () => {
            assert.instanceOf(shipload.actions, ActionsManager)
        })
    })

    suite('getState', () => {
        test('should return GameState with correct values', async () => {
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

    suite('hasSystem', () => {
        test('should return true if planet exists', async () => {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const hasSystem = await shipload.locations.hasSystem(location)

            assert.isTrue(hasSystem)
        })

        test('should return false if planet does not exist', async () => {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 100, y: 100}
            const hasSystem = await shipload.locations.hasSystem(location)

            assert.isFalse(hasSystem)
        })
    })

    suite('getShip', () => {
        test('success', async () => {
            const sdkShip = await shipload.entities.getShip(1)
            assert.instanceOf(sdkShip, Ship)
            assert.isTrue(sdkShip.id.equals(1))
            assert.isDefined(sdkShip.owner)
            assert.isDefined(sdkShip.name)
        })
    })

    suite('getShips', () => {
        test('success', async () => {
            const ships = await shipload.entities.getShips('wharfkittest')
            assert.isArray(ships)
        })
    })

    suite('findNearbyPlanets', () => {
        test('should return nearby planets', async () => {
            const origin: ServerContract.ActionParams.Type.coordinates = {x: 0, y: 0}
            const maxDistance = 2 * PRECISION
            const nearbyPlanets = await shipload.locations.findNearbyPlanets(origin, maxDistance)
            const closestPlanet = nearbyPlanets[0]

            assert.deepEqual(closestPlanet.destination, {x: -1, y: -1})
            assert.equal(Number(closestPlanet.distance), Math.floor(Math.sqrt(2) * PRECISION))
            assert.deepEqual(closestPlanet.origin, {
                x: 0,
                y: 0,
            })
        })
    })
})
