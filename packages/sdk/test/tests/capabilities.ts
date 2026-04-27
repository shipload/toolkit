import {assert} from 'chai'

import {
    capabilityAttributes,
    capabilityNames,
    capsHasHauler,
    EntityCapabilities,
    getCapabilityAttributes,
    getStatMappings,
    getStatMappingsForCapability,
    getStatMappingsForStat,
    isInvertedAttribute,
    ServerContract,
    statMappings,
} from '$lib'

suite('Capabilities', function () {
    test('capabilityNames has 10 entries', function () {
        assert.equal(capabilityNames.length, 10)
    })

    test('getCapabilityAttributes returns all attributes', function () {
        const all = getCapabilityAttributes()
        assert.equal(all.length, capabilityAttributes.length)
        assert.equal(all.length, 22)
    })

    test('getCapabilityAttributes filters by capability', function () {
        const gathering = getCapabilityAttributes('Gathering')
        assert.equal(gathering.length, 4)
        assert.isTrue(gathering.every((a) => a.capability === 'Gathering'))
    })

    test('getStatMappings returns all mappings', function () {
        const all = getStatMappings()
        assert.equal(all.length, statMappings.length)
    })

    test('getStatMappingsForStat filters correctly', function () {
        const strength = getStatMappingsForStat('Strength')
        assert.equal(strength.length, 3)
        assert.isTrue(strength.every((m) => m.stat === 'Strength'))
    })

    test('getStatMappingsForCapability filters correctly', function () {
        const manufacturing = getStatMappingsForCapability('Crafter')
        assert.isTrue(manufacturing.length > 0)
        assert.isTrue(manufacturing.every((m) => m.capability === 'Crafter'))
    })

    test('isInvertedAttribute returns true for drain and mass', function () {
        assert.isTrue(isInvertedAttribute('drain'))
        assert.isTrue(isInvertedAttribute('mass'))
    })

    test('isInvertedAttribute returns false for non-inverted attributes', function () {
        assert.isFalse(isInvertedAttribute('thrust'))
        assert.isFalse(isInvertedAttribute('capacity'))
        assert.isFalse(isInvertedAttribute('yield'))
    })

    test('capsHasHauler returns true when hauler is present', function () {
        const caps: EntityCapabilities = {
            hauler: ServerContract.Types.hauler_stats.from({
                capacity: 2,
                efficiency: 5000,
                drain: 9,
            }),
        }
        assert.isTrue(capsHasHauler(caps))
    })

    test('capsHasHauler returns false when hauler is absent', function () {
        const caps: EntityCapabilities = {}
        assert.isFalse(capsHasHauler(caps))
    })
})
