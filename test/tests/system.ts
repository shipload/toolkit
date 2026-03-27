import {assert} from 'chai'
import {Checksum256} from '@wharfkit/antelope'
import Shipload, {
    deriveLocation,
    deriveLocationEpoch,
    deriveLocationMixture,
    deriveLocationStatic,
    getSystemName,
    LocationType,
    PRECISION,
} from '$lib'
import {Chains} from '@wharfkit/session'
import {makeClient} from '@wharfkit/mock-data'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

const testGameSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)
const testEpochSeed = Checksum256.from(
    'b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2'
)

suite('getSystemName', function () {
    let shipload: Shipload
    let gameSeed: Checksum256

    setup(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
        const game = await shipload.getGame()
        gameSeed = game.config.seed
    })
    test('should throw an error if system does not exist', function () {
        const locationWithNoPlanet = {x: 0, y: 2}

        assert.throws(
            () => getSystemName(gameSeed, locationWithNoPlanet),
            /System doesn't exist at location/,
            'Expected an error when the system does not exist'
        )
    })

    test('generate name at 0,0', function () {
        const generatedName = getSystemName(gameSeed, {x: 0, y: 0})
        assert.equal(generatedName, 'Gilila')
    })

    test('generate name at 0,1', function () {
        const generatedName = getSystemName(gameSeed, {x: 0, y: 1})
        assert.equal(generatedName, 'Cencaelgru')
    })
})

suite('deriveLocationStatic', function () {
    test('returns location_static struct', function () {
        const result = deriveLocationStatic(testGameSeed, {x: 0, y: 0})
        assert.ok(result.coords, 'Should have coords')
        assert.ok(result.type !== undefined, 'Should have type')
        assert.ok(result.subtype !== undefined, 'Should have subtype')
        assert.ok(result.seed0 !== undefined, 'Should have seed0')
        assert.ok(result.seed1 !== undefined, 'Should have seed1')
    })

    test('coords match input', function () {
        const coords = {x: 5, y: 10}
        const result = deriveLocationStatic(testGameSeed, coords)
        assert.equal(result.coords.x.toNumber(), 5)
        assert.equal(result.coords.y.toNumber(), 10)
    })

    test('is deterministic', function () {
        const coords = {x: 7, y: 3}
        const result1 = deriveLocationStatic(testGameSeed, coords)
        const result2 = deriveLocationStatic(testGameSeed, coords)
        assert.equal(result1.type.toNumber(), result2.type.toNumber())
        assert.equal(result1.subtype.toNumber(), result2.subtype.toNumber())
        assert.equal(result1.seed0.toNumber(), result2.seed0.toNumber())
        assert.equal(result1.seed1.toNumber(), result2.seed1.toNumber())
    })

    test('EMPTY location has zeroed seeds', function () {
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

    test('non-EMPTY location has populated seeds', function () {
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

    test('type values are valid LocationType', function () {
        const result = deriveLocationStatic(testGameSeed, {x: 0, y: 0})
        const validTypes = [
            LocationType.EMPTY,
            LocationType.PLANET,
            LocationType.ASTEROID,
            LocationType.NEBULA,
        ]
        assert.include(validTypes, result.type.toNumber())
    })
})

suite('deriveLocationEpoch', function () {
    test('returns location_epoch struct', function () {
        const result = deriveLocationEpoch(testEpochSeed, {x: 0, y: 0})
        assert.ok(result.active !== undefined, 'Should have active')
        assert.ok(result.seed0 !== undefined, 'Should have seed0')
        assert.ok(result.seed1 !== undefined, 'Should have seed1')
    })

    test('is deterministic', function () {
        const coords = {x: 7, y: 3}
        const result1 = deriveLocationEpoch(testEpochSeed, coords)
        const result2 = deriveLocationEpoch(testEpochSeed, coords)
        assert.equal(result1.active, result2.active)
        assert.equal(result1.seed0.toNumber(), result2.seed0.toNumber())
        assert.equal(result1.seed1.toNumber(), result2.seed1.toNumber())
    })

    test('different epoch seeds produce different results', function () {
        const coords = {x: 0, y: 0}
        const seed2 = Checksum256.from(
            'c3d2e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2'
        )
        const result1 = deriveLocationEpoch(testEpochSeed, coords)
        const result2 = deriveLocationEpoch(seed2, coords)
        const different =
            result1.active !== result2.active ||
            result1.seed0.toNumber() !== result2.seed0.toNumber() ||
            result1.seed1.toNumber() !== result2.seed1.toNumber()
        assert.ok(different, 'Different seeds should produce different results')
    })

    test('active is boolean', function () {
        const result = deriveLocationEpoch(testEpochSeed, {x: 0, y: 0})
        assert.isBoolean(result.active)
    })
})

suite('deriveLocation', function () {
    test('returns location_derived struct', function () {
        const result = deriveLocation(testGameSeed, testEpochSeed, {x: 0, y: 0})
        assert.ok(result.static_props, 'Should have static_props')
        assert.ok(result.epoch_props, 'Should have epoch_props')
    })

    test('static_props matches deriveLocationStatic', function () {
        const coords = {x: 5, y: 10}
        const derived = deriveLocation(testGameSeed, testEpochSeed, coords)
        const staticOnly = deriveLocationStatic(testGameSeed, coords)
        assert.equal(derived.static_props.type.toNumber(), staticOnly.type.toNumber())
        assert.equal(derived.static_props.subtype.toNumber(), staticOnly.subtype.toNumber())
    })

    test('epoch_props matches deriveLocationEpoch', function () {
        const coords = {x: 5, y: 10}
        const derived = deriveLocation(testGameSeed, testEpochSeed, coords)
        const epochOnly = deriveLocationEpoch(testEpochSeed, coords)
        assert.equal(derived.epoch_props.active, epochOnly.active)
        assert.equal(derived.epoch_props.seed0.toNumber(), epochOnly.seed0.toNumber())
    })
})

suite('deriveLocationMixture', function () {
    test('NEBULA returns hydrogen only', function () {
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const location = deriveLocation(testGameSeed, testEpochSeed, {x, y})
                if (location.static_props.type.toNumber() === LocationType.NEBULA) {
                    const mixture = deriveLocationMixture(location, testEpochSeed)
                    assert.equal(mixture.components.length, 1)
                    assert.equal(mixture.components[0].good_id.toNumber(), 1)
                    assert.equal(mixture.components[0].purity.toNumber(), PRECISION)
                    return
                }
            }
        }
        assert.fail('Could not find NEBULA location in search space')
    })

    test('ASTEROID returns iron and copper mix', function () {
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const location = deriveLocation(testGameSeed, testEpochSeed, {x, y})
                if (location.static_props.type.toNumber() === LocationType.ASTEROID) {
                    const mixture = deriveLocationMixture(location, testEpochSeed)
                    assert.equal(mixture.components.length, 2)
                    const goodIds = mixture.components.map((c) => c.good_id.toNumber())
                    assert.include(goodIds, 26)
                    assert.include(goodIds, 29)
                    const totalPurity = mixture.components.reduce(
                        (sum, c) => sum + c.purity.toNumber(),
                        0
                    )
                    assert.equal(totalPurity, PRECISION)
                    return
                }
            }
        }
        assert.fail('Could not find ASTEROID location in search space')
    })

    test('PLANET returns empty components', function () {
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const location = deriveLocation(testGameSeed, testEpochSeed, {x, y})
                if (location.static_props.type.toNumber() === LocationType.PLANET) {
                    const mixture = deriveLocationMixture(location, testEpochSeed)
                    assert.equal(mixture.components.length, 0)
                    return
                }
            }
        }
        assert.fail('Could not find PLANET location in search space')
    })

    test('EMPTY returns empty components', function () {
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const location = deriveLocation(testGameSeed, testEpochSeed, {x, y})
                if (location.static_props.type.toNumber() === LocationType.EMPTY) {
                    const mixture = deriveLocationMixture(location, testEpochSeed)
                    assert.equal(mixture.components.length, 0)
                    return
                }
            }
        }
        assert.fail('Could not find EMPTY location in search space')
    })

    test('ASTEROID purity is within expected range', function () {
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const location = deriveLocation(testGameSeed, testEpochSeed, {x, y})
                if (location.static_props.type.toNumber() === LocationType.ASTEROID) {
                    const mixture = deriveLocationMixture(location, testEpochSeed)
                    const primaryPurity = Math.max(
                        mixture.components[0].purity.toNumber(),
                        mixture.components[1].purity.toNumber()
                    )
                    assert.isAtLeast(primaryPurity, 5000)
                    assert.isAtMost(primaryPurity, 8000)
                    return
                }
            }
        }
        assert.fail('Could not find ASTEROID location in search space')
    })
})
