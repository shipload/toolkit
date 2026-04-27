import {assert} from 'chai'

import {
    categoryFromIndex,
    categoryLabel,
    categoryLabelFromIndex,
    getComponents,
    getEntityItems,
    getModules,
    getResources,
    resolveItemCategory,
    tierLabel,
    typeLabel,
} from 'src/items'

suite('item helpers', function () {
    suite('getResources', function () {
        test('returns only type=resource items', function () {
            const r = getResources()
            assert.isAbove(r.length, 0)
            assert.isTrue(r.every((i) => i.type === 'resource'))
        })

        test('filters by category', function () {
            const ore = getResources({category: 'ore'})
            assert.isAbove(ore.length, 0)
            assert.isTrue(ore.every((i) => i.category === 'ore'))
        })

        test('filters by tier', function () {
            const t1 = getResources({tier: 1})
            assert.isAbove(t1.length, 0)
            assert.isTrue(t1.every((i) => i.tier === 1))
        })

        test('intersects category and tier', function () {
            const t2Ore = getResources({category: 'ore', tier: 2})
            assert.isTrue(t2Ore.every((i) => i.category === 'ore' && i.tier === 2))
        })

        test('returns empty array for unknown tier', function () {
            assert.deepEqual(getResources({tier: 99}), [])
        })
    })

    suite('getComponents', function () {
        test('returns only type=component items', function () {
            const c = getComponents()
            assert.isAbove(c.length, 0)
            assert.isTrue(c.every((i) => i.type === 'component'))
        })

        test('filters by tier', function () {
            const t1 = getComponents({tier: 1})
            assert.isTrue(t1.every((i) => i.tier === 1))
        })
    })

    suite('getModules', function () {
        test('returns only type=module items', function () {
            const m = getModules()
            assert.isAbove(m.length, 0)
            assert.isTrue(m.every((i) => i.type === 'module'))
        })

        test('filters by moduleType', function () {
            const engines = getModules({moduleType: 'engine'})
            assert.isTrue(engines.every((i) => i.moduleType === 'engine'))
        })

        test('intersects moduleType and tier', function () {
            const t1Engines = getModules({moduleType: 'engine', tier: 1})
            assert.isTrue(t1Engines.every((i) => i.moduleType === 'engine' && i.tier === 1))
        })
    })

    suite('getEntityItems', function () {
        test('returns only type=entity items', function () {
            const e = getEntityItems()
            assert.isAbove(e.length, 0)
            assert.isTrue(e.every((i) => i.type === 'entity'))
        })

        test('filters by tier', function () {
            const t1 = getEntityItems({tier: 1})
            assert.isTrue(t1.every((i) => i.tier === 1))
        })
    })

    suite('resolveItemCategory', function () {
        test('returns category for known resource id', function () {
            assert.equal(resolveItemCategory(101), 'ore')
            assert.equal(resolveItemCategory(201), 'crystal')
            assert.equal(resolveItemCategory(301), 'gas')
        })

        test('returns undefined for non-resource id', function () {
            assert.isUndefined(resolveItemCategory(10001))
            assert.isUndefined(resolveItemCategory(10100))
        })

        test('returns undefined for unknown id', function () {
            assert.isUndefined(resolveItemCategory(99999))
        })
    })

    suite('typeLabel', function () {
        test('accepts string', function () {
            assert.equal(typeLabel('resource'), 'Resource')
            assert.equal(typeLabel('component'), 'Component')
            assert.equal(typeLabel('module'), 'Module')
            assert.equal(typeLabel('entity'), 'Entity')
        })

        test('accepts chain enum number', function () {
            assert.equal(typeLabel(0), 'Resource')
            assert.equal(typeLabel(1), 'Component')
            assert.equal(typeLabel(2), 'Module')
            assert.equal(typeLabel(3), 'Entity')
        })

        test('falls back for unknown', function () {
            assert.equal(typeLabel(99), 'type 99')
        })
    })

    suite('categoryLabel', function () {
        test('returns display string', function () {
            assert.equal(categoryLabel('ore'), 'Ore')
            assert.equal(categoryLabel('crystal'), 'Crystal')
        })
    })

    suite('categoryFromIndex', function () {
        // Locks in the chain rescat enum order from server::getrescats:
        // [ore=0, gas=1, regolith=2, biomass=3, crystal=4]
        // This deliberately does NOT match the player-facing T-prefix order
        // (ore=100, crystal=200, gas=300, regolith=400, biomass=500).
        test('encodes chain enum order (gas=1, crystal=4)', function () {
            assert.equal(categoryFromIndex(0), 'ore')
            assert.equal(categoryFromIndex(1), 'gas')
            assert.equal(categoryFromIndex(2), 'regolith')
            assert.equal(categoryFromIndex(3), 'biomass')
            assert.equal(categoryFromIndex(4), 'crystal')
        })

        test('returns undefined for unknown index', function () {
            assert.isUndefined(categoryFromIndex(99))
        })
    })

    suite('categoryLabelFromIndex', function () {
        test('composes index to category to label', function () {
            assert.equal(categoryLabelFromIndex(0), 'Ore')
            assert.equal(categoryLabelFromIndex(1), 'Gas')
            assert.equal(categoryLabelFromIndex(4), 'Crystal')
        })

        test('falls back for unknown index', function () {
            assert.equal(categoryLabelFromIndex(99), 'category 99')
        })
    })

    suite('tierLabel', function () {
        test('returns rarity label for known tier', function () {
            assert.equal(tierLabel(1), 'Common')
            assert.equal(tierLabel(5), 'Legendary')
            assert.equal(tierLabel(10), 'Transcendent')
        })

        test('falls back for unknown tier', function () {
            assert.equal(tierLabel(99), 'T99')
        })
    })
})
