import {assert} from 'chai'

import {getItem} from '$lib'
import items from '../../src/data/items.json'

const EXPECTED_RESOURCE_MASSES: Array<[number, string, number, number]> = [
    [101, 'ore', 1, 52000],
    [102, 'ore', 2, 58000],
    [103, 'ore', 3, 64000],
    [201, 'crystal', 1, 35000],
    [202, 'crystal', 2, 35000],
    [203, 'crystal', 3, 35000],
    [301, 'gas', 1, 15000],
    [302, 'gas', 2, 13500],
    [303, 'gas', 3, 12000],
    [401, 'regolith', 1, 22000],
    [402, 'regolith', 2, 25000],
    [403, 'regolith', 3, 28000],
    [501, 'biomass', 1, 42000],
    [502, 'biomass', 2, 37000],
    [503, 'biomass', 3, 33000],
]

interface ItemRow {
    id: number
    mass: number
    type: string
    tier: number
    category?: string
    subtype?: string
}

suite('items.json resource masses', () => {
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

suite('getItem strictness', () => {
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

suite('items.json T4-T10 are not surfaced', () => {
    const allIds = new Set((items as unknown as ItemRow[]).map((item) => item.id))
    const forbiddenIds = [
        104, 105, 106, 107, 108, 109, 110, 204, 205, 206, 207, 208, 209, 210, 304, 305, 306, 307,
        308, 309, 310, 404, 405, 406, 407, 408, 409, 410, 504, 505, 506, 507, 508, 509, 510,
    ]
    for (const id of forbiddenIds) {
        test(`resource id ${id} is absent from items.json`, () => {
            assert.isFalse(allIds.has(id))
        })
    }
})
