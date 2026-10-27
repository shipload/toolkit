import {expect, test} from 'bun:test'
import {
    getAllRecipes,
    getRecipeConsumers,
    getComponentDemand,
    getResourceDemand,
} from './recipe-usage'
import {
    ITEM_SENSOR,
    ITEM_SENSOR_T2,
    ITEM_PLATE,
    ITEM_BEAM,
    ITEM_GATHERER_T1,
    ITEM_CRAFTER_T1,
    ITEM_BUILDER_T1,
    ITEM_EXTRACTOR_T2_PACKED,
    ITEM_PROSPECTOR_T1A_PACKED,
    ITEM_TENDER_T1A_PACKED,
    ITEM_WRIGHT_T1A_PACKED,
    ITEM_TUG_T1A_PACKED,
    ITEM_PORTER_T1A_PACKED,
    ITEM_SMITH_T1A_PACKED,
} from '../data/item-ids'

test('getAllRecipes returns the full catalog including the gatherer', () => {
    const all = getAllRecipes()
    expect(all.length).toBeGreaterThan(20)
    expect(all.some((r) => r.outputItemId === ITEM_GATHERER_T1)).toBe(true)
})

test('getRecipeConsumers lists every recipe that consumes Sensor', () => {
    const consumers = getRecipeConsumers(ITEM_SENSOR)
    const ids = consumers.map((c) => c.outputItemId).sort((a, b) => a - b)
    expect(ids).toEqual(
        [
            ITEM_CRAFTER_T1,
            ITEM_BUILDER_T1,
            ITEM_PROSPECTOR_T1A_PACKED,
            ITEM_TENDER_T1A_PACKED,
            ITEM_WRIGHT_T1A_PACKED,
            ITEM_TUG_T1A_PACKED,
            ITEM_PORTER_T1A_PACKED,
            ITEM_SMITH_T1A_PACKED,
        ].sort((a, b) => a - b)
    )
})

test('Beam feeds the gatherer yield stat', () => {
    const consumers = getRecipeConsumers(ITEM_BEAM)
    const gatherer = consumers.find((c) => c.outputItemId === ITEM_GATHERER_T1)
    expect(gatherer).toBeDefined()
    const yieldFlow = gatherer?.statFlows.find(
        (f) => f.capability === 'Gathering' && f.attribute === 'yield'
    )
    expect(yieldFlow).toBeDefined()
})

test('Sensor is a mass-only sink in the Extractor recipe', () => {
    const consumers = getRecipeConsumers(ITEM_SENSOR_T2)
    const extractor = consumers.find((c) => c.outputItemId === ITEM_EXTRACTOR_T2_PACKED)
    expect(extractor).toBeDefined()
    expect(extractor?.statFlows).toHaveLength(0)
})

test('getResourceDemand returns the resource tonnage for a single-resource component', () => {
    expect(getResourceDemand(ITEM_PLATE)).toEqual({ore: 10})
})

test('getResourceDemand traces a Machined component to its one resource', () => {
    expect(getResourceDemand(ITEM_BEAM)).toEqual({ore: 10})
})

test('getResourceDemand recurses through a module to raw resources', () => {
    expect(getResourceDemand(ITEM_GATHERER_T1)).toEqual({ore: 3000, regolith: 3000})
})

test('getResourceDemand scales by quantity', () => {
    expect(getResourceDemand(ITEM_PLATE, 3)).toEqual({ore: 30})
})

test('getComponentDemand reports Sensor as consumed by eight recipes', () => {
    const demand = getComponentDemand()
    const sensor = demand.find((d) => d.itemId === ITEM_SENSOR)
    expect(sensor).toBeDefined()
    expect(sensor?.consumerCount).toBe(8)
})
