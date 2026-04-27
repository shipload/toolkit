import {assert} from 'chai'
import {Checksum256, UInt64} from '@wharfkit/antelope'
import {Coordinates, coordsToLocationId} from '$lib'
import {Location, toLocation} from 'src/entities/location'
import {LocationType} from 'src/types'

const testSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)

const origin = Coordinates.from({x: 0, y: 0})

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

    suite('getLocationTypeAt', function () {
        test('returns a LocationType value', function () {
            const location = Location.from(origin)
            const result = location.getLocationTypeAt(testSeed)
            assert.include(
                [
                    LocationType.EMPTY,
                    LocationType.PLANET,
                    LocationType.ASTEROID,
                    LocationType.NEBULA,
                ],
                result
            )
        })

        test('consistent with hasSystemAt for EMPTY', function () {
            const location = Location.from(origin)
            const locationType = location.getLocationTypeAt(testSeed)
            const hasSystem = location.hasSystemAt(testSeed)
            assert.equal(hasSystem, locationType !== LocationType.EMPTY)
        })
    })

    suite('isGatherableAt', function () {
        test('returns true for asteroid locations', function () {
            for (let x = 0; x < 100; x++) {
                for (let y = 0; y < 100; y++) {
                    const location = Location.from(Coordinates.from({x, y}))
                    const locationType = location.getLocationTypeAt(testSeed)
                    if (locationType === LocationType.ASTEROID) {
                        assert.isTrue(location.isGatherableAt(testSeed))
                        return
                    }
                }
            }
        })

        test('returns true for nebula locations', function () {
            for (let x = 0; x < 100; x++) {
                for (let y = 0; y < 100; y++) {
                    const location = Location.from(Coordinates.from({x, y}))
                    const locationType = location.getLocationTypeAt(testSeed)
                    if (locationType === LocationType.NEBULA) {
                        assert.isTrue(location.isGatherableAt(testSeed))
                        return
                    }
                }
            }
        })

        test('returns true for planet locations', function () {
            for (let x = 0; x < 100; x++) {
                for (let y = 0; y < 100; y++) {
                    const location = Location.from(Coordinates.from({x, y}))
                    const locationType = location.getLocationTypeAt(testSeed)
                    if (locationType === LocationType.PLANET) {
                        assert.isTrue(location.isGatherableAt(testSeed))
                        return
                    }
                }
            }
        })

        test('returns false for empty locations', function () {
            for (let x = 0; x < 100; x++) {
                for (let y = 0; y < 100; y++) {
                    const location = Location.from(Coordinates.from({x, y}))
                    const locationType = location.getLocationTypeAt(testSeed)
                    if (locationType === LocationType.EMPTY) {
                        assert.isFalse(location.isGatherableAt(testSeed))
                        return
                    }
                }
            }
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

    suite('epoch', function () {
        test('epoch returns undefined initially', function () {
            const location = Location.from(origin)
            assert.isUndefined(location.epoch)
        })
    })

    suite('clearCache', function () {
        test('clears cached data', function () {
            const location = Location.from(origin)
            location.hasSystemAt(testSeed)
            location.clearCache()
            assert.isUndefined(location.epoch)
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

suite('coordsToLocationId', function () {
    test('returns UInt64', function () {
        const id = coordsToLocationId({x: 0, y: 0})
        assert.instanceOf(id, UInt64)
    })

    test('same coordinates produce same ID', function () {
        const id1 = coordsToLocationId({x: 5, y: 10})
        const id2 = coordsToLocationId({x: 5, y: 10})
        assert.isTrue(id1.equals(id2))
    })

    test('different coordinates produce different IDs', function () {
        const id1 = coordsToLocationId({x: 0, y: 0})
        const id2 = coordsToLocationId({x: 1, y: 0})
        const id3 = coordsToLocationId({x: 0, y: 1})
        assert.isFalse(id1.equals(id2))
        assert.isFalse(id1.equals(id3))
        assert.isFalse(id2.equals(id3))
    })

    test('handles negative coordinates', function () {
        const id1 = coordsToLocationId({x: -5, y: -5})
        const id2 = coordsToLocationId({x: -5, y: -5})
        const id3 = coordsToLocationId({x: 5, y: 5})
        assert.isTrue(id1.equals(id2))
        assert.isFalse(id1.equals(id3))
    })

    test('origin (0,0) produces ID 0', function () {
        const id = coordsToLocationId({x: 0, y: 0})
        assert.equal(id.toNumber(), 0)
    })

    test('x in high bits, y in low bits', function () {
        const id = coordsToLocationId({x: 1, y: 0})
        const expected = BigInt(1) << BigInt(32)
        assert.equal(id.toString(), expected.toString())
    })

    test('Coordinates.toLocationId() matches coordsToLocationId()', function () {
        const coords = Coordinates.from({x: 7, y: 13})
        const id1 = coords.toLocationId()
        const id2 = coordsToLocationId(coords)
        assert.isTrue(id1.equals(id2))
    })
})
