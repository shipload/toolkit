import {makeClient} from '@wharfkit/mock-data'
import Shipload, {
    calc_ship_mass,
    distanceBetweenCoordinates,
    findNearbyPlanets,
    ServerContract,
} from '$lib'
import {
    calc_acceleration,
    calc_energyusage,
    calc_flighttime,
    calc_loader_acceleration,
    calc_loader_flighttime,
    calc_orbital_altitude,
    calc_rechargetime,
    calc_ship_acceleration,
    calc_ship_flighttime,
    calc_ship_rechargetime,
    calc_transfer_duration,
    calculateFlightTime,
    calculateLoadTimeBreakdown,
    calculateRefuelingTime,
    calculateTransferTime,
    distanceBetweenPoints,
    lerp,
    rotation,
} from 'src/travel'
import {BASE_ORBITAL_MASS, MAX_ORBITAL_ALTITUDE, MIN_ORBITAL_ALTITUDE} from 'src/types'
import {assert} from 'chai'
import {Chains} from '@wharfkit/session'
import {UInt64} from '@wharfkit/antelope'

const client = makeClient('https://jungle4.greymass.com')

const origin = {x: 0, y: 0}
const destination = {x: 0, y: 1}

const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

function createMockShip(
    overrides: Partial<{
        hullmass: number
        capacity: number
        thrust: number
        energy: number
        recharge: number
        drain: number
        loaderQuantity: number
        loaderMass: number
        loaderThrust: number
        locationZ: number
        generatorCapacity: number
        cargomass: number
    }> = {}
) {
    return ServerContract.Types.ship_row.from({
        id: UInt64.from(1),
        owner: 'testplayer',
        name: 'Test Ship',
        seed: UInt64.from(0),
        coordinates: {x: 0, y: 0, z: overrides.locationZ},
        hullmass: overrides.hullmass ?? 100000,
        capacity: overrides.capacity ?? 500000,
        energy: overrides.energy ?? 500,
        cargomass: overrides.cargomass ?? 0,
        engines: {
            thrust: overrides.thrust ?? 1000,
            drain: overrides.drain ?? 1,
        },
        generator: {
            capacity: overrides.generatorCapacity ?? 1000,
            recharge: overrides.recharge ?? 10,
        },
        loaders: {
            quantity: overrides.loaderQuantity ?? 1,
            mass: overrides.loaderMass ?? 5000,
            thrust: overrides.loaderThrust ?? 100,
        },
        modules: [],
    })
}

function createMockCargo(goodId: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({
        item_id: goodId,
        quantity,
        modules: [],
    })
}

suite('travel', function () {
    let shipload: Shipload

    setup(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
    })

    suite('distanceBetweenCoordinates', () => {
        test('0,0 -> 0,1', async () => {
            const distance = distanceBetweenCoordinates(origin, destination)
            assert.equal(Number(distance), 10000)
        })
        test('0,0 -> 5,9', async () => {
            const sdk = distanceBetweenCoordinates(origin, {x: 5, y: 9})
            assert.isAbove(Number(sdk), 0)
        })
    })

    suite('distanceBetweenPoints', () => {
        test('calculates distance between two points', () => {
            const distance = distanceBetweenPoints(0, 0, 3, 4)
            assert.equal(Number(distance), 50000)
        })

        test('handles negative coordinates', () => {
            const distance = distanceBetweenPoints(-3, -4, 0, 0)
            assert.equal(Number(distance), 50000)
        })
    })

    suite('lerp', () => {
        test('returns origin at time 0', () => {
            const result = lerp({x: 0, y: 0}, {x: 10, y: 20}, 0)
            assert.equal(result.x, 0)
            assert.equal(result.y, 0)
        })

        test('returns destination at time 1', () => {
            const result = lerp({x: 0, y: 0}, {x: 10, y: 20}, 1)
            assert.equal(result.x, 10)
            assert.equal(result.y, 20)
        })

        test('returns midpoint at time 0.5', () => {
            const result = lerp({x: 0, y: 0}, {x: 10, y: 20}, 0.5)
            assert.equal(result.x, 5)
            assert.equal(result.y, 10)
        })
    })

    suite('rotation', () => {
        test('calculates rotation angle', () => {
            const angle = rotation({x: 0, y: 0}, {x: 1, y: 0})
            assert.equal(angle, 90)
        })

        test('calculates rotation for vertical movement', () => {
            const angle = rotation({x: 0, y: 0}, {x: 0, y: 1})
            assert.equal(angle, 180)
        })
    })

    suite('findNearbyPlanets', () => {
        test('finds planets within max distance', async () => {
            const game = await shipload.getGame()
            const nearby = findNearbyPlanets(game.config.seed, {x: 0, y: 0}, 20000)
            assert.isArray(nearby)
            assert.isAbove(nearby.length, 0)
        })

        test('excludes origin from results', async () => {
            const game = await shipload.getGame()
            const nearby = findNearbyPlanets(game.config.seed, {x: 0, y: 0}, 50000)
            const hasOrigin = nearby.some((p) => p.destination.x === 0 && p.destination.y === 0)
            assert.isFalse(hasOrigin)
        })
    })

    suite('calc_rechargetime', () => {
        test('calculates time to recharge', () => {
            const time = calc_rechargetime(1000, 500, 10)
            assert.equal(Number(time), 50)
        })

        test('returns 0 when already at capacity', () => {
            const time = calc_rechargetime(1000, 1000, 10)
            assert.equal(Number(time), 0)
        })
    })

    suite('calc_ship_rechargetime', () => {
        test('calculates from ship stats', () => {
            const mockShip = createMockShip({capacity: 1000, energy: 500, recharge: 10})
            const time = calc_ship_rechargetime(mockShip)
            assert.equal(Number(time), 50)
        })
    })

    suite('calc_flighttime', () => {
        test('calculates flight time from distance and acceleration', () => {
            const time = calc_flighttime(UInt64.from(10000), 100)
            assert.isAbove(Number(time), 0)
        })
    })

    suite('calc_loader_flighttime', () => {
        test('calculates loader flight time', () => {
            const mockShip = createMockShip({loaderThrust: 100, loaderMass: 5000, capacity: 500000})
            const time = calc_loader_flighttime(mockShip, UInt64.from(10000))
            assert.isAbove(Number(time), 0)
        })
    })

    suite('calc_loader_acceleration', () => {
        test('calculates loader acceleration', () => {
            const mockShip = createMockShip({loaderThrust: 100, loaderMass: 5000})
            const accel = calc_loader_acceleration(mockShip, UInt64.from(10000))
            assert.isAbove(accel, 0)
        })
    })

    suite('calc_ship_flighttime', () => {
        test('calculates ship flight time', () => {
            const mockShip = createMockShip({thrust: 1000, hullmass: 100000})
            const time = calc_ship_flighttime(mockShip, UInt64.from(100000), UInt64.from(10000))
            assert.isAbove(Number(time), 0)
        })
    })

    suite('calc_ship_acceleration', () => {
        test('calculates ship acceleration', () => {
            const mockShip = createMockShip({thrust: 1000})
            const accel = calc_ship_acceleration(mockShip, UInt64.from(100000))
            assert.isAbove(accel, 0)
        })
    })

    suite('calc_acceleration', () => {
        test('calculates acceleration from thrust and mass', () => {
            const accel = calc_acceleration(1000, 100)
            assert.equal(accel, 100000)
        })
    })

    suite('calc_ship_mass', () => {
        test('calculates mass without cargo', () => {
            const mockShip = createMockShip({hullmass: 100000, loaderQuantity: 1, loaderMass: 5000})
            const mass = calc_ship_mass(mockShip, [])
            assert.equal(Number(mass), 105000)
        })

        test('includes cargo mass', () => {
            const mockShip = createMockShip({hullmass: 100000, loaderQuantity: 0, loaderMass: 0})
            const cargo = createMockCargo(1, 10)
            const mass = calc_ship_mass(mockShip, [cargo])
            assert.isAbove(Number(mass), 100000)
        })

        test('handles ship with no loaders', () => {
            const mockShip = createMockShip({hullmass: 100000, loaderQuantity: 0, loaderMass: 5000})
            const mass = calc_ship_mass(mockShip, [])
            assert.equal(Number(mass), 100000)
        })
    })

    suite('calc_energyusage', () => {
        test('calculates energy usage', () => {
            const energy = calc_energyusage(UInt64.from(10000), 1)
            assert.equal(Number(energy), 1)
        })

        test('increases with distance', () => {
            const energy1 = calc_energyusage(UInt64.from(10000), 1)
            const energy2 = calc_energyusage(UInt64.from(20000), 1)
            assert.isAbove(Number(energy2), Number(energy1))
        })

        test('increases with drain', () => {
            const energy1 = calc_energyusage(UInt64.from(10000), 1)
            const energy2 = calc_energyusage(UInt64.from(10000), 2)
            assert.isAbove(Number(energy2), Number(energy1))
        })
    })

    suite('travel time calculations', () => {
        suite('calculateTransferTime', () => {
            test('returns 0 when no quantities specified', () => {
                const mockShip = createMockShip()
                const cargo = createMockCargo(1, 10)
                const time = calculateTransferTime(mockShip, [cargo])
                assert.equal(Number(time), 0)
            })

            test('calculates time when cargo needs transfer', () => {
                const mockShip = createMockShip()
                const cargo = createMockCargo(1, 20)
                const transferMap = new Map([[1, 10]])
                const time = calculateTransferTime(mockShip, [cargo], transferMap)
                assert.isAbove(Number(time), 0)
            })

            test('returns 0 for empty cargo array', () => {
                const mockShip = createMockShip()
                const time = calculateTransferTime(mockShip, [])
                assert.equal(Number(time), 0)
            })
        })

        suite('calculateRefuelingTime', () => {
            test('returns 0 when fully charged', () => {
                const mockShip = createMockShip({generatorCapacity: 100, energy: 100})
                const time = calculateRefuelingTime(mockShip)
                assert.equal(Number(time), 0)
            })

            test('calculates time when not fully charged', () => {
                const mockShip = createMockShip({generatorCapacity: 100, energy: 50, recharge: 10})
                const time = calculateRefuelingTime(mockShip)
                assert.equal(Number(time), 5)
            })
        })

        suite('calculateFlightTime', () => {
            test('calculates flight time', () => {
                const mockShip = createMockShip({thrust: 1000, hullmass: 100000})
                const time = calculateFlightTime(mockShip, [], UInt64.from(10000))
                assert.isAbove(Number(time), 0)
            })

            test('increases with distance', () => {
                const mockShip = createMockShip({thrust: 1000, hullmass: 100000})
                const time1 = calculateFlightTime(mockShip, [], UInt64.from(10000))
                const time2 = calculateFlightTime(mockShip, [], UInt64.from(20000))
                assert.isAbove(Number(time2), Number(time1))
            })
        })
    })

    suite('calculateLoadTimeBreakdown', () => {
        test('returns zero times for empty cargo', () => {
            const ship = createMockShip()
            const breakdown = calculateLoadTimeBreakdown(ship, [])

            assert.equal(breakdown.unloadTime, 0)
            assert.equal(breakdown.loadTime, 0)
            assert.equal(breakdown.totalTime, 0)
            assert.equal(breakdown.unloadMass, 0)
            assert.equal(breakdown.loadMass, 0)
        })

        test('returns zero times when no load/unload quantities specified', () => {
            const ship = createMockShip()
            const cargos = [createMockCargo(1, 100)]
            const breakdown = calculateLoadTimeBreakdown(ship, cargos)

            assert.equal(breakdown.unloadTime, 0)
            assert.equal(breakdown.loadTime, 0)
            assert.equal(breakdown.totalTime, 0)
            assert.equal(breakdown.unloadMass, 0)
            assert.equal(breakdown.loadMass, 0)
        })

        test('calculates load time when load quantities specified', () => {
            const ship = createMockShip({loaderQuantity: 2})
            const cargos = [createMockCargo(1, 100)]
            const loadMap = new Map([[1, 20]])
            const breakdown = calculateLoadTimeBreakdown(ship, cargos, loadMap)

            assert.isAbove(breakdown.loadTime, 0, 'Should have load time')
            assert.equal(breakdown.unloadTime, 0, 'Should have no unload time')
            assert.equal(breakdown.totalTime, breakdown.loadTime, 'Total should equal load time')
            assert.isAbove(breakdown.loadMass, 0, 'Should have load mass')
            assert.equal(breakdown.unloadMass, 0, 'Should have no unload mass')
        })

        test('calculates unload time when unload quantities specified', () => {
            const ship = createMockShip({loaderQuantity: 2})
            const cargos = [createMockCargo(1, 100)]
            const unloadMap = new Map([[1, 20]])
            const breakdown = calculateLoadTimeBreakdown(ship, cargos, undefined, unloadMap)

            assert.isAbove(breakdown.unloadTime, 0, 'Should have unload time')
            assert.equal(breakdown.loadTime, 0, 'Should have no load time')
            assert.equal(
                breakdown.totalTime,
                breakdown.unloadTime,
                'Total should equal unload time'
            )
            assert.isAbove(breakdown.unloadMass, 0, 'Should have unload mass')
            assert.equal(breakdown.loadMass, 0, 'Should have no load mass')
        })

        test('calculates both unload and load times when both specified', () => {
            const ship = createMockShip({loaderQuantity: 2})
            const cargos = [createMockCargo(1, 100), createMockCargo(26, 50)]
            const loadMap = new Map([[1, 20]])
            const unloadMap = new Map([[26, 50]])
            const breakdown = calculateLoadTimeBreakdown(ship, cargos, loadMap, unloadMap)

            assert.isAbove(breakdown.unloadTime, 0, 'Should have unload time')
            assert.isAbove(breakdown.loadTime, 0, 'Should have load time')
            assert.equal(
                breakdown.totalTime,
                breakdown.unloadTime + breakdown.loadTime,
                'Total should equal unload + load'
            )
            assert.isAbove(breakdown.unloadMass, 0, 'Should have unload mass')
            assert.isAbove(breakdown.loadMass, 0, 'Should have load mass')
        })

        test('divides time by number of loaders', () => {
            const ship1 = createMockShip({loaderQuantity: 1})
            const ship2 = createMockShip({loaderQuantity: 2})
            const cargos = [createMockCargo(1, 100)]
            const loadMap = new Map([[1, 20]])

            const breakdown1 = calculateLoadTimeBreakdown(ship1, cargos, loadMap)
            const breakdown2 = calculateLoadTimeBreakdown(ship2, cargos, loadMap)

            assert.approximately(
                breakdown1.totalTime,
                breakdown2.totalTime * 2,
                0.01,
                '1 loader should take twice as long as 2 loaders'
            )
        })
    })

    suite('calc_orbital_altitude', () => {
        test('returns MIN_ORBITAL_ALTITUDE for initial ship mass', () => {
            const altitude = calc_orbital_altitude(BASE_ORBITAL_MASS)
            assert.equal(altitude, MIN_ORBITAL_ALTITUDE)
        })

        test('returns MIN_ORBITAL_ALTITUDE for mass below initial', () => {
            const altitude = calc_orbital_altitude(BASE_ORBITAL_MASS / 2)
            assert.equal(altitude, MIN_ORBITAL_ALTITUDE)
        })

        test('increases with heavier mass', () => {
            const alt1 = calc_orbital_altitude(BASE_ORBITAL_MASS)
            const alt2 = calc_orbital_altitude(BASE_ORBITAL_MASS * 2)
            const alt3 = calc_orbital_altitude(BASE_ORBITAL_MASS * 5)

            assert.isAtLeast(alt2, alt1)
            assert.isAtLeast(alt3, alt2)
        })

        test('caps at MAX_ORBITAL_ALTITUDE for very heavy mass', () => {
            const altitude = calc_orbital_altitude(BASE_ORBITAL_MASS * 100)
            assert.isAtMost(altitude, MAX_ORBITAL_ALTITUDE)
        })
    })

    suite('calc_transfer_duration', () => {
        test('returns 0 when cargo mass is 0', () => {
            const source = {location: {z: 1000}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const dest = {location: {z: 1200}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const duration = calc_transfer_duration(source, dest, 0)
            assert.equal(duration, 0)
        })

        test('calculates duration based on z-distance', () => {
            const source = {location: {z: 1000}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const dest = {location: {z: 1500}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('returns 0 when no loaders available', () => {
            const source = {location: {z: 1000}}
            const dest = {location: {z: 1200}}
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.equal(duration, 0)
        })

        test('decreases with more loaders', () => {
            const source1 = {location: {z: 1000}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const dest1 = {location: {z: 1500}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const source2 = {location: {z: 1000}, loaders: {thrust: 100, mass: 5000, quantity: 2}}
            const dest2 = {location: {z: 1500}, loaders: {thrust: 100, mass: 5000, quantity: 2}}

            const duration1 = calc_transfer_duration(source1, dest1, 10000)
            const duration2 = calc_transfer_duration(source2, dest2, 10000)

            assert.isAbove(duration1, duration2)
        })

        test('works with numeric z values', () => {
            const source = {location: {z: 1000}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const dest = {location: {z: 1200}, loaders: {thrust: 100, mass: 5000, quantity: 1}}
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('works with toNumber z values', () => {
            const source = {
                location: {z: {toNumber: () => 1000}},
                loaders: {thrust: 100, mass: 5000, quantity: 1},
            }
            const dest = {
                location: {z: {toNumber: () => 1200}},
                loaders: {thrust: 100, mass: 5000, quantity: 1},
            }
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('handles only source having loaders', () => {
            const source = {location: {z: 1000}, loaders: {thrust: 100, mass: 5000, quantity: 2}}
            const dest = {location: {z: 1200}}
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('handles only dest having loaders', () => {
            const source = {location: {z: 1000}}
            const dest = {location: {z: 1200}, loaders: {thrust: 100, mass: 5000, quantity: 2}}
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })
    })
})
