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
import {decodeStats, encodeStats, getItemStatKeys} from '../derivation/crafting'
import {
    gatherFromFigures,
    getModuleFigureSources,
    STAT_HIGH,
    STAT_LOW,
    sweepModuleFigures,
} from './guide'
import {getModuleFigures} from './module'
import {gatherDrainPerMinute, milliToEnergy, referenceYieldPerMinute} from './reference'

const STARTER = encodeStats([213, 213, 213, 213, 213, 213])

function sourcesOf(itemId: number, key: string) {
    return getModuleFigureSources(itemId)
        ?.find((s) => s.key === key)
        ?.stats.map((s) => s.label)
}

describe('getModuleFigureSources', () => {
    test('one figure per activity', () => {
        expect(sourcesOf(ITEM_ENGINE_T1, 'drain')).toEqual(['Volatility', 'Thermal'])
        expect(sourcesOf(ITEM_GENERATOR_T1, 'recharge')).toEqual(['Reflectivity'])
        expect(sourcesOf(ITEM_GATHERER_T1, 'yield')).toEqual(['Strength'])
        expect(sourcesOf(ITEM_CRAFTER_T1, 'speed')).toEqual(['Fineness'])
        expect(sourcesOf(ITEM_LOADER_T1, 'transfer')).toEqual(['Insulation', 'Plasticity'])
        expect(sourcesOf(ITEM_LOADER_T1, 'shuttles')).toEqual([])
    })

    test('each stat moves exactly the figures it is listed under', () => {
        for (const item of getItems()) {
            const sources = getModuleFigureSources(item.id)
            if (!sources) continue
            const count = getItemStatKeys(item.id).length
            const mid = Array(count).fill(500)
            for (let index = 0; index < count; index++) {
                const at = (value: number) => {
                    const values = [...mid]
                    values[index] = value
                    return getModuleFigures(item.id, encodeStats(values))!.rows
                }
                const low = at(STAT_LOW)
                const high = at(STAT_HIGH)
                for (const [i, source] of sources.entries()) {
                    const listed = source.stats.some((s) => s.index === index)
                    expect({
                        item: item.id,
                        figure: source.key,
                        index,
                        moves: low[i].value !== high[i].value,
                    }).toEqual({
                        item: item.id,
                        figure: source.key,
                        index,
                        moves: listed,
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
    test('Engine Speed against its volatility', () => {
        const speed = sweepModuleFigures(ITEM_ENGINE_T1, STARTER)!.find((s) => s.key === 'speed')!
        expect(speed.current.text).toBe('38 ly/hr')
        expect(speed.sweeps.map((s) => [s.stat.label, s.low.text, s.high.text])).toEqual([
            ['Volatility', '32 ly/hr', '45 ly/hr'],
        ])
    })

    test('holds the other stats at the sample', () => {
        const drain = sweepModuleFigures(ITEM_ENGINE_T1, STARTER)!.find((s) => s.key === 'drain')!
        const thermal = drain.sweeps.find((s) => s.stat.key === 'thermal')!
        const held = decodeStats(STARTER, 2)
        held[thermal.stat.index] = STAT_HIGH
        expect(thermal.high).toEqual(
            getModuleFigures(ITEM_ENGINE_T1, encodeStats(held))!.rows.find(
                (r) => r.key === 'drain'
            )!
        )
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
            (referenceYieldPerMinute(1240) * (730 / 500)) / (1 + 4200 / 5000),
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
