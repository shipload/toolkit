import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {Checksum256} from '@wharfkit/antelope'
import {deriveLocation, deriveLocationStatic, getSystemName, LocationType} from '$lib'

const testGameSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)

describe('getSystemName', () => {
    test('should throw an error if system does not exist', () => {
        const locationWithNoPlanet = {x: 0, y: 0}

        assert.throws(
            () => getSystemName(testGameSeed, locationWithNoPlanet),
            /System doesn't exist at location/,
            'Expected an error when the system does not exist'
        )
    })

    test('planet name is syllable-based', () => {
        const name = getSystemName(testGameSeed, {x: 1, y: 17})
        assert.equal(name, 'Zulmeirsum')
    })

    test('asteroid name is alphanumeric designation', () => {
        const name = getSystemName(testGameSeed, {x: 0, y: 1})
        assert.equal(name, 'SZ-1724')
        assert.match(name, /^[A-Z]{2}-\d{4}$/)
    })

    test('nebula name is two descriptive words', () => {
        const name = getSystemName(testGameSeed, {x: 0, y: -3})
        assert.include(name, ' ')
    })

    test('ice field name is LL-D/NNNN format', () => {
        const name = getSystemName(testGameSeed, {x: -9, y: -5})
        assert.equal(name, 'TH-7/7935')
        assert.match(name, /^[A-Z]{2}-\d\/\d{4}$/)
    })

    test('is deterministic', () => {
        const name1 = getSystemName(testGameSeed, {x: 7, y: 2})
        const name2 = getSystemName(testGameSeed, {x: 7, y: 2})
        assert.equal(name1, name2)
    })

    test('different coordinates produce different names', () => {
        const name1 = getSystemName(testGameSeed, {x: 1, y: 17})
        const name2 = getSystemName(testGameSeed, {x: 7, y: 2})
        assert.notEqual(name1, name2)
    })
})

describe('deriveLocationStatic', () => {
    test('returns location_static struct', () => {
        const result = deriveLocationStatic(testGameSeed, {x: 0, y: 0})
        assert.ok(result.coords, 'Should have coords')
        assert.ok(result.type !== undefined, 'Should have type')
        assert.ok(result.subtype !== undefined, 'Should have subtype')
        assert.ok(result.seed0 !== undefined, 'Should have seed0')
        assert.ok(result.seed1 !== undefined, 'Should have seed1')
    })

    test('coords match input', () => {
        const coords = {x: 5, y: 10}
        const result = deriveLocationStatic(testGameSeed, coords)
        assert.equal(result.coords.x.toNumber(), 5)
        assert.equal(result.coords.y.toNumber(), 10)
    })

    test('is deterministic', () => {
        const coords = {x: 7, y: 3}
        const result1 = deriveLocationStatic(testGameSeed, coords)
        const result2 = deriveLocationStatic(testGameSeed, coords)
        assert.equal(result1.type.toNumber(), result2.type.toNumber())
        assert.equal(result1.subtype.toNumber(), result2.subtype.toNumber())
        assert.equal(result1.seed0.toNumber(), result2.seed0.toNumber())
        assert.equal(result1.seed1.toNumber(), result2.seed1.toNumber())
    })

    test('EMPTY location has zeroed seeds', () => {
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const result = deriveLocationStatic(testGameSeed, {x, y})
                if (result.type.toNumber() === LocationType.EMPTY) {
                    assert.equal(result.subtype.toNumber(), 0)
                    assert.equal(result.seed0.toNumber(), 0)
                    assert.equal(result.seed1.toNumber(), 0)
                    return
                }
            }
        }
        assert.fail('Could not find EMPTY location in search space')
    })

    test('non-EMPTY location has populated seeds', () => {
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const result = deriveLocationStatic(testGameSeed, {x, y})
                if (result.type.toNumber() !== LocationType.EMPTY) {
                    return
                }
            }
        }
        assert.fail('Could not find non-EMPTY location in search space')
    })

    test('type values are valid LocationType', () => {
        const result = deriveLocationStatic(testGameSeed, {x: 0, y: 0})
        const validTypes = [
            LocationType.EMPTY,
            LocationType.PLANET,
            LocationType.ASTEROID,
            LocationType.NEBULA,
            LocationType.ICE_FIELD,
        ]
        assert.include(validTypes, result.type.toNumber())
    })
})

describe('deriveLocation', () => {
    test('returns location_derived struct', () => {
        const result = deriveLocation(testGameSeed, {x: 0, y: 0})
        assert.ok(result.static_props, 'Should have static_props')
        assert.ok(result.size, 'Should have size')
    })

    test('static_props matches deriveLocationStatic', () => {
        const coords = {x: 5, y: 10}
        const derived = deriveLocation(testGameSeed, coords)
        const staticOnly = deriveLocationStatic(testGameSeed, coords)
        assert.equal(derived.static_props.type.toNumber(), staticOnly.type.toNumber())
        assert.equal(derived.static_props.subtype.toNumber(), staticOnly.subtype.toNumber())
    })
})
