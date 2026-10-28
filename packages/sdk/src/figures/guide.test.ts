import {describe, expect, test} from 'bun:test'
import {UInt16, UInt32} from '@wharfkit/antelope'
import {calc_gather_duration, calc_gather_energy} from '../capabilities/gathering'
import {getItems} from '../data/catalog'
import {
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T1,
} from '../data/item-ids'
import {getRecipe} from '../data/recipes-runtime'
import {
    computeStatsFromResources,
    decodeStats,
    encodeStats,
    traceResourceStatKeys,
} from '../derivation/crafting'
import {getStatDefinitions} from '../derivation/stats'
import {CATEGORY_LABELS, type ResourceCategory} from '../types'
import {
    gatherFromFigures,
    getModuleFigureSources,
    moduleFigureRanges,
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

function moduleItemIds(): number[] {
    return getItems()
        .map((item) => item.id)
        .filter((id) => getModuleFigures(id, 0n) && getRecipe(id))
}

describe('getModuleFigureSources', () => {
    test('one figure per activity', () => {
        expect(sourcesOf(ITEM_ENGINE_T1, 'drain')).toEqual(['Volatility'])
        expect(sourcesOf(ITEM_GENERATOR_T1, 'recharge')).toEqual(['Conductivity'])
        expect(sourcesOf(ITEM_GENERATOR_T1, 'capacity')).toEqual(['Conductivity'])
        expect(sourcesOf(ITEM_GATHERER_T1, 'yield')).toEqual(['Density'])
        expect(sourcesOf(ITEM_CRAFTER_T1, 'speed')).toEqual([
            'Reactivity',
            'Thermal',
            'Reflectivity',
        ])
        expect(sourcesOf(ITEM_LOADER_T1, 'transfer')).toEqual(['Cohesion'])
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
                    getModuleFigures(
                        id,
                        encodeStats(computeStatsFromResources(id, {...mid, [key]: value}))
                    )!.rows
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

describe('moduleFigureRanges', () => {
    test('an Engine range spans only what its carried stat can reach', () => {
        const ranges = moduleFigureRanges(ITEM_ENGINE_T1)
        const sweeps = sweepModuleFigures(ITEM_ENGINE_T1, STARTER)!
        const reach = (key: string) => {
            const sweep = sweeps.find((s) => s.key === key)!.sweeps[0]
            return [sweep.low.text, sweep.high.text].sort()
        }
        const range = (key: string) => {
            const r = ranges.find((x) => x.key === key)!
            return [r.min.text, r.max.text].sort()
        }
        expect(range('speed')).toEqual(reach('speed'))
        expect(range('drain')).toEqual(reach('drain'))
    })

    test('a figure no stat moves has a single value', () => {
        for (const id of moduleItemIds()) {
            const sources = getModuleFigureSources(id) ?? []
            for (const r of moduleFigureRanges(id)) {
                const moved = sources.find((s) => s.key === r.key)?.stats.length ?? 0
                if (moved > 0) continue
                expect({id, key: r.key, text: r.max.text}).toEqual({
                    id,
                    key: r.key,
                    text: r.min.text,
                })
            }
        }
    })
})

describe('sweepModuleFigures', () => {
    const rowAt = (values: number[], key: string) =>
        getModuleFigures(ITEM_ENGINE_T1, encodeStats(values))!.rows.find((r) => r.key === key)!

    test('Engine Speed against its volatility', () => {
        const speed = sweepModuleFigures(ITEM_ENGINE_T1, STARTER)!.find((s) => s.key === 'speed')!
        expect(speed.current.text).toBe('38 ly/hr')
        expect(speed.sweeps.map((s) => [s.stat.label, s.low.text, s.high.text])).toEqual([
            ['Volatility', '35 ly/hr', '42 ly/hr'],
        ])
        expect(speed.sweeps.map((s) => s.stat.category)).toEqual(['gas'])
    })

    test('holds the other stats at the sample', () => {
        const drain = sweepModuleFigures(ITEM_ENGINE_T1, STARTER)!.find((s) => s.key === 'drain')!
        const volatility = drain.sweeps.find((s) => s.stat.key === 'volatility')!
        expect(volatility.high).toEqual(rowAt([606, 999], 'drain'))
        expect(drain.sweeps.map((s) => s.stat.key)).toEqual(['volatility'])
    })

    test('sweeps from explicit resource stats', () => {
        const speed = sweepModuleFigures(ITEM_ENGINE_T1, encodeStats([500, 500]), {
            volatility: 600,
            reactivity: 400,
            thermal: 500,
        })!.find((s) => s.key === 'speed')!
        const volatility = speed.sweeps.find((s) => s.stat.key === 'volatility')!
        expect(volatility.low).toEqual(rowAt([107, 1], 'speed'))
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
