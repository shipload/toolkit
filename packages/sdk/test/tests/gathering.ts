import {Checksum256, Name, TimePoint, UInt16, UInt64} from '@wharfkit/antelope'
import {assert} from 'chai'
import {
    calc_gather_duration,
    calc_gather_energy,
    capsHasGatherer,
    encodeStats,
    getLocationType,
    hasGatherer,
    isGatherableLocation,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T1,
    LocationType,
    PRECISION,
    projectEntity,
    ServerContract,
    TaskType,
} from '../../src'
import {makeShip} from '../../src/entities/makers'

const seed = encodeStats([500, 500, 500, 500])

suite('gathering', () => {
    suite('TaskType', () => {
        test('GATHER equals 5', () => {
            assert.equal(TaskType.GATHER, 5)
        })

        test('all task types have correct values', () => {
            assert.equal(TaskType.IDLE, 0)
            assert.equal(TaskType.TRAVEL, 1)
            assert.equal(TaskType.RECHARGE, 2)
            assert.equal(TaskType.LOAD, 3)
            assert.equal(TaskType.UNLOAD, 4)
            assert.equal(TaskType.GATHER, 5)
        })
    })

    suite('LocationType', () => {
        test('EMPTY equals 0', () => {
            assert.equal(LocationType.EMPTY, 0)
        })

        test('PLANET equals 1', () => {
            assert.equal(LocationType.PLANET, 1)
        })

        test('ASTEROID equals 2', () => {
            assert.equal(LocationType.ASTEROID, 2)
        })

        test('NEBULA equals 3', () => {
            assert.equal(LocationType.NEBULA, 3)
        })
    })

    suite('getLocationType', () => {
        const gameSeed = Checksum256.from(
            '0000000000000000000000000000000000000000000000000000000000000000'
        )

        test('returns LocationType for coordinates', () => {
            const result = getLocationType(gameSeed, {x: 0, y: 0})
            assert.isNumber(result)
            assert.oneOf(result, [
                LocationType.EMPTY,
                LocationType.PLANET,
                LocationType.ASTEROID,
                LocationType.NEBULA,
            ])
        })

        test('is deterministic for same seed and coordinates', () => {
            const coords = {x: 5, y: 10}
            const result1 = getLocationType(gameSeed, coords)
            const result2 = getLocationType(gameSeed, coords)
            assert.equal(result1, result2)
        })

        test('different coordinates can produce different types', () => {
            const results = new Set<LocationType>()
            for (let x = 0; x < 100; x++) {
                for (let y = 0; y < 100; y++) {
                    results.add(getLocationType(gameSeed, {x, y}))
                    if (results.size === 4) break
                }
                if (results.size === 4) break
            }
            assert.isAtLeast(results.size, 2, 'Should produce at least 2 different location types')
        })
    })

    suite('isGatherableLocation', () => {
        test('ASTEROID is gatherable', () => {
            assert.isTrue(isGatherableLocation(LocationType.ASTEROID))
        })

        test('NEBULA is gatherable', () => {
            assert.isTrue(isGatherableLocation(LocationType.NEBULA))
        })

        test('PLANET is gatherable', () => {
            assert.isTrue(isGatherableLocation(LocationType.PLANET))
        })

        test('EMPTY is not gatherable', () => {
            assert.isFalse(isGatherableLocation(LocationType.EMPTY))
        })
    })

    suite('hasGatherer type guard', () => {
        test('returns true for entity with gatherer', () => {
            const entity = {
                id: UInt64.from(1),
                type: Name.from('ship'),
                owner: Name.from('test'),
                entity_name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                gatherer: {
                    yield: UInt16.from(700),
                    drain: UInt16.from(25),
                },
            }
            assert.isTrue(hasGatherer(entity as any))
        })

        test('returns false for entity without gatherer', () => {
            const entity = {
                id: UInt64.from(1),
                type: Name.from('warehouse'),
                owner: Name.from('test'),
                entity_name: 'Test Warehouse',
                coordinates: {x: 0, y: 0},
            }
            assert.isFalse(hasGatherer(entity as any))
        })

        test('returns false for entity with undefined gatherer', () => {
            const entity = {
                id: UInt64.from(1),
                type: Name.from('ship'),
                owner: Name.from('test'),
                entity_name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                gatherer: undefined,
            }
            assert.isFalse(hasGatherer(entity as any))
        })
    })

    suite('capsHasGatherer', () => {
        test('returns true when gatherer is present', () => {
            const caps = {
                gatherer: {
                    yield: UInt16.from(700),
                    drain: UInt16.from(25),
                },
            }
            assert.isTrue(capsHasGatherer(caps as any))
        })

        test('returns false when gatherer is undefined', () => {
            const caps = {
                gatherer: undefined,
            }
            assert.isFalse(capsHasGatherer(caps as any))
        })

        test('returns false when gatherer is missing', () => {
            const caps = {}
            assert.isFalse(capsHasGatherer(caps as any))
        })
    })

    suite('calc_gather_duration', () => {
        const gatherer = ServerContract.Types.gatherer_stats.from({
            yield: UInt16.from(700),
            drain: UInt16.from(25),
            depth: UInt16.from(950),
            speed: UInt16.from(500),
        })

        test('duration increases with quantity', () => {
            const one = calc_gather_duration(gatherer, 15000, 1, 600, 500)
            const five = calc_gather_duration(gatherer, 15000, 5, 600, 500)
            assert.isAbove(five.toNumber(), one.toNumber())
        })

        test('heavier mass increases duration', () => {
            const light = calc_gather_duration(gatherer, 15000, 1, 600, 500)
            const heavy = calc_gather_duration(gatherer, 40000, 1, 600, 500)
            assert.isAbove(heavy.toNumber(), light.toNumber())
        })

        test('deeper stratum increases duration', () => {
            const shallow = calc_gather_duration(gatherer, 15000, 1, 100, 500)
            const deep = calc_gather_duration(gatherer, 15000, 1, 900, 500)
            assert.isAbove(deep.toNumber(), shallow.toNumber())
        })

        test('higher richness reduces duration', () => {
            const lowRichness = calc_gather_duration(gatherer, 15000, 1, 600, 250)
            const highRichness = calc_gather_duration(gatherer, 15000, 1, 600, 750)
            assert.isBelow(highRichness.toNumber(), lowRichness.toNumber())
        })

        test('returns 0 for zero yield', () => {
            const zeroYield = ServerContract.Types.gatherer_stats.from({
                yield: UInt16.from(0),
                drain: UInt16.from(25),
                depth: UInt16.from(950),
                speed: UInt16.from(500),
            })
            const duration = calc_gather_duration(zeroYield, 15000, 1, 600, 500)
            assert.equal(duration.toNumber(), 0)
        })

        test('median hydrogen at stratum 600', () => {
            const duration = calc_gather_duration(gatherer, 15000, 1, 600, 500)
            assert.equal(duration.toNumber(), 275)
        })

        test('median copper at stratum 600', () => {
            const duration = calc_gather_duration(gatherer, 40000, 1, 600, 500)
            assert.equal(duration.toNumber(), 300)
        })

        test('exact formula calculation', () => {
            const itemMass = 15000
            const quantity = 3
            const stratum = 600
            const richness = 500
            const yieldValue = gatherer.yield.toNumber()
            const speed = gatherer.speed.toNumber()
            const massFactor = Math.sqrt(itemMass)
            const depthPenalty = 1 + stratum / 5000
            const richnessMul = richness / 1000
            const gatherTime =
                (quantity * massFactor * 100 * depthPenalty) / (yieldValue * richnessMul)
            const speedTime = 300 * Math.log(1 + stratum / speed)
            const expected = Math.floor(gatherTime + speedTime)
            const duration = calc_gather_duration(gatherer, itemMass, quantity, stratum, richness)
            assert.equal(duration.toNumber(), expected)
        })
    })

    suite('calc_gather_energy', () => {
        const gatherer = ServerContract.Types.gatherer_stats.from({
            yield: UInt16.from(700),
            drain: UInt16.from(25),
            depth: UInt16.from(950),
            speed: UInt16.from(500),
        })

        test('returns UInt16', () => {
            const energy = calc_gather_energy(gatherer, 100)
            assert.ok(energy.toNumber !== undefined)
        })

        test('returns 0 for zero duration', () => {
            const energy = calc_gather_energy(gatherer, 0)
            assert.equal(energy.toNumber(), 0)
        })

        test('energy increases with duration', () => {
            const short = calc_gather_energy(gatherer, 100)
            const long = calc_gather_energy(gatherer, 1000)
            assert.isAbove(long.toNumber(), short.toNumber())
        })

        test('energy scales with drain rate', () => {
            const lowDrain = ServerContract.Types.gatherer_stats.from({
                yield: UInt16.from(700),
                drain: UInt16.from(10),
                depth: UInt16.from(950),
                speed: UInt16.from(500),
            })
            const highDrain = ServerContract.Types.gatherer_stats.from({
                yield: UInt16.from(700),
                drain: UInt16.from(50),
                depth: UInt16.from(950),
                speed: UInt16.from(500),
            })
            const lowEnergy = calc_gather_energy(lowDrain, 1000)
            const highEnergy = calc_gather_energy(highDrain, 1000)
            assert.isAbove(highEnergy.toNumber(), lowEnergy.toNumber())
        })

        test('calculation matches expected formula', () => {
            const duration = 1000
            const expected = Math.floor((duration * gatherer.drain.toNumber()) / PRECISION)
            const energy = calc_gather_energy(gatherer, duration)
            assert.equal(energy.toNumber(), expected)
        })
    })

    suite('projection with TASK_GATHER', () => {
        test('applies energy cost on complete gather task', () => {
            const ship = makeShip({
                id: UInt64.from(1),
                owner: 'test',
                name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                hullmass: 100000,
                capacity: 500000,
                energy: 350,
                modules: [
                    {itemId: ITEM_ENGINE_T1, stats: seed},
                    {itemId: ITEM_GENERATOR_T1, stats: seed},
                    {itemId: ITEM_LOADER_T1, stats: seed},
                    {itemId: ITEM_GATHERER_T1, stats: seed},
                ],
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 60000),
                    tasks: [
                        ServerContract.Types.task.from({
                            type: TaskType.GATHER,
                            duration: 30,
                            cancelable: 1,
                            coordinates: {x: 0, y: 0},
                            cargo: [{item_id: 1, quantity: 1, stats: 0, modules: []}],
                            energy_cost: 50,
                        }),
                    ],
                }),
                cargo: [],
            })

            const projected = projectEntity(ship)

            assert.equal(Number(projected.energy), 300)
        })

        test('adds cargo mass on complete gather task', () => {
            const ship = makeShip({
                id: UInt64.from(1),
                owner: 'test',
                name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                hullmass: 100000,
                capacity: 500000,
                energy: 350,
                modules: [
                    {itemId: ITEM_ENGINE_T1, stats: seed},
                    {itemId: ITEM_GENERATOR_T1, stats: seed},
                    {itemId: ITEM_LOADER_T1, stats: seed},
                    {itemId: ITEM_GATHERER_T1, stats: seed},
                ],
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 60000),
                    tasks: [
                        ServerContract.Types.task.from({
                            type: TaskType.GATHER,
                            duration: 30,
                            cancelable: 1,
                            coordinates: {x: 0, y: 0},
                            cargo: [{item_id: 1, quantity: 1, stats: 0, modules: []}],
                            energy_cost: 50,
                        }),
                    ],
                }),
                cargo: [],
            })

            const projected = projectEntity(ship)

            assert.isAbove(
                Number(projected.cargoMass),
                0,
                'Cargo mass should increase from gathering'
            )
        })

        test('skips cargo add when gather targets another entity', () => {
            const ship = makeShip({
                id: UInt64.from(1),
                owner: 'test',
                name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                hullmass: 100000,
                capacity: 500000,
                energy: 350,
                modules: [
                    {itemId: ITEM_ENGINE_T1, stats: seed},
                    {itemId: ITEM_GENERATOR_T1, stats: seed},
                    {itemId: ITEM_LOADER_T1, stats: seed},
                    {itemId: ITEM_GATHERER_T1, stats: seed},
                ],
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 60000),
                    tasks: [
                        ServerContract.Types.task.from({
                            type: TaskType.GATHER,
                            duration: 30,
                            cancelable: 1,
                            coordinates: {x: 0, y: 0},
                            cargo: [{item_id: 1, quantity: 1, stats: 0, modules: []}],
                            entitytarget: {entity_type: 'ship', entity_id: 2},
                            energy_cost: 50,
                        }),
                    ],
                }),
                cargo: [],
            })

            const projected = projectEntity(ship)

            assert.equal(
                Number(projected.cargoMass),
                0,
                'Cross-entity gather should not add cargo to source'
            )
            assert.equal(
                projected.cargo.length,
                0,
                'Cross-entity gather should not add cargo stacks to source'
            )
            assert.equal(
                Number(projected.energy),
                300,
                'Energy cost still applies on cross-entity gather'
            )
        })
    })
})
