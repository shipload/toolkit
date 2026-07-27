import {describe, test} from 'bun:test'
import {assert} from 'chai'

import {getItem} from '$lib'
import items from '../../src/data/items.json'

// Resource mass is uniform (1000) since the mass-as-quantity collapse on
// 2026-05-27. Tier identity now lives in depth gating, per-tier recipes, and
// stat rolls; the per-category mass curves retired with mass-tiers.md.
const UNIFORM_RESOURCE_MASS = 1000
const CATEGORIES: Array<[number, string]> = [
    [100, 'ore'],
    [200, 'crystal'],
    [300, 'gas'],
    [400, 'regolith'],
    [500, 'biomass'],
]
const EXPECTED_RESOURCE_MASSES: Array<[number, string, number, number]> = CATEGORIES.flatMap(
    ([base, category]) =>
        Array.from(
            {length: 10},
            (_, i) =>
                [base + i + 1, category, i + 1, UNIFORM_RESOURCE_MASS] as [
                    number,
                    string,
                    number,
                    number,
                ]
        )
)

interface ItemRow {
    id: number
    mass: number
    type: string
    tier: number
    category?: string
    subtype?: string
}

describe('items.json resource masses', () => {
    const byId = new Map<number, ItemRow>(
        (items as unknown as ItemRow[]).map((item) => [item.id, item])
    )

    for (const [id, category, tier, expectedMass] of EXPECTED_RESOURCE_MASSES) {
        test(`id ${id} (${category} t${tier}) has mass ${expectedMass}`, () => {
            const row = byId.get(id)
            assert.isDefined(row, `missing resource id ${id}`)
            assert.equal(row!.category, category)
            assert.equal(row!.tier, tier)
            assert.equal(row!.mass, expectedMass)
        })
    }
})

describe('getItem strictness', () => {
    test('returns honest fields for a raw resource', () => {
        const ore = getItem(101)
        assert.equal(ore.name, 'Ore')
        assert.equal(ore.tier, 1)
        assert.equal(ore.category, 'ore')
        assert.equal(ore.type, 'resource')
        assert.isUndefined(ore.moduleType)
    })

    test('returns honest fields for a component', () => {
        const hp = getItem(10001)
        assert.equal(hp.name, 'Plate')
        assert.equal(hp.tier, 1)
        assert.isUndefined(hp.category)
        assert.equal(hp.type, 'component')
    })

    test('returns honest fields for a T2 component', () => {
        const hpT2 = getItem(11001)
        assert.equal(hpT2.name, 'Plate')
        assert.equal(hpT2.tier, 2)
        assert.equal(hpT2.type, 'component')
    })

    test('returns moduleType for a module item', () => {
        const engine = getItem(10100)
        assert.equal(engine.type, 'module')
        assert.equal(engine.moduleType, 'engine')
    })

    test('throws on unknown item id', () => {
        assert.throws(() => getItem(60000), /Unknown item id: 60000/)
    })
})
