import {assert} from 'chai'

import {categoryItemMass} from '$lib'
import items from '../../src/data/items.json'

const EXPECTED_RESOURCE_MASSES: Array<[number, string, string, number]> = [
    [101, 'ore', 't1', 52000],
    [102, 'ore', 't2', 58000],
    [103, 'ore', 't3', 64000],
    [201, 'crystal', 't1', 35000],
    [202, 'crystal', 't2', 35000],
    [203, 'crystal', 't3', 35000],
    [301, 'gas', 't1', 15000],
    [302, 'gas', 't2', 13500],
    [303, 'gas', 't3', 12000],
    [401, 'regolith', 't1', 22000],
    [402, 'regolith', 't2', 25000],
    [403, 'regolith', 't3', 28000],
    [501, 'biomass', 't1', 42000],
    [502, 'biomass', 't2', 37000],
    [503, 'biomass', 't3', 33000],
]

interface ItemRow {
    id: number
    name: string
    description: string
    mass: number
    category: string
    tier: string
    color: string
}

suite('items.json resource masses', function () {
    const byId = new Map<number, ItemRow>((items as ItemRow[]).map((item) => [item.id, item]))

    for (const [id, category, tier, expectedMass] of EXPECTED_RESOURCE_MASSES) {
        test(`id ${id} (${category} ${tier}) has mass ${expectedMass}`, function () {
            const row = byId.get(id)
            assert.isDefined(row, `missing resource id ${id}`)
            assert.equal(row!.category, category)
            assert.equal(row!.tier, tier)
            assert.equal(row!.mass, expectedMass)
        })
    }
})

suite('categoryItemMass (T1 fallback masses)', function () {
    test('matches T1 masses from the matrix', function () {
        assert.equal(categoryItemMass.ore, 52000)
        assert.equal(categoryItemMass.crystal, 35000)
        assert.equal(categoryItemMass.gas, 15000)
        assert.equal(categoryItemMass.regolith, 22000)
        assert.equal(categoryItemMass.biomass, 42000)
    })
})

suite('items.json T4-T10 are not surfaced', function () {
    const allIds = new Set((items as ItemRow[]).map((item) => item.id))
    const forbiddenIds = [
        104, 105, 106, 107, 108, 109, 110, 204, 205, 206, 207, 208, 209, 210, 304, 305, 306, 307,
        308, 309, 310, 404, 405, 406, 407, 408, 409, 410, 504, 505, 506, 507, 508, 509, 510,
    ]
    for (const id of forbiddenIds) {
        test(`resource id ${id} is absent from items.json`, function () {
            assert.isFalse(allIds.has(id))
        })
    }
})
