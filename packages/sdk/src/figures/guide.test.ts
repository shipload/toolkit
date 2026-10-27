import {describe, expect, test} from 'bun:test'
import {UInt16, UInt32} from '@wharfkit/antelope'
import {calc_gather_duration, calc_gather_energy} from '../capabilities/gathering'
import {getItem, getItems} from '../data/catalog'
import {
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T1,
} from '../data/item-ids'
import {getRecipe} from '../data/recipes-runtime'
import {
    computeComponentStats,
    computeEntityStats,
    computeStatsFromResources,
    decodeStats,
    encodeStats,
    getItemStatKeys,
    traceResourceStatKeys,
} from '../derivation/crafting'
import {getStatDefinitions} from '../derivation/stats'
import {CATEGORY_LABELS, type ResourceCategory} from '../types'
import {
    gatherFromFigures,
    getModuleFigureSources,
    resourceBaseline,
    STAT_HIGH,
    STAT_LOW,
    sweepModuleFigures,
} from './guide'
import {getModuleFigures} from './module'
import {
    gatherDrainPerMinute,
    milliToEnergy,
    REFERENCE_DEPOSIT,
    referenceYieldPerMinute,
} from './reference'

const STARTER = encodeStats([213, 213, 213, 213, 213, 213])

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ResourceCategory[]
const RESOURCE_KEYS = CATEGORIES.flatMap((c) => getStatDefinitions(c).map((d) => d.key))

function sourcesOf(itemId: number, key: string) {
    return getModuleFigureSources(itemId)
        ?.find((s) => s.key === key)
        ?.stats.map((s) => s.label)
}

function categoryRecord(category: ResourceCategory, values: Record<string, number>) {
    return Object.fromEntries(getStatDefinitions(category).map((d) => [d.key, values[d.key]]))
}

function chainStats(itemId: number, values: Record<string, number>): number[] {
    const recipe = getRecipe(itemId)!
    const inputs = recipe.inputs.map((input) => getItem(input.itemId))
    if (inputs.every((item) => item.type === 'resource')) {
        const categories = [...new Set(inputs.map((item) => item.category!))]
        return computeComponentStats(
            itemId,
            categories.map((category) => ({
                category,
                stacks: [{quantity: 1, stats: categoryRecord(category, values)}],
            }))
        ).map((s) => s.value)
    }
    const stacks: Record<number, {quantity: number; stats: Record<string, number>}[]> = {}
    for (const [i, input] of recipe.inputs.entries()) {
        const item = inputs[i]
        let stats: Record<string, number>
        if (item.type === 'resource') {
            stats = categoryRecord(item.category!, values)
        } else {
            const keys = getItemStatKeys(input.itemId)
            const inner = chainStats(input.itemId, values)
            stats = Object.fromEntries(keys.map((key, k) => [key, inner[k]]))
        }
        stacks[input.itemId] = [{quantity: 1, stats}]
    }
    return computeEntityStats(itemId, stacks).map((s) => s.value)
}

function moduleItemIds(): number[] {
    return getItems()
        .map((item) => item.id)
        .filter((id) => getModuleFigures(id, 0n) && getRecipe(id))
}

describe('getModuleFigureSources', () => {
    test('one figure per activity', () => {
        expect(sourcesOf(ITEM_ENGINE_T1, 'drain')).toEqual(['Thermal'])
        expect(sourcesOf(ITEM_GENERATOR_T1, 'recharge')).toEqual([])
        expect(sourcesOf(ITEM_GENERATOR_T1, 'capacity')).toEqual(['Reflectivity'])
        expect(sourcesOf(ITEM_GATHERER_T1, 'yield')).toEqual(['Density'])
        expect(sourcesOf(ITEM_CRAFTER_T1, 'speed')).toEqual(['Thermal', 'Reflectivity'])
        expect(sourcesOf(ITEM_LOADER_T1, 'transfer')).toEqual(['Fineness'])
        expect(sourcesOf(ITEM_LOADER_T1, 'shuttles')).toEqual([])
    })

    test('each resource stat moves exactly the figures it is listed under', () => {
        const ids = moduleItemIds()
        expect(ids.length).toBeGreaterThan(0)
        const mid = Object.fromEntries(RESOURCE_KEYS.map((key) => [key, 500]))
        for (const id of ids) {
            const sources = getModuleFigureSources(id)!
            for (const key of RESOURCE_KEYS) {
                const at = (value: number) =>
                    getModuleFigures(id, encodeStats(chainStats(id, {...mid, [key]: value})))!.rows
                const low = at(STAT_LOW)
                const high = at(STAT_HIGH)
                for (const [i, source] of sources.entries()) {
                    expect({
                        item: id,
                        figure: source.key,
                        key,
                        moves: low[i].value !== high[i].value,
                    }).toEqual({
                        item: id,
                        figure: source.key,
                        key,
                        moves: source.stats.some((s) => s.key === key),
                    })
                }
            }
        }
    })

    test('non-modules have no sources', () => {
        expect(getModuleFigureSources(1)).toBeUndefined()
    })
})

describe('sweepModuleFigures', () => {
    const rowAt = (values: number[], key: string) =>
        getModuleFigures(ITEM_ENGINE_T1, encodeStats(values))!.rows.find((r) => r.key === key)!

    test('Engine Speed against its thermal', () => {
        const speed = sweepModuleFigures(ITEM_ENGINE_T1, STARTER)!.find((s) => s.key === 'speed')!
        expect(speed.current.text).toBe('38 ly/hr')
        expect(speed.sweeps.map((s) => [s.stat.label, s.low.text, s.high.text])).toEqual([
            ['Thermal', '35 ly/hr', '42 ly/hr'],
        ])
        expect(speed.sweeps.map((s) => s.stat.category)).toEqual(['gas'])
    })

    test('holds the other stats at the sample', () => {
        const drain = sweepModuleFigures(ITEM_ENGINE_T1, STARTER)!.find((s) => s.key === 'drain')!
        const thermal = drain.sweeps.find((s) => s.stat.key === 'thermal')!
        expect(thermal.high).toEqual(rowAt([606, 213], 'drain'))
        expect(drain.sweeps.map((s) => s.stat.key)).toEqual(['thermal'])
    })

    test('sweeps from explicit resource stats', () => {
        const speed = sweepModuleFigures(ITEM_ENGINE_T1, encodeStats([500, 500]), {
            volatility: 600,
            reactivity: 400,
            thermal: 500,
        })!.find((s) => s.key === 'speed')!
        const thermal = speed.sweeps.find((s) => s.stat.key === 'thermal')!
        expect(thermal.low).toEqual(rowAt([107, 213], 'speed'))
    })

    test('starts every sweep from resources that reproduce the packed stats within 2', () => {
        for (const id of moduleItemIds()) {
            for (const sample of [213, STAT_LOW, STAT_HIGH, 640]) {
                const resources = Object.fromEntries(RESOURCE_KEYS.map((key) => [key, sample]))
                const values = computeStatsFromResources(id, resources)
                const packed = encodeStats(values)
                const baseline = resourceBaseline(id, packed)
                const rebuilt = computeStatsFromResources(id, baseline)
                expect({id, count: rebuilt.length}).toEqual({id, count: values.length})
                for (const [slot, value] of values.entries()) {
                    expect({id, slot, near: Math.abs(rebuilt[slot] - value) <= 2}).toEqual({
                        id,
                        slot,
                        near: true,
                    })
                }
                const sweeps = sweepModuleFigures(id, packed)!
                expect(sweeps.map((s) => s.current)).toEqual(getModuleFigures(id, packed)!.rows)
                for (const figure of sweeps) {
                    for (const sweep of figure.sweeps) {
                        const at = (value: number) =>
                            getModuleFigures(
                                id,
                                encodeStats(
                                    computeStatsFromResources(id, {
                                        ...baseline,
                                        [sweep.stat.key]: value,
                                    })
                                )
                            )!.rows.find((r) => r.key === figure.key)
                        expect(sweep.low).toEqual(at(STAT_LOW)!)
                        expect(sweep.high).toEqual(at(STAT_HIGH)!)
                    }
                }
            }
        }
    })
})

describe('gatherFromFigures', () => {
    test('matches the raw-stat path', () => {
        const raw = {
            yield: UInt16.from(1240),
            drain: UInt32.from(1_967_500),
            depth: UInt16.from(65535),
        }
        const deposit = {stratum: 4200, richness: 730, itemMass: 46, quantity: 120}
        const duration = calc_gather_duration(
            raw,
            deposit.itemMass,
            deposit.quantity,
            deposit.stratum,
            deposit.richness
        ).toNumber()
        const estimate = gatherFromFigures(
            {
                yieldPerMinute: referenceYieldPerMinute(1240),
                drainPerMinute: gatherDrainPerMinute(1_967_500),
            },
            deposit
        )
        expect(estimate.durationSeconds).toBe(duration)
        expect(estimate.energy).toBe(milliToEnergy(calc_gather_energy(raw, duration).toNumber()))
        expect(estimate.tonnesPerMinute).toBeCloseTo(
            (referenceYieldPerMinute(1240) *
                (730 / REFERENCE_DEPOSIT.richness) *
                (1 + REFERENCE_DEPOSIT.stratum / 5000)) /
                (1 + 4200 / 5000),
            9
        )
    })

    test('a zero-richness deposit gathers nothing', () => {
        expect(
            gatherFromFigures(
                {yieldPerMinute: 5, drainPerMinute: 10},
                {stratum: 0, richness: 0, itemMass: 46, quantity: 10}
            )
        ).toEqual({durationSeconds: 0, tonnesPerMinute: 0, energy: 0})
    })
})
