import {assert} from 'chai'
import {ServerContract} from '$lib'
import {Serializer} from '@wharfkit/antelope'
import {Ship} from 'src/ship'

const mockShipState = ServerContract.Types.ship_state.from({
    energy: 5000000,
})

const mockShipStats = ServerContract.Types.ship_stats.from({
    capacity: 5000000,
    drain: 250000,
    mass: 500000000,
    maxmass: 1000000000,
    orbit: 1000,
    recharge: 100000,
    thrust: 10000000,
})

const mockShipLoaders = ServerContract.Types.loader_stats.from({
    mass: 10000000,
    quantity: 1,
    thrust: 10000,
})

const mockTravelPlan = ServerContract.Types.travel_plan.from({
    departure: '2024-06-04T23:41:09.000',
    destination: {x: -2, y: -37},
    distance: 94339,
    flighttime: 43,
    loadtime: 0,
    rechargetime: 23,
    masspenalty: 0,
    mass: 510000000,
    energyusage: 2358475,
})

const mockShip = Ship.from({
    id: 1,
    owner: 'teamgreymass',
    name: 'The Mock Ship',
    location: {x: 0, y: 0},
    skin: 1,
    tier: 1,
    state: mockShipState,
    stats: mockShipStats,
    loaders: mockShipLoaders,
    travelplan: mockTravelPlan,
})

suite('Ship', function () {
    setup(async () => {})

    // test('debug', function () {
    //     console.log(Serializer.objectify(mockShip))
    // })

    test('maxDistance', function () {
        assert.isTrue(mockShip.maxDistance.equals(200000))
        assert.equal(Number(mockShip.maxDistance), 200000)
    })
})
