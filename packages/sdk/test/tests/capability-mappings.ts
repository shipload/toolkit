import {describe, test} from 'bun:test'
import {assert} from 'chai'

import {
    deriveStatMappings,
    getStatMappings,
    getStatMappingsForCapability,
    getStatMappingsForStat,
    type StatMapping,
} from '../../src/derivation/capability-mappings'

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

    test('Strength drives Gathering.yield, Storage.bonus, and entity Storage.capacity', () => {
        const mappings = getStatMappingsForStat('Strength')
        const tuples = mappings.map((m) => `${m.capability}.${m.attribute}`).sort()
        assert.deepInclude(tuples, 'Gathering.yield')
        assert.deepInclude(tuples, 'Storage.bonus')
        assert.deepInclude(tuples, 'Storage.capacity')
    })

    test('Insulation drives Loader.mass', () => {
        const tuples = getStatMappingsForStat('Insulation').map(
            (m) => `${m.capability}.${m.attribute}`
        )
        assert.deepInclude(tuples, 'Loader.mass')
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

describe('stat coverage', () => {
    const expected: Record<string, string[]> = {
        Strength: ['Gathering.yield', 'Storage.bonus', 'Storage.capacity'],
        Tolerance: ['Gathering.depth'],
        Density: ['Hull.mass', 'Storage.bonus'],
        Conductivity: ['Gathering.drain'],
        Resonance: ['Energy.capacity', 'Hauler.capacity', 'Warp.range'],
        Reflectivity: ['Energy.recharge', 'Hauler.drain'],
        Volatility: ['Battery.bonus', 'Movement.thrust'],
        Reactivity: ['Crafter.speed'],
        Thermal: ['Battery.bonus', 'Movement.drain', 'Warp.range'],
        Hardness: ['Storage.bonus', 'Storage.capacity'],
        Cohesion: ['Storage.bonus'],
        Fineness: ['Crafter.drain', 'Hull.mass'],
        Plasticity: ['Battery.bonus', 'Hauler.efficiency', 'Loader.thrust'],
        Insulation: ['Battery.bonus', 'Loader.mass'],
        Saturation: [],
    }

    for (const [stat, expectedTuples] of Object.entries(expected)) {
        test(`${stat} drives ${expectedTuples.length} attribute(s)`, () => {
            const actual = getStatMappingsForStat(stat)
                .map((m) => `${m.capability}.${m.attribute}`)
                .sort()
            assert.deepEqual(actual, expectedTuples.slice().sort())
        })
    }
})
