import {describe, expect, test} from 'bun:test'
import {
    computeBatteryCapabilities,
    computeEntityCapabilities,
    computeStorageCapabilities,
} from '../src/derivation/capabilities'
import {computeEffectiveModuleStat} from '../src/derivation/stat-scaling'
import {encodeStats} from '../src/derivation/crafting'
import type {InstalledModule} from '../src/entities/slot-multiplier'
import {
    ITEM_BATTERY_T2,
    ITEM_GENERATOR_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_STORAGE_T2,
} from '../src/data/item-ids'
import type {EntitySlot} from '../src/data/recipes-runtime'

const SHIP_LAYOUT: EntitySlot[] = [
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
]

const SAMPLE_STATS_RECORD = {strength: 100, density: 100, hardness: 100, saturation: 100}

function generatorCapacity(resonance: number): number {
    return 1_300_000 + computeEffectiveModuleStat(resonance) * 500
}

describe('T2 Battery Bank & Cargo Hold tier scaling', () => {
    test('computeBatteryCapabilities applies +10% at tier 2', () => {
        const stats = {volatility: 500, thermal: 500, plasticity: 500, insulation: 500}
        expect(computeBatteryCapabilities(stats, 1).capacity).toBe(6_253_753)
        expect(computeBatteryCapabilities(stats, 2).capacity).toBe(6_879_128)
    })

    test('computeStorageCapabilities applies +10% capacity and 90% drain at tier 2', () => {
        const stats = {strength: 500, density: 500, hardness: 500, cohesion: 500}
        expect(computeStorageCapabilities(stats, 1)).toEqual({
            capacity: 35_025_025,
            drain: 6562,
        })
        expect(computeStorageCapabilities(stats, 2)).toEqual({
            capacity: 38_527_527,
            drain: 5906,
        })
    })

    test('entity derivation picks up tier 2 from the catalog for Battery Bank T2', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: encodeStats([500, 500])},
            {slotIndex: 1, itemId: ITEM_BATTERY_T2, stats: encodeStats([500, 500, 500, 500])},
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.generator?.capacity).toBe(generatorCapacity(500) + 6_879_128)
    })

    test('entity derivation picks up tier 2 from the catalog for Cargo Hold T2', () => {
        const bare = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [],
            SHIP_LAYOUT
        )
        const withBay = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_STORAGE_T2, stats: encodeStats([500, 500, 500, 500])}],
            SHIP_LAYOUT
        )
        expect(withBay.capacity - bare.capacity).toBe(38_527_527)
    })
})
