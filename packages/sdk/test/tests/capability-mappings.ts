import {describe, test} from 'bun:test'
import {assert} from 'chai'

import {
    deriveStatMappings,
    getStatMappings,
    getStatMappingsForCapability,
    getStatMappingsForStat,
    getProducersForAttribute,
    getCapabilityAttributeRows,
    type StatMapping,
} from '../../src/derivation/capability-mappings'
import {capabilityAttributes} from '../../src/data/capabilities'

describe('deriveStatMappings', () => {
    test('produces mappings for every stat the contract currently consumes', () => {
        const mappings = deriveStatMappings()
        assert.isAbove(mappings.length, 0)
        for (const m of mappings) {
            assert.isString(m.stat)
            assert.isString(m.capability)
            assert.isString(m.attribute)
        }
    })

    test('Strength drives Gathering.yield and Storage.capacity', () => {
        const mappings = getStatMappingsForStat('Strength')
        const tuples = mappings.map((m) => `${m.capability}.${m.attribute}`).sort()
        assert.deepInclude(tuples, 'Gathering.yield')
        assert.deepInclude(tuples, 'Storage.capacity')
    })

    test('Insulation drives Loading.mass', () => {
        const tuples = getStatMappingsForStat('Insulation').map(
            (m) => `${m.capability}.${m.attribute}`
        )
        assert.deepInclude(tuples, 'Loading.mass')
    })

    test('Resonance drives Energy.capacity', () => {
        const tuples = getStatMappingsForStat('Resonance').map(
            (m) => `${m.capability}.${m.attribute}`
        )
        assert.deepInclude(tuples, 'Energy.capacity')
    })

    test('getStatMappingsForCapability filters correctly', () => {
        const energy = getStatMappingsForCapability('Energy')
        assert.isAbove(energy.length, 0)
        assert.isTrue(energy.every((m) => m.capability === 'Energy'))
    })

    test('getStatMappings is memoized (returns same array reference)', () => {
        const a = getStatMappings()
        const b = getStatMappings()
        assert.strictEqual(a, b)
    })
})

describe('producer (source) is always present', () => {
    test('every derived mapping carries a non-empty source', () => {
        const mappings = deriveStatMappings()
        assert.isAbove(mappings.length, 0)
        assert.isTrue(mappings.every((m) => typeof m.source === 'string' && m.source.length > 0))
    })

    test('Energy.capacity is produced by more than one source', () => {
        const rows = getStatMappingsForCapability('Energy').filter(
            (m) => m.attribute === 'capacity'
        )
        assert.isAbove(new Set(rows.map((m) => m.source)).size, 1)
    })

    test('Storage.capacity splits across a module and the entity Hull', () => {
        const rows = getStatMappingsForCapability('Storage').filter(
            (m) => m.attribute === 'capacity'
        )
        const sources = [...new Set(rows.map((m) => m.source))]
        assert.include(sources, 'Hull')
        assert.isAbove(sources.length, 1)
    })

    test('a single-producer attribute now carries its producer too', () => {
        const rows = getStatMappingsForCapability('Crafting').filter((m) => m.attribute === 'speed')
        assert.isAbove(rows.length, 0)
        assert.isTrue(rows.every((m) => typeof m.source === 'string' && m.source.length > 0))
        assert.strictEqual(new Set(rows.map((m) => m.source)).size, 1)
    })
})

describe('stat coverage', () => {
    const expected: Record<string, string[]> = {
        Strength: ['Gathering.yield', 'Storage.capacity'],
        Tolerance: ['Gathering.depth'],
        Density: ['Gathering.yield', 'Hull.mass', 'Storage.capacity'],
        Conductivity: ['Crafting.drain', 'Energy.capacity', 'Hauling.drain', 'Warp.range'],
        Resonance: ['Energy.capacity', 'Hauling.capacity'],
        Reflectivity: ['Energy.recharge', 'Hauling.capacity', 'Warp.range'],
        Volatility: ['Energy.capacity', 'Movement.thrust'],
        Reactivity: ['Movement.thrust'],
        Thermal: ['Energy.capacity', 'Movement.drain'],
        Hardness: ['Gathering.depth', 'Storage.capacity'],
        Cohesion: ['Crafting.speed', 'Storage.capacity'],
        Fineness: ['Crafting.speed', 'Hull.mass'],
        Plasticity: ['Energy.capacity', 'Hauling.efficiency', 'Loading.thrust'],
        Insulation: ['Energy.capacity', 'Loading.mass'],
        Saturation: ['Gathering.drain', 'Loading.thrust'],
    }

    for (const [stat, expectedTuples] of Object.entries(expected)) {
        test(`${stat} drives ${expectedTuples.length} attribute(s)`, () => {
            const actual = [
                ...new Set(
                    getStatMappingsForStat(stat).map((m) => `${m.capability}.${m.attribute}`)
                ),
            ].sort()
            assert.deepEqual(actual, expectedTuples.slice().sort())
        })
    }
})

describe('producer-join helpers', () => {
    test('getProducersForAttribute returns the distinct producers', () => {
        assert.strictEqual(getProducersForAttribute('Energy', 'capacity').length, 2)
        assert.strictEqual(getProducersForAttribute('Movement', 'thrust').length, 1)
    })

    test('getProducersForAttribute is empty for attributes with no slot producer', () => {
        assert.deepEqual(getProducersForAttribute('Loading', 'quantity'), [])
        assert.deepEqual(getProducersForAttribute('Crafting', 'quality'), [])
        assert.deepEqual(getProducersForAttribute('Launch', 'range'), [])
    })

    test('getCapabilityAttributeRows expands multi-producer attributes', () => {
        const rows = getCapabilityAttributeRows()
        assert.strictEqual(rows.length, capabilityAttributes.length + 2)
        const energyCap = rows.filter(
            (r) => r.capability === 'Energy' && r.attribute === 'capacity'
        )
        assert.strictEqual(energyCap.length, 2)
        assert.isTrue(
            energyCap.every((r) => typeof r.source === 'string' && (r.source as string).length > 0)
        )
    })

    test('getCapabilityAttributeRows keeps uncovered attributes as one source-less row', () => {
        const rows = getCapabilityAttributeRows()
        const loaderQty = rows.filter(
            (r) => r.capability === 'Loading' && r.attribute === 'quantity'
        )
        assert.strictEqual(loaderQty.length, 1)
        assert.strictEqual(loaderQty[0].source, undefined)
    })

    test('getCapabilityAttributeRows carries a shared description on every row', () => {
        const rows = getCapabilityAttributeRows()
        assert.isTrue(
            rows.every((r) => typeof r.description === 'string' && r.description.length > 0)
        )
    })
})
