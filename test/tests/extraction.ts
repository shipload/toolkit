import {Checksum256, Name, TimePoint, UInt16, UInt64} from '@wharfkit/antelope'
import {assert} from 'chai'
import {
    calc_extraction_duration,
    calc_extraction_energy,
    capsHasExtractor,
    getLocationType,
    hasExtractor,
    INITIAL_EXTRACTOR_DRAIN,
    INITIAL_EXTRACTOR_EFFICIENCY,
    INITIAL_EXTRACTOR_RATE,
    isExtractableLocation,
    LocationType,
    PRECISION,
    projectEntity,
    ServerContract,
    TaskType,
} from '../../src'
import {makeShip} from '../../src/entities/makers'

suite('extraction', function () {
    suite('TaskType', function () {
        test('EXTRACT equals 5', function () {
            assert.equal(TaskType.EXTRACT, 5)
        })

        test('all task types have correct values', function () {
            assert.equal(TaskType.IDLE, 0)
            assert.equal(TaskType.TRAVEL, 1)
            assert.equal(TaskType.RECHARGE, 2)
            assert.equal(TaskType.LOAD, 3)
            assert.equal(TaskType.UNLOAD, 4)
            assert.equal(TaskType.EXTRACT, 5)
        })
    })

    suite('LocationType', function () {
        test('EMPTY equals 0', function () {
            assert.equal(LocationType.EMPTY, 0)
        })

        test('PLANET equals 1', function () {
            assert.equal(LocationType.PLANET, 1)
        })

        test('ASTEROID equals 2', function () {
            assert.equal(LocationType.ASTEROID, 2)
        })

        test('NEBULA equals 3', function () {
            assert.equal(LocationType.NEBULA, 3)
        })
    })

    suite('extractor constants', function () {
        test('INITIAL_EXTRACTOR_RATE equals 700', function () {
            assert.equal(INITIAL_EXTRACTOR_RATE, 700)
        })

        test('INITIAL_EXTRACTOR_DRAIN equals 2500', function () {
            assert.equal(INITIAL_EXTRACTOR_DRAIN, 2500)
        })

        test('INITIAL_EXTRACTOR_EFFICIENCY equals 5000', function () {
            assert.equal(INITIAL_EXTRACTOR_EFFICIENCY, 5000)
        })
    })

    suite('getLocationType', function () {
        const gameSeed = Checksum256.from(
            '0000000000000000000000000000000000000000000000000000000000000000'
        )

        test('returns LocationType for coordinates', function () {
            const result = getLocationType(gameSeed, {x: 0, y: 0})
            assert.isNumber(result)
            assert.oneOf(result, [
                LocationType.EMPTY,
                LocationType.PLANET,
                LocationType.ASTEROID,
                LocationType.NEBULA,
            ])
        })

        test('is deterministic for same seed and coordinates', function () {
            const coords = {x: 5, y: 10}
            const result1 = getLocationType(gameSeed, coords)
            const result2 = getLocationType(gameSeed, coords)
            assert.equal(result1, result2)
        })

        test('different coordinates can produce different types', function () {
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

    suite('isExtractableLocation', function () {
        test('ASTEROID is extractable', function () {
            assert.isTrue(isExtractableLocation(LocationType.ASTEROID))
        })

        test('NEBULA is extractable', function () {
            assert.isTrue(isExtractableLocation(LocationType.NEBULA))
        })

        test('PLANET is not extractable', function () {
            assert.isFalse(isExtractableLocation(LocationType.PLANET))
        })

        test('EMPTY is not extractable', function () {
            assert.isFalse(isExtractableLocation(LocationType.EMPTY))
        })
    })

    suite('hasExtractor type guard', function () {
        test('returns true for entity with extractor', function () {
            const entity = {
                id: UInt64.from(1),
                type: Name.from('ship'),
                owner: Name.from('test'),
                entity_name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                extractor: {
                    rate: UInt16.from(700),
                    drain: UInt16.from(2500),
                    efficiency: UInt16.from(5000),
                },
            }
            assert.isTrue(hasExtractor(entity as any))
        })

        test('returns false for entity without extractor', function () {
            const entity = {
                id: UInt64.from(1),
                type: Name.from('warehouse'),
                owner: Name.from('test'),
                entity_name: 'Test Warehouse',
                coordinates: {x: 0, y: 0},
            }
            assert.isFalse(hasExtractor(entity as any))
        })

        test('returns false for entity with undefined extractor', function () {
            const entity = {
                id: UInt64.from(1),
                type: Name.from('ship'),
                owner: Name.from('test'),
                entity_name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                extractor: undefined,
            }
            assert.isFalse(hasExtractor(entity as any))
        })
    })

    suite('capsHasExtractor', function () {
        test('returns true when extractor is present', function () {
            const caps = {
                extractor: {
                    rate: UInt16.from(700),
                    drain: UInt16.from(2500),
                    efficiency: UInt16.from(5000),
                },
            }
            assert.isTrue(capsHasExtractor(caps as any))
        })

        test('returns false when extractor is undefined', function () {
            const caps = {
                extractor: undefined,
            }
            assert.isFalse(capsHasExtractor(caps as any))
        })

        test('returns false when extractor is missing', function () {
            const caps = {}
            assert.isFalse(capsHasExtractor(caps as any))
        })
    })

    suite('calc_extraction_duration', function () {
        const extractor = ServerContract.Types.extractor_stats.from({
            rate: UInt16.from(700),
            drain: UInt16.from(2500),
            efficiency: UInt16.from(5000),
        })

        const loaders = ServerContract.Types.loader_stats.from({
            mass: UInt16.from(1000),
            thrust: UInt16.from(1000),
            quantity: UInt16.from(2),
        })

        test('returns UInt32', function () {
            const duration = calc_extraction_duration(extractor, loaders, 1000, 10000)
            assert.ok(duration.toNumber !== undefined)
        })

        test('returns 0 for zero batch mass', function () {
            const duration = calc_extraction_duration(extractor, loaders, 1000, 0)
            assert.equal(duration.toNumber(), 0)
        })

        test('duration increases with batch mass', function () {
            const small = calc_extraction_duration(extractor, loaders, 1000, 10000)
            const large = calc_extraction_duration(extractor, loaders, 1000, 50000)
            assert.isAbove(large.toNumber(), small.toNumber())
        })

        test('duration is based on extraction time', function () {
            const batchMass = 70000
            const duration = calc_extraction_duration(extractor, loaders, 1000, batchMass)
            const expectedExtractionTime = Math.floor(batchMass / extractor.rate.toNumber())
            assert.isAtLeast(duration.toNumber(), expectedExtractionTime)
        })

        test('handles zero loader quantity', function () {
            const noLoaders = ServerContract.Types.loader_stats.from({
                mass: UInt16.from(1000),
                thrust: UInt16.from(1000),
                quantity: UInt16.from(0),
            })
            const duration = calc_extraction_duration(extractor, noLoaders, 1000, 10000)
            assert.isAbove(duration.toNumber(), 0)
        })

        test('handles zero loader thrust', function () {
            const noThrust = ServerContract.Types.loader_stats.from({
                mass: UInt16.from(1000),
                thrust: UInt16.from(0),
                quantity: UInt16.from(2),
            })
            const duration = calc_extraction_duration(extractor, noThrust, 1000, 10000)
            assert.isAbove(duration.toNumber(), 0)
        })
    })

    suite('calc_extraction_energy', function () {
        const extractor = ServerContract.Types.extractor_stats.from({
            rate: UInt16.from(700),
            drain: UInt16.from(2500),
            efficiency: UInt16.from(5000),
        })

        test('returns UInt16', function () {
            const energy = calc_extraction_energy(extractor, 100)
            assert.ok(energy.toNumber !== undefined)
        })

        test('returns 0 for zero duration', function () {
            const energy = calc_extraction_energy(extractor, 0)
            assert.equal(energy.toNumber(), 0)
        })

        test('energy increases with duration', function () {
            const short = calc_extraction_energy(extractor, 100)
            const long = calc_extraction_energy(extractor, 1000)
            assert.isAbove(long.toNumber(), short.toNumber())
        })

        test('energy scales with drain rate', function () {
            const lowDrain = ServerContract.Types.extractor_stats.from({
                rate: UInt16.from(700),
                drain: UInt16.from(1000),
                efficiency: UInt16.from(5000),
            })
            const highDrain = ServerContract.Types.extractor_stats.from({
                rate: UInt16.from(700),
                drain: UInt16.from(5000),
                efficiency: UInt16.from(5000),
            })
            const lowEnergy = calc_extraction_energy(lowDrain, 1000)
            const highEnergy = calc_extraction_energy(highDrain, 1000)
            assert.isAbove(highEnergy.toNumber(), lowEnergy.toNumber())
        })

        test('calculation matches expected formula', function () {
            const duration = 1000
            const expected = Math.floor((duration * extractor.drain.toNumber()) / PRECISION)
            const energy = calc_extraction_energy(extractor, duration)
            assert.equal(energy.toNumber(), expected)
        })
    })

    suite('projection with TASK_EXTRACT', function () {
        test('applies energy cost on complete extract task', function () {
            const ship = makeShip({
                id: 1,
                owner: 'test',
                name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                hullmass: 100000,
                capacity: 500000,
                energy: 350,
                engines: ServerContract.Types.movement_stats.from({thrust: 250, drain: 25}),
                generator: ServerContract.Types.energy_stats.from({capacity: 350, recharge: 10}),
                loaders: ServerContract.Types.loader_stats.from({
                    mass: 1000,
                    thrust: 1,
                    quantity: 1,
                }),
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 60000),
                    tasks: [
                        ServerContract.Types.task.from({
                            type: TaskType.EXTRACT,
                            duration: 30,
                            cancelable: 1,
                            coordinates: {x: 0, y: 0},
                            cargo: [{good_id: 1, quantity: 1, unit_cost: 0}],
                            energy_cost: 50,
                        }),
                    ],
                }),
                cargo: [],
            })

            const projected = projectEntity(ship)

            assert.equal(Number(projected.energy), 300)
        })

        test('adds cargo mass on complete extract task', function () {
            const ship = makeShip({
                id: 1,
                owner: 'test',
                name: 'Test Ship',
                coordinates: {x: 0, y: 0},
                hullmass: 100000,
                capacity: 500000,
                energy: 350,
                engines: ServerContract.Types.movement_stats.from({thrust: 250, drain: 25}),
                generator: ServerContract.Types.energy_stats.from({capacity: 350, recharge: 10}),
                loaders: ServerContract.Types.loader_stats.from({
                    mass: 1000,
                    thrust: 1,
                    quantity: 1,
                }),
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 60000),
                    tasks: [
                        ServerContract.Types.task.from({
                            type: TaskType.EXTRACT,
                            duration: 30,
                            cancelable: 1,
                            coordinates: {x: 0, y: 0},
                            cargo: [{good_id: 1, quantity: 1, unit_cost: 0}],
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
                'Cargo mass should increase from extraction'
            )
        })
    })
})
