import {assert} from 'chai'

import {
    capabilityAttributes,
    capabilityNames,
    getCapabilityAttributes,
    getStatMappings,
    getStatMappingsForCapability,
    getStatMappingsForStat,
    isInvertedAttribute,
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
        const manufacturing = getStatMappingsForCapability('Manufacturing')
        assert.isTrue(manufacturing.length > 0)
        assert.isTrue(manufacturing.every((m) => m.capability === 'Manufacturing'))
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
})
