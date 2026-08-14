import {describe, expect, test} from 'bun:test'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONSTRUCTION_DOCK_T1_PACKED,
    ITEM_ENGINE_T1,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_PLATE,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_WORKSHOP_T1_PACKED,
    ITEM_ORE_T1,
} from '../../src/data/item-ids'
import {
    availableBuildMethods,
    isBuildable,
    isPlotBuildable,
    filterByBuildMethod,
    allBuildableItems,
    allPlotBuildableItems,
} from '../../src/derivation/build-methods'

const UNKNOWN_ITEM_ID = 65000

describe('availableBuildMethods', () => {
    test('planetary structures return craft+deploy and plot', () => {
        expect(availableBuildMethods(ITEM_WAREHOUSE_T1_PACKED)).toEqual(['craft+deploy', 'plot'])
        expect(availableBuildMethods(ITEM_FACTORY_T1_PACKED)).toEqual(['craft+deploy', 'plot'])
        expect(availableBuildMethods(ITEM_EXTRACTOR_T1_PACKED)).toEqual(['craft+deploy', 'plot'])
        expect(availableBuildMethods(ITEM_CONSTRUCTION_DOCK_T1_PACKED)).toEqual([
            'craft+deploy',
            'plot',
        ])
    })

    test('the retired Workshop has no build methods', () => {
        expect(availableBuildMethods(ITEM_WORKSHOP_T1_PACKED)).toEqual([])
        expect(isPlotBuildable(ITEM_WORKSHOP_T1_PACKED)).toBe(false)
    })

    test('orbital vessels return craft+deploy only', () => {
        expect(availableBuildMethods(ITEM_ROUSTABOUT_T1A_PACKED)).toEqual(['craft+deploy'])
        expect(availableBuildMethods(ITEM_SHIP_T1_PACKED)).toEqual([])
        expect(availableBuildMethods(ITEM_CONTAINER_T1_PACKED)).toEqual(['craft+deploy'])
    })

    test('modules and components return craft+deploy', () => {
        expect(availableBuildMethods(ITEM_PLATE)).toEqual(['craft+deploy'])
        expect(availableBuildMethods(ITEM_ENGINE_T1)).toEqual(['craft+deploy'])
    })

    test('raw resources have no build methods', () => {
        expect(availableBuildMethods(ITEM_ORE_T1)).toEqual([])
    })

    test('unknown item ids return empty array (no throw)', () => {
        expect(availableBuildMethods(UNKNOWN_ITEM_ID)).toEqual([])
    })
})

describe('isBuildable', () => {
    test('true for any item with build methods', () => {
        expect(isBuildable(ITEM_WAREHOUSE_T1_PACKED)).toBe(true)
        expect(isBuildable(ITEM_ROUSTABOUT_T1A_PACKED)).toBe(true)
        expect(isBuildable(ITEM_SHIP_T1_PACKED)).toBe(false)
        expect(isBuildable(ITEM_PLATE)).toBe(true)
    })

    test('false for raw resources', () => {
        expect(isBuildable(ITEM_ORE_T1)).toBe(false)
    })

    test('false for unknown item ids', () => {
        expect(isBuildable(UNKNOWN_ITEM_ID)).toBe(false)
    })
})

describe('isPlotBuildable', () => {
    test('true only for planetary structures', () => {
        expect(isPlotBuildable(ITEM_WAREHOUSE_T1_PACKED)).toBe(true)
        expect(isPlotBuildable(ITEM_FACTORY_T1_PACKED)).toBe(true)
        expect(isPlotBuildable(ITEM_EXTRACTOR_T1_PACKED)).toBe(true)
    })

    test('false for orbital vessels', () => {
        expect(isPlotBuildable(ITEM_SHIP_T1_PACKED)).toBe(false)
        expect(isPlotBuildable(ITEM_CONTAINER_T1_PACKED)).toBe(false)
    })

    test('false for modules / components / resources / unknown', () => {
        expect(isPlotBuildable(ITEM_PLATE)).toBe(false)
        expect(isPlotBuildable(ITEM_ENGINE_T1)).toBe(false)
        expect(isPlotBuildable(ITEM_ORE_T1)).toBe(false)
        expect(isPlotBuildable(UNKNOWN_ITEM_ID)).toBe(false)
    })
})

describe('filterByBuildMethod', () => {
    const sample = [
        {itemId: ITEM_WAREHOUSE_T1_PACKED},
        {itemId: ITEM_ROUSTABOUT_T1A_PACKED},
        {itemId: ITEM_SHIP_T1_PACKED},
        {itemId: ITEM_PLATE},
        {itemId: ITEM_ORE_T1},
    ]

    test('plot filter returns only planetary structures', () => {
        const result = filterByBuildMethod(sample, 'plot')
        expect(result).toEqual([{itemId: ITEM_WAREHOUSE_T1_PACKED}])
    })

    test('craft+deploy filter returns everything with a recipe', () => {
        const result = filterByBuildMethod(sample, 'craft+deploy')
        expect(result.map((s) => s.itemId).sort()).toEqual(
            [ITEM_WAREHOUSE_T1_PACKED, ITEM_ROUSTABOUT_T1A_PACKED, ITEM_PLATE].sort()
        )
    })
})

describe('allBuildableItems / allPlotBuildableItems', () => {
    test('allBuildableItems excludes raw resources and includes at least the known recipes', () => {
        const list = allBuildableItems()
        const ids = list.map((i) => i.id)
        expect(ids).toContain(ITEM_WAREHOUSE_T1_PACKED)
        expect(ids).toContain(ITEM_ROUSTABOUT_T1A_PACKED)
        expect(ids).not.toContain(ITEM_SHIP_T1_PACKED)
        expect(ids).toContain(ITEM_PLATE)
        expect(ids).not.toContain(ITEM_ORE_T1)
    })

    test('allPlotBuildableItems returns only the planetary structures', () => {
        const ids = allPlotBuildableItems()
            .map((i) => i.id)
            .sort()
        expect(ids).toEqual(
            [
                ITEM_WAREHOUSE_T1_PACKED,
                ITEM_EXTRACTOR_T1_PACKED,
                ITEM_FACTORY_T1_PACKED,
                ITEM_CONSTRUCTION_DOCK_T1_PACKED,
            ].sort()
        )
    })
})
