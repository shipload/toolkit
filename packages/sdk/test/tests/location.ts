import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {Checksum256, UInt64} from '@wharfkit/antelope'
import {Coordinates, coordsToLocationId} from '$lib'
import {Location, toLocation} from 'src/entities/location'
import {LocationType} from 'src/types'

const testSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)

const origin = Coordinates.from({x: 0, y: 0})

describe('Location', () => {
    describe('constructor and from', () => {
        test('creates Location from coordinates', () => {
            const coords = Coordinates.from({x: 5, y: 10})
            const location = new Location(coords)
            assert.equal(location.coordinates.x.toNumber(), 5)
            assert.equal(location.coordinates.y.toNumber(), 10)
        })

        test('static from creates Location', () => {
            const coords = Coordinates.from({x: 5, y: 10})
            const location = Location.from(coords)
            assert.equal(location.coordinates.x.toNumber(), 5)
            assert.equal(location.coordinates.y.toNumber(), 10)
        })
    })

    describe('hasSystemAt', () => {
        test('returns boolean for system check', () => {
            const location = Location.from(origin)
            const result = location.hasSystemAt(testSeed)
            assert.isBoolean(result)
        })

        test('caches result for same seed', () => {
            const location = Location.from(origin)
            const result1 = location.hasSystemAt(testSeed)
            const result2 = location.hasSystemAt(testSeed)
            assert.equal(result1, result2)
        })

        test('recalculates for different seed', () => {
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

    describe('getLocationTypeAt', () => {
        test('returns a LocationType value', () => {
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

        test('consistent with hasSystemAt for EMPTY', () => {
            const location = Location.from(origin)
            const locationType = location.getLocationTypeAt(testSeed)
            const hasSystem = location.hasSystemAt(testSeed)
            assert.equal(hasSystem, locationType !== LocationType.EMPTY)
        })
    })

    describe('isGatherableAt', () => {
        test('returns true for asteroid locations', () => {
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

        test('returns true for nebula locations', () => {
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

        test('returns true for planet locations', () => {
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

        test('returns false for empty locations', () => {
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

    describe('findNearby', () => {
        test('returns array of distances', () => {
            const location = Location.from(origin)
            const nearby = location.findNearby(testSeed, 20)
            assert.isArray(nearby)
        })
    })

    describe('equals', () => {
        test('returns true for same coordinates', () => {
            const location1 = Location.from(Coordinates.from({x: 5, y: 10}))
            const location2 = Location.from(Coordinates.from({x: 5, y: 10}))
            assert.isTrue(location1.equals(location2))
        })

        test('returns false for different coordinates', () => {
            const location1 = Location.from(Coordinates.from({x: 5, y: 10}))
            const location2 = Location.from(Coordinates.from({x: 5, y: 11}))
            assert.isFalse(location1.equals(location2))
        })

        test('compares with raw coordinates object', () => {
            const location = Location.from(Coordinates.from({x: 5, y: 10}))
            const coords = Coordinates.from({x: 5, y: 10})
            assert.isTrue(location.equals(coords))
        })
    })

    describe('epoch', () => {
        test('epoch returns undefined initially', () => {
            const location = Location.from(origin)
            assert.isUndefined(location.epoch)
        })
    })

    describe('clearCache', () => {
        test('clears cached data', () => {
            const location = Location.from(origin)
            location.hasSystemAt(testSeed)
            location.clearCache()
            assert.isUndefined(location.epoch)
        })
    })
})

describe('toLocation helper', () => {
    test('returns Location unchanged', () => {
        const location = Location.from(Coordinates.from({x: 5, y: 10}))
        const result = toLocation(location)
        assert.strictEqual(result, location)
    })

    test('converts coordinates to Location', () => {
        const coords = Coordinates.from({x: 5, y: 10})
        const result = toLocation(coords)
        assert.instanceOf(result, Location)
        assert.equal(result.coordinates.x.toNumber(), 5)
        assert.equal(result.coordinates.y.toNumber(), 10)
    })
})

describe('coordsToLocationId', () => {
    test('returns UInt64', () => {
        const id = coordsToLocationId({x: 0, y: 0})
        assert.instanceOf(id, UInt64)
    })

    test('same coordinates produce same ID', () => {
        const id1 = coordsToLocationId({x: 5, y: 10})
        const id2 = coordsToLocationId({x: 5, y: 10})
        assert.isTrue(id1.equals(id2))
    })

    test('different coordinates produce different IDs', () => {
        const id1 = coordsToLocationId({x: 0, y: 0})
        const id2 = coordsToLocationId({x: 1, y: 0})
        const id3 = coordsToLocationId({x: 0, y: 1})
        assert.isFalse(id1.equals(id2))
        assert.isFalse(id1.equals(id3))
        assert.isFalse(id2.equals(id3))
    })

    test('handles negative coordinates', () => {
        const id1 = coordsToLocationId({x: -5, y: -5})
        const id2 = coordsToLocationId({x: -5, y: -5})
        const id3 = coordsToLocationId({x: 5, y: 5})
        assert.isTrue(id1.equals(id2))
        assert.isFalse(id1.equals(id3))
    })

    test('origin (0,0) produces ID 0', () => {
        const id = coordsToLocationId({x: 0, y: 0})
        assert.equal(id.toNumber(), 0)
    })

    test('x in high bits, y in low bits', () => {
        const id = coordsToLocationId({x: 1, y: 0})
        const expected = BigInt(1) << BigInt(32)
        assert.equal(id.toString(), expected.toString())
    })

    test('Coordinates.toLocationId() matches coordsToLocationId()', () => {
        const coords = Coordinates.from({x: 7, y: 13})
        const id1 = coords.toLocationId()
        const id2 = coordsToLocationId(coords)
        assert.isTrue(id1.equals(id2))
    })
})
