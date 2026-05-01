import {describe, test} from 'bun:test'
import {assert} from 'chai'

import {getItem} from '$lib'
import items from '../../src/data/items.json'

const EXPECTED_RESOURCE_MASSES: Array<[number, string, number, number]> = [
    [101, 'ore', 1, 52000],
    [102, 'ore', 2, 58000],
    [103, 'ore', 3, 64000],
    [104, 'ore', 4, 71000],
    [105, 'ore', 5, 78000],
    [106, 'ore', 6, 87000],
    [107, 'ore', 7, 96000],
    [108, 'ore', 8, 107000],
    [109, 'ore', 9, 118000],
    [110, 'ore', 10, 130000],
    [201, 'crystal', 1, 35000],
    [202, 'crystal', 2, 35000],
    [203, 'crystal', 3, 35000],
    [204, 'crystal', 4, 35000],
    [205, 'crystal', 5, 35000],
    [206, 'crystal', 6, 35000],
    [207, 'crystal', 7, 35000],
    [208, 'crystal', 8, 35000],
    [209, 'crystal', 9, 35000],
    [210, 'crystal', 10, 35000],
    [301, 'gas', 1, 15000],
    [302, 'gas', 2, 13500],
    [303, 'gas', 3, 12000],
    [304, 'gas', 4, 11000],
    [305, 'gas', 5, 10000],
    [306, 'gas', 6, 9000],
    [307, 'gas', 7, 8000],
    [308, 'gas', 8, 7500],
    [309, 'gas', 9, 6500],
    [310, 'gas', 10, 6000],
    [401, 'regolith', 1, 22000],
    [402, 'regolith', 2, 25000],
    [403, 'regolith', 3, 28000],
    [404, 'regolith', 4, 32000],
    [405, 'regolith', 5, 36000],
    [406, 'regolith', 6, 40500],
    [407, 'regolith', 7, 46000],
    [408, 'regolith', 8, 52000],
    [409, 'regolith', 9, 58500],
    [410, 'regolith', 10, 66000],
    [501, 'biomass', 1, 42000],
    [502, 'biomass', 2, 37000],
    [503, 'biomass', 3, 33000],
    [504, 'biomass', 4, 29000],
    [505, 'biomass', 5, 26000],
    [506, 'biomass', 6, 23000],
    [507, 'biomass', 7, 20000],
    [508, 'biomass', 8, 18000],
    [509, 'biomass', 9, 16000],
    [510, 'biomass', 10, 14000],
]

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
        assert.equal(hp.name, 'Hull Plates')
        assert.equal(hp.tier, 1)
        assert.isUndefined(hp.category)
        assert.equal(hp.type, 'component')
    })

    test('returns honest fields for a T2 component', () => {
        const hpT2 = getItem(20001)
        assert.equal(hpT2.name, 'Hull Plates')
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
