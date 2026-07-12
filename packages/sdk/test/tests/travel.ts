import {describe, test, beforeEach} from 'bun:test'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {
    calc_ship_mass,
    distanceBetweenCoordinates,
    EntityClass,
    findNearbyPlanets,
    ServerContract,
} from '$lib'
import {
    calc_acceleration,
    calc_energyusage,
    calc_flighttime,
    calc_travel_flighttime,
    calc_loader_acceleration,
    calc_loader_flighttime,
    calc_orbital_altitude,
    calc_onesided_duration,
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
    easeFlightProgress,
    flightSpeedFactor,
    getDestinationLocation,
    getInterpolatedPosition,
    interpolateFlightPosition,
    lerp,
    rotation,
} from 'src/travel'
import {BASE_ORBITAL_MASS, MAX_ORBITAL_ALTITUDE, MIN_ORBITAL_ALTITUDE} from 'src/types'
import {assert} from 'chai'
import {Chains} from '@wharfkit/common'
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
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(1),
        type: 'ship',
        owner: 'testplayer',
        entity_name: 'Test Ship',
        coordinates: {x: 0, y: 0, z: overrides.locationZ},
        item_id: 0,
        cargomass: overrides.cargomass ?? 0,
        cargo: [],
        modules: [],
        hullmass: overrides.hullmass ?? 100000,
        capacity: overrides.capacity ?? 500000,
        energy: overrides.energy ?? 500,
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
        is_idle: true,
        current_task_elapsed: 0,
        current_task_remaining: 0,
        pending_tasks: [],
        lanes: [],
        gatherer_lanes: [],
        crafter_lanes: [],
        loader_lanes: Array.from({length: overrides.loaderQuantity ?? 1}, (_, i) => ({
            slot_index: i,
            mass: overrides.loaderMass ?? 5000,
            thrust: overrides.loaderThrust ?? 100,
            output_pct: 100,
        })),
        holds: [],
    })
}

function createMockCargo(goodId: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({
        item_id: goodId,
        quantity,
        stats: UInt64.from(0),
        modules: [],
    })
}

describe('travel', () => {
    let shipload: Shipload

    beforeEach(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
    })

    describe('distanceBetweenCoordinates', () => {
        test('0,0 -> 0,1', async () => {
            const distance = distanceBetweenCoordinates(origin, destination)
            assert.equal(Number(distance), 10000)
        })
        test('0,0 -> 5,9', async () => {
            const sdk = distanceBetweenCoordinates(origin, {x: 5, y: 9})
            assert.isAbove(Number(sdk), 0)
        })
    })

    describe('distanceBetweenPoints', () => {
        test('calculates distance between two points', () => {
            const distance = distanceBetweenPoints(0, 0, 3, 4)
            assert.equal(Number(distance), 50000)
        })

        test('handles negative coordinates', () => {
            const distance = distanceBetweenPoints(-3, -4, 0, 0)
            assert.equal(Number(distance), 50000)
        })
    })

    describe('lerp', () => {
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

    describe('rotation', () => {
        test('calculates rotation angle', () => {
            const angle = rotation({x: 0, y: 0}, {x: 1, y: 0})
            assert.equal(angle, 90)
        })

        test('calculates rotation for vertical movement', () => {
            const angle = rotation({x: 0, y: 0}, {x: 0, y: 1})
            assert.equal(angle, 180)
        })
    })

    describe('findNearbyPlanets', () => {
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

    describe('calc_rechargetime', () => {
        test('calculates time to recharge', () => {
            const time = calc_rechargetime(1000, 500, 10)
            assert.equal(Number(time), 50)
        })

        test('returns 0 when already at capacity', () => {
            const time = calc_rechargetime(1000, 1000, 10)
            assert.equal(Number(time), 0)
        })

        test('floors a sub-tick deficit to 1 (matches contract max(...,1))', () => {
            const time = calc_rechargetime(1000, 995, 10)
            assert.equal(Number(time), 1)
        })
    })

    describe('calc_ship_rechargetime', () => {
        test('calculates from ship stats', () => {
            const mockShip = createMockShip({capacity: 1000, energy: 500, recharge: 10})
            const time = calc_ship_rechargetime(mockShip)
            assert.equal(Number(time), 50)
        })
    })

    describe('calc_flighttime', () => {
        test('calculates flight time from distance and acceleration', () => {
            const time = calc_flighttime(UInt64.from(10000), 100)
            assert.isAbove(Number(time), 0)
        })
    })

    describe('calc_travel_flighttime', () => {
        test('preserves short-leg timing and cruises on longer legs', () => {
            assert.equal(Number(calc_travel_flighttime(UInt64.from(20000), 100)), 28)
            assert.equal(Number(calc_travel_flighttime(UInt64.from(60000), 100)), 56)
        })

        test('softens the time advantage of one long leg over two shorter legs', () => {
            const longLeg = Number(calc_travel_flighttime(UInt64.from(60000), 100))
            const twoShortLegs = Number(calc_travel_flighttime(UInt64.from(30000), 100)) * 2
            assert.equal(longLeg, 56)
            assert.equal(twoShortLegs, 70)
        })
    })

    describe('calc_loader_flighttime', () => {
        test('calculates loader flight time', () => {
            const mockShip = createMockShip({loaderThrust: 100, loaderMass: 5000, capacity: 500000})
            const time = calc_loader_flighttime(mockShip, UInt64.from(10000))
            assert.isAbove(Number(time), 0)
        })
    })

    describe('calc_loader_acceleration', () => {
        test('calculates loader acceleration', () => {
            const mockShip = createMockShip({loaderThrust: 100, loaderMass: 5000})
            const accel = calc_loader_acceleration(mockShip, UInt64.from(10000))
            assert.isAbove(accel, 0)
        })
    })

    describe('calc_ship_flighttime', () => {
        test('calculates ship flight time', () => {
            const mockShip = createMockShip({thrust: 1000, hullmass: 100000})
            const time = calc_ship_flighttime(mockShip, UInt64.from(100000), UInt64.from(60000))
            assert.equal(Number(time), 178)
        })
    })

    describe('calc_ship_acceleration', () => {
        test('calculates ship acceleration', () => {
            const mockShip = createMockShip({thrust: 1000})
            const accel = calc_ship_acceleration(mockShip, UInt64.from(100000))
            assert.isAbove(accel, 0)
        })
    })

    describe('calc_acceleration', () => {
        test('calculates acceleration from thrust and mass', () => {
            const accel = calc_acceleration(1000, 100)
            assert.equal(accel, 100000)
        })
    })

    describe('calc_ship_mass', () => {
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

    describe('calc_energyusage', () => {
        test('calculates energy usage', () => {
            const energy = calc_energyusage(UInt64.from(10000), 1)
            assert.equal(Number(energy), 1)
        })

        test('charges fractional distance proportionally', () => {
            const energy = calc_energyusage(UInt64.from(5500), 100)
            assert.equal(Number(energy), 55)
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

    describe('travel time calculations', () => {
        describe('calculateTransferTime', () => {
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

        describe('calculateRefuelingTime', () => {
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

        describe('calculateFlightTime', () => {
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

    describe('calculateLoadTimeBreakdown', () => {
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
            const cargos = [createMockCargo(301, 100), createMockCargo(101, 50)]
            const loadMap = new Map([[301, 20]])
            const unloadMap = new Map([[101, 50]])
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

        test('per-lane (ADR 0029): a single load action is NOT divided by loader count', () => {
            const ship1 = createMockShip({loaderQuantity: 1})
            const ship2 = createMockShip({loaderQuantity: 2})
            const cargos = [createMockCargo(301, 100)]
            const loadMap = new Map([[301, 20]])

            const breakdown1 = calculateLoadTimeBreakdown(ship1, cargos, loadMap)
            const breakdown2 = calculateLoadTimeBreakdown(ship2, cargos, loadMap)

            assert.equal(
                breakdown1.totalTime,
                breakdown2.totalTime,
                'one load action uses one lane; count does not divide its duration'
            )
        })
    })

    describe('calc_orbital_altitude', () => {
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

    describe('calc_transfer_duration (ADR 0029 per-lane, T8 consumed path)', () => {
        const lane = (thrust: number, mass: number, slot = 0) => ({
            slot_index: slot,
            thrust,
            mass,
        })
        const oneLoader = [lane(100, 5000)]

        test('returns 0 when cargo mass is 0', () => {
            const source = {
                location: {z: 1000},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const dest = {
                location: {z: 1200},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const duration = calc_transfer_duration(source, dest, 0)
            assert.equal(duration, 0)
        })

        test('multi-loader entity: returns the chosen lane value, NOT summed÷count', () => {
            // BEFORE old summed÷count = 2; AFTER per-lane lowest-slot (thrust=100,mass=50000) = 6
            const sender = {
                location: {z: 800},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: [lane(100, 50000, 0), lane(300, 80000, 1)],
            }
            const receiver = {
                location: {z: 800},
                entityClass: EntityClass.OrbitalVessel,
            }
            const duration = calc_transfer_duration(sender, receiver, 10000)
            assert.equal(duration, 6)
        })

        test('lane selection uses lowest slot regardless of array order', () => {
            const senderOrdered = {
                location: {z: 800},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: [lane(100, 50000, 0), lane(300, 80000, 1)],
            }
            const senderReversed = {
                location: {z: 800},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: [lane(300, 80000, 1), lane(100, 50000, 0)],
            }
            const receiver = {location: {z: 800}, entityClass: EntityClass.OrbitalVessel}
            assert.equal(
                calc_transfer_duration(senderOrdered, receiver, 10000),
                calc_transfer_duration(senderReversed, receiver, 10000)
            )
        })

        test('calculates duration based on z-distance', () => {
            const source = {
                location: {z: 1000},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const dest = {
                location: {z: 1500},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('returns 0 when no loaders available', () => {
            const source = {location: {z: 1000}, entityClass: EntityClass.OrbitalVessel}
            const dest = {location: {z: 1200}, entityClass: EntityClass.OrbitalVessel}
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.equal(duration, 0)
        })

        test('works with numeric z values', () => {
            const source = {
                location: {z: 1000},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const dest = {
                location: {z: 1200},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('works with toNumber z values', () => {
            const source = {
                location: {z: {toNumber: () => 1000}},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const dest = {
                location: {z: {toNumber: () => 1200}},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('handles only source having loaders (source is active)', () => {
            const source = {
                location: {z: 1000},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const dest = {location: {z: 1200}, entityClass: EntityClass.OrbitalVessel}
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('handles only dest having loaders (dest is active)', () => {
            const source = {location: {z: 1000}, entityClass: EntityClass.OrbitalVessel}
            const dest = {
                location: {z: 1200},
                entityClass: EntityClass.OrbitalVessel,
                loaderLanes: oneLoader,
            }
            const duration = calc_transfer_duration(source, dest, 10000)
            assert.isAbove(duration, 0)
        })

        test('orbital floor exceeds planetary floor for co-located transfers', () => {
            const orbital0 = calc_transfer_duration(
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                1000000
            )
            const planetary0 = calc_transfer_duration(
                {
                    location: {z: 0},
                    entityClass: EntityClass.PlanetaryStructure,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 0},
                    entityClass: EntityClass.PlanetaryStructure,
                    loaderLanes: oneLoader,
                },
                1000000
            )
            assert.isAbove(orbital0, planetary0)
        })

        test('orbital floor is flat across the sub-floor altitude band', () => {
            const gap0 = calc_transfer_duration(
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                10000
            )
            const gap150 = calc_transfer_duration(
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 950},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                10000
            )
            assert.equal(gap150, gap0)
        })

        test('orbital transfers above the band use the raw z-gap', () => {
            const gap0 = calc_transfer_duration(
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                10000
            )
            const gap600 = calc_transfer_duration(
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 1400},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                10000
            )
            assert.isAbove(gap600, gap0)
        })

        test('mixed-class transfer (surface↔ship) is never floored', () => {
            const mixed = calc_transfer_duration(
                {
                    location: {z: 0},
                    entityClass: EntityClass.PlanetaryStructure,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                10000
            )
            const orbitalFloored = calc_transfer_duration(
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                {
                    location: {z: 800},
                    entityClass: EntityClass.OrbitalVessel,
                    loaderLanes: oneLoader,
                },
                10000
            )
            assert.isAbove(mixed, orbitalFloored)
        })
    })
})

describe('easeFlightProgress', () => {
    test('returns 0 at t=0', () => {
        assert.strictEqual(easeFlightProgress(0), 0)
    })
    test('returns 1 at t=1', () => {
        assert.strictEqual(easeFlightProgress(1), 1)
    })
    test('returns 0.5 at t=0.5 (curve symmetric)', () => {
        assert.strictEqual(easeFlightProgress(0.5), 0.5)
    })
    test('clamps below 0', () => {
        assert.strictEqual(easeFlightProgress(-0.5), 0)
    })
    test('clamps above 1', () => {
        assert.strictEqual(easeFlightProgress(1.5), 1)
    })
    test('monotonic across [0,1]', () => {
        let prev = easeFlightProgress(0)
        for (let i = 1; i <= 20; i++) {
            const v = easeFlightProgress(i / 20)
            assert.isAtLeast(v, prev)
            prev = v
        }
    })
    test('first half is quadratic (2t²)', () => {
        assert.closeTo(easeFlightProgress(0.25), 2 * 0.25 * 0.25, 1e-9)
    })
    test('second half mirrors first (1 - 2(1-t)²)', () => {
        assert.closeTo(easeFlightProgress(0.75), 1 - 2 * 0.25 * 0.25, 1e-9)
    })
})

describe('flightSpeedFactor', () => {
    test('returns 0 at endpoints', () => {
        assert.strictEqual(flightSpeedFactor(0), 0)
        assert.strictEqual(flightSpeedFactor(1), 0)
    })
    test('peaks at midpoint', () => {
        assert.closeTo(flightSpeedFactor(0.5), 2, 1e-9)
    })
    test('linear up then down', () => {
        assert.closeTo(flightSpeedFactor(0.25), 1, 1e-9)
        assert.closeTo(flightSpeedFactor(0.75), 1, 1e-9)
    })
})

describe('interpolateFlightPosition', () => {
    const o = {x: 0, y: 0}
    const d = {x: 10, y: 0}

    test('progress 0 returns origin', () => {
        const p = interpolateFlightPosition(o, d, 0)
        assert.strictEqual(p.x, 0)
        assert.strictEqual(p.y, 0)
    })
    test('progress 1 returns destination', () => {
        const p = interpolateFlightPosition(o, d, 1)
        assert.strictEqual(p.x, 10)
        assert.strictEqual(p.y, 0)
    })
    test('progress 0.5 with default easing sits at midpoint', () => {
        const p = interpolateFlightPosition(o, d, 0.5)
        assert.closeTo(p.x, 5, 1e-9)
    })
    test('progress 0.25 eased lags behind linear', () => {
        const eased = interpolateFlightPosition(o, d, 0.25)
        const linear = interpolateFlightPosition(o, d, 0.25, {easing: 'linear'})
        assert.isBelow(eased.x, linear.x)
        assert.closeTo(linear.x, 2.5, 1e-9)
        assert.closeTo(eased.x, 1.25, 1e-9)
    })
    test('returns floats (not rounded)', () => {
        const p = interpolateFlightPosition(o, {x: 7, y: 3}, 0.3)
        assert.notStrictEqual(p.x, Math.round(p.x))
    })
})

describe('getInterpolatedPosition', () => {
    const mobilityLane = (tasks: any[]) => [{lane_key: {toNumber: () => 0}, schedule: {tasks}}]
    test('no schedule → returns entity coordinates as floats', () => {
        const entity = {
            coordinates: {x: 7, y: -3},
            lanes: [],
        } as any
        const p = getInterpolatedPosition(entity, 0, 0)
        assert.strictEqual(p.x, 7)
        assert.strictEqual(p.y, -3)
    })
    test('TRAVEL task at progress 0 → origin', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: mobilityLane([
                {
                    type: {equals: (t: any) => t === 1},
                    coordinates: {x: 10, y: 0},
                    duration: {toNumber: () => 100},
                },
            ]),
        } as any
        const p = getInterpolatedPosition(entity, 0, 0)
        assert.strictEqual(p.x, 0)
    })
    test('TRAVEL task at progress 1 → destination', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: mobilityLane([
                {
                    type: {equals: (t: any) => t === 1},
                    coordinates: {x: 10, y: 4},
                    duration: {toNumber: () => 100},
                },
            ]),
        } as any
        const p = getInterpolatedPosition(entity, 0, 1)
        assert.strictEqual(p.x, 10)
        assert.strictEqual(p.y, 4)
    })
    test('TRAVEL task at progress 0.5 → eased midpoint (no rounding)', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: mobilityLane([
                {
                    type: {equals: (t: any) => t === 1},
                    coordinates: {x: 7, y: 3},
                    duration: {toNumber: () => 100},
                },
            ]),
        } as any
        const p = getInterpolatedPosition(entity, 0, 0.3)
        assert.notStrictEqual(p.x, Math.round(p.x))
        assert.notStrictEqual(p.y, Math.round(p.y))
    })

    test('non-TRAVEL task → returns getFlightOrigin(taskIndex), no throw', () => {
        const entity = {
            coordinates: {x: 5, y: -2},
            lanes: mobilityLane([{type: {equals: () => false}, duration: {toNumber: () => 100}}]),
        } as any
        const p = getInterpolatedPosition(entity, 0, 0.5)
        assert.strictEqual(p.x, 5)
        assert.strictEqual(p.y, -2)
    })

    test('schedule complete (taskIndex < 0) → final TRAVEL destination, not chain origin', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: mobilityLane([
                {
                    type: {equals: (t: any) => t === 1},
                    coordinates: {x: 5, y: -2},
                    duration: {toNumber: () => 100},
                },
                {
                    type: {equals: (t: any) => t === 1},
                    coordinates: {x: 8, y: 4},
                    duration: {toNumber: () => 100},
                },
            ]),
        } as any
        const p = getInterpolatedPosition(entity, -1, 0)
        assert.strictEqual(p.x, 8)
        assert.strictEqual(p.y, 4)
    })

    test('no schedule and taskIndex < 0 → falls back to chain coordinates', () => {
        const entity = {
            coordinates: {x: 3, y: 9},
            lanes: [],
        } as any
        const p = getInterpolatedPosition(entity, -1, 0)
        assert.strictEqual(p.x, 3)
        assert.strictEqual(p.y, 9)
    })

    test('TRANSIT task at progress 0.5 → interpolates entrance to exit (not origin)', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: mobilityLane([
                {
                    type: {equals: (t: any) => t === 9},
                    coordinates: {x: 1000, y: 0},
                    duration: {toNumber: () => 100},
                },
            ]),
        } as any
        const p = getInterpolatedPosition(entity, 0, 0.5)
        assert.isAbove(p.x, 400)
        assert.isBelow(p.x, 600)
    })

    test('getDestinationLocation returns TRANSIT exit coordinates', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: mobilityLane([
                {
                    type: {equals: (t: any) => t === 9},
                    coordinates: {x: 1000, y: 0},
                    duration: {toNumber: () => 100},
                },
            ]),
        } as any
        const dest = getDestinationLocation(entity)
        assert.isDefined(dest)
        assert.strictEqual(dest!.x, 1000)
        assert.strictEqual(dest!.y, 0)
    })
})

describe('calc_onesided_duration — ADR 0029 per-lane loader parity', () => {
    // BEFORE=3 (old summed÷count), AFTER=6 (per-lane single-module thrust, no ÷qty)
    const LOADER_THRUST = 100
    const LOADER_MASS = 50000
    const CARGO_MASS = 10000
    const ACTIVE_Z = 800
    const COUNTERPART_Z = 800

    const BEFORE_DURATION = 3
    const AFTER_DURATION = 6

    test('old summed-÷count arithmetic yields BEFORE value (proves fixture distinguishes)', () => {
        // Reproduce the removed summed÷count formula for one loader on each side:
        const totalThrust = LOADER_THRUST + LOADER_THRUST
        const totalLoaderMass = LOADER_MASS + LOADER_MASS
        const totalQuantity = 2
        const distance = 200
        const totalMass = CARGO_MASS + totalLoaderMass
        const accel = (totalThrust / totalMass) * 10000
        const old = Math.floor((2 * Math.sqrt(distance / accel)) / totalQuantity)
        assert.equal(old, BEFORE_DURATION)
        assert.notEqual(old, AFTER_DURATION)
    })

    test('calc_onesided_duration returns AFTER value matching contract calc_onesided_duration', () => {
        const result = calc_onesided_duration(
            LOADER_THRUST,
            LOADER_MASS,
            ACTIVE_Z,
            COUNTERPART_Z,
            EntityClass.OrbitalVessel,
            EntityClass.OrbitalVessel,
            CARGO_MASS
        )
        assert.equal(result, AFTER_DURATION)
    })

    test('zero cargo mass → 0 (mirrors contract early-return)', () => {
        const result = calc_onesided_duration(
            LOADER_THRUST,
            LOADER_MASS,
            ACTIVE_Z,
            COUNTERPART_Z,
            EntityClass.OrbitalVessel,
            EntityClass.OrbitalVessel,
            0
        )
        assert.equal(result, 0)
    })

    test('zero loader thrust → 0 (no-loader / LANE_MOBILITY case)', () => {
        const result = calc_onesided_duration(
            0,
            0,
            ACTIVE_Z,
            COUNTERPART_Z,
            EntityClass.OrbitalVessel,
            EntityClass.OrbitalVessel,
            CARGO_MASS
        )
        assert.equal(result, 0)
    })

    test('non-zero flightTime that rounds to 0 is clamped to 1 (mirrors contract)', () => {
        // Very high thrust + tiny cargo → flightTime near 0 but > 0 → should return 1 not 0.
        const result = calc_onesided_duration(
            65535,
            1,
            ACTIVE_Z,
            COUNTERPART_Z,
            EntityClass.OrbitalVessel,
            EntityClass.OrbitalVessel,
            1
        )
        assert.equal(result, 1)
    })
})
