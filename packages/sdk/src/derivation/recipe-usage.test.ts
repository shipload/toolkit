import {expect, test} from 'bun:test'
import {
    getAllRecipes,
    getRecipeConsumers,
    getComponentDemand,
    getResourceDemand,
} from './recipe-usage'
import {
    ITEM_SENSOR,
    ITEM_RESIN,
    ITEM_FRAME,
    ITEM_PLATE,
    ITEM_BEAM,
    ITEM_GATHERER_T1,
    ITEM_CRAFTER_T1,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_ROUSTABOUT_T1_PACKED,
    ITEM_PROSPECTOR_T1_PACKED,
    ITEM_TENDER_T1_PACKED,
    ITEM_TUG_T1_PACKED,
    ITEM_PORTER_T1_PACKED,
    ITEM_WRANGLER_T1_PACKED,
    ITEM_DREDGER_T1_PACKED,
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
        [ITEM_CRAFTER_T1, ITEM_EXTRACTOR_T1_PACKED, ITEM_ROUSTABOUT_T1_PACKED].sort((a, b) => a - b)
    )
})

test('Frame feeds the gatherer drain stat', () => {
    const consumers = getRecipeConsumers(ITEM_FRAME)
    const gatherer = consumers.find((c) => c.outputItemId === ITEM_GATHERER_T1)
    expect(gatherer).toBeDefined()
    const drain = gatherer?.statFlows.find(
        (f) => f.capability === 'Gathering' && f.attribute === 'drain'
    )
    expect(drain).toBeDefined()
})

test('Sensor is a mass-only sink in the Extractor recipe', () => {
    const consumers = getRecipeConsumers(ITEM_SENSOR)
    const extractor = consumers.find((c) => c.outputItemId === ITEM_EXTRACTOR_T1_PACKED)
    expect(extractor).toBeDefined()
    expect(extractor?.statFlows).toHaveLength(0)
})

test('getResourceDemand returns the resource tonnage for a single-resource component', () => {
    expect(getResourceDemand(ITEM_PLATE)).toEqual({ore: 10})
})

test('getResourceDemand traces a dual-resource component to both resources', () => {
    expect(getResourceDemand(ITEM_BEAM)).toEqual({ore: 5, gas: 5})
})

test('getResourceDemand recurses through a module to raw resources', () => {
    // Gatherer = 300 Beam (5 ore + 5 gas each) + 300 Frame (5 regolith + 5 biomass each)
    expect(getResourceDemand(ITEM_GATHERER_T1)).toEqual({
        ore: 1500,
        gas: 1500,
        regolith: 1500,
        biomass: 1500,
    })
})

test('getResourceDemand scales by quantity', () => {
    expect(getResourceDemand(ITEM_PLATE, 3)).toEqual({ore: 30})
})

test('getComponentDemand reports Resin as consumed by nine recipes', () => {
    const demand = getComponentDemand()
    const resin = demand.find((d) => d.itemId === ITEM_RESIN)
    expect(resin).toBeDefined()
    expect(resin?.consumerCount).toBe(9)
})
