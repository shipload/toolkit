import {describe, expect, test} from 'bun:test'
import {computeEntityCapabilities} from '../src/derivation/capabilities'
import {encodeStats} from '../src/derivation/crafting'
import type {InstalledModule} from '../src/entities/slot-multiplier'
import {ITEM_BATTERY_T1, ITEM_GENERATOR_T1, ITEM_SHIP_T1_PACKED} from '../src/data/item-ids'
import type {EntitySlot} from '../src/data/recipes-runtime'

const SHIP_LAYOUT: EntitySlot[] = [
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
    {type: 'any', outputPct: 100},
]

const SAMPLE_STATS_RECORD = {strength: 100, density: 100, hardness: 100, saturation: 100}

function batteryStats(vol: number, thm: number, pla: number, ins: number): bigint {
    return encodeStats([vol, thm, pla, ins])
}

function generatorStats(resonance: number, reflectivity: number): bigint {
    return encodeStats([resonance, reflectivity])
}

describe('Battery module derivation', () => {
    test('single Battery + Generator: bonus applied per C++ formula (mid stats)', () => {
        const modules: InstalledModule[] = [
            {
                slotIndex: 0,
                itemId: ITEM_GENERATOR_T1,
                stats: generatorStats(500, 500),
            },
            {
                slotIndex: 1,
                itemId: ITEM_BATTERY_T1,
                stats: batteryStats(500, 500, 500, 500),
            },
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.generator).toBeDefined()
        expect(result.generator?.capacity).toBe(444)
    })

    test('two Batteries + Generator: no compounding, each bonus vs original gen_cap_base', () => {
        const modules: InstalledModule[] = [
            {
                slotIndex: 0,
                itemId: ITEM_GENERATOR_T1,
                stats: generatorStats(500, 500),
            },
            {
                slotIndex: 1,
                itemId: ITEM_BATTERY_T1,
                stats: batteryStats(500, 500, 500, 500),
            },
            {
                slotIndex: 2,
                itemId: ITEM_BATTERY_T1,
                stats: batteryStats(500, 500, 500, 500),
            },
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.generator).toBeDefined()
        expect(result.generator?.capacity).toBe(509)
    })

    test('Battery without Generator: no generator field, no bonus applied', () => {
        const modules: InstalledModule[] = [
            {
                slotIndex: 0,
                itemId: ITEM_BATTERY_T1,
                stats: batteryStats(500, 500, 500, 500),
            },
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.generator).toBeUndefined()
    })

    test('low stats fixture: vol/thm/pla/ins=100, gen res/ref=100', () => {
        const modules: InstalledModule[] = [
            {
                slotIndex: 0,
                itemId: ITEM_GENERATOR_T1,
                stats: generatorStats(100, 100),
            },
            {
                slotIndex: 1,
                itemId: ITEM_BATTERY_T1,
                stats: batteryStats(100, 100, 100, 100),
            },
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.generator?.capacity).toBe(350)
    })

    test('max stats fixture: vol/thm/pla/ins=999, gen res/ref=999', () => {
        const modules: InstalledModule[] = [
            {
                slotIndex: 0,
                itemId: ITEM_GENERATOR_T1,
                stats: generatorStats(999, 999),
            },
            {
                slotIndex: 1,
                itemId: ITEM_BATTERY_T1,
                stats: batteryStats(999, 999, 999, 999),
            },
        ]
        const result = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            modules,
            SHIP_LAYOUT
        )
        expect(result.generator?.capacity).toBe(573)
    })

    test('Battery + Generator: recharge field unchanged (only capacity gets bonus)', () => {
        const noBattery = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: generatorStats(500, 500)}],
            SHIP_LAYOUT
        )
        const withBattery = computeEntityCapabilities(
            SAMPLE_STATS_RECORD,
            ITEM_SHIP_T1_PACKED,
            [
                {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: generatorStats(500, 500)},
                {slotIndex: 1, itemId: ITEM_BATTERY_T1, stats: batteryStats(500, 500, 500, 500)},
            ],
            SHIP_LAYOUT
        )
        expect(withBattery.generator?.recharge).toBe(noBattery.generator?.recharge)
        expect(withBattery.generator!.capacity).toBeGreaterThan(noBattery.generator!.capacity)
    })
})
