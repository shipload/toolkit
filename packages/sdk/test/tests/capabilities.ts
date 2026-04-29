import {describe, test} from 'bun:test'
import {assert} from 'chai'

import {
    capabilityAttributes,
    capabilityNames,
    capsHasHauler,
    type EntityCapabilities,
    getCapabilityAttributes,
    getStatMappings,
    getStatMappingsForCapability,
    getStatMappingsForStat,
    isInvertedAttribute,
    ServerContract,
} from '$lib'

describe('Capabilities', () => {
    test('capabilityNames has 10 entries', () => {
        assert.equal(capabilityNames.length, 10)
    })

    test('getCapabilityAttributes returns all attributes', () => {
        const all = getCapabilityAttributes()
        assert.equal(all.length, capabilityAttributes.length)
    })

    test('getCapabilityAttributes filters by capability', () => {
        const gathering = getCapabilityAttributes('Gathering')
        assert.equal(gathering.length, 4)
        assert.isTrue(gathering.every((a) => a.capability === 'Gathering'))
    })

    test('getStatMappings derivation has shape and no rationale', () => {
        const all = getStatMappings()
        assert.isAbove(all.length, 0)
        for (const m of all) {
            assert.isString(m.stat)
            assert.isString(m.capability)
            assert.isString(m.attribute)
            assert.notProperty(m, 'rationale')
        }
    })

    test('getStatMappingsForStat filters correctly', () => {
        const strength = getStatMappingsForStat('Strength')
        assert.isAbove(strength.length, 0)
        assert.isTrue(strength.every((m) => m.stat === 'Strength'))
    })

    test('getStatMappingsForCapability filters correctly', () => {
        const manufacturing = getStatMappingsForCapability('Crafter')
        assert.isTrue(manufacturing.length > 0)
        assert.isTrue(manufacturing.every((m) => m.capability === 'Crafter'))
    })

    test('isInvertedAttribute returns true for drain and mass', () => {
        assert.isTrue(isInvertedAttribute('drain'))
        assert.isTrue(isInvertedAttribute('mass'))
    })

    test('isInvertedAttribute returns false for non-inverted attributes', () => {
        assert.isFalse(isInvertedAttribute('thrust'))
        assert.isFalse(isInvertedAttribute('capacity'))
        assert.isFalse(isInvertedAttribute('yield'))
    })

    test('capsHasHauler returns true when hauler is present', () => {
        const caps: EntityCapabilities = {
            hauler: ServerContract.Types.hauler_stats.from({
                capacity: 2,
                efficiency: 5000,
                drain: 9,
            }),
        }
        assert.isTrue(capsHasHauler(caps))
    })

    test('capsHasHauler returns false when hauler is absent', () => {
        const caps: EntityCapabilities = {}
        assert.isFalse(capsHasHauler(caps))
    })
})
