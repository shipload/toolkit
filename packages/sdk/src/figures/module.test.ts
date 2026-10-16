import {describe, expect, test} from 'bun:test'
import {encodeStats} from '../derivation/crafting'
import {
    ITEM_BATTERY_T1,
    ITEM_BUILDER_T1,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LAUNCHER_T1,
    ITEM_LOADER_T1,
    ITEM_STORAGE_T1,
    ITEM_WARP_T1,
} from '../data/item-ids'
import {getModuleFigures} from './module'

const STARTER = encodeStats([213, 213, 213, 213, 213, 213])

function rows(itemId: number, stats: bigint = STARTER) {
    const figures = getModuleFigures(itemId, stats)
    if (!figures) throw new Error(`no figures for ${itemId}`)
    return figures.rows.map((r) => [r.label, r.text])
}

describe('getModuleFigures starter T1 rows', () => {
    test('Engine', () => {
        expect(getModuleFigures(ITEM_ENGINE_T1, STARTER)?.sectionLabel).toBe('Movement')
        expect(rows(ITEM_ENGINE_T1)).toEqual([
            ['Speed', '38 ly/hr'],
            ['Drain', '201 energy/ly'],
        ])
    })

    test('Power Core', () => {
        expect(getModuleFigures(ITEM_GENERATOR_T1, STARTER)?.sectionLabel).toBe('Energy')
        expect(rows(ITEM_GENERATOR_T1)).toEqual([
            ['Capacity', '+1,407 energy'],
            ['Recharge', '+197 energy/min'],
        ])
    })

    test('Battery Bank', () => {
        expect(rows(ITEM_BATTERY_T1)).toEqual([['Capacity', '+4,099 energy']])
    })

    test('Cargo Hold', () => {
        expect(getModuleFigures(ITEM_STORAGE_T1, STARTER)?.sectionLabel).toBe('Storage')
        expect(rows(ITEM_STORAGE_T1)).toEqual([
            ['Capacity', '+20,661 t'],
            ['Drain', '9.3 energy/ly'],
        ])
    })

    test('Tractor Beam', () => {
        expect(getModuleFigures(ITEM_HAULER_T1, STARTER)?.sectionLabel).toBe('Towing')
        expect(rows(ITEM_HAULER_T1)).toEqual([
            ['Tows', '1 container, T1 and below'],
            ['Handling', '+10% travel time per towed container, plus its weight'],
            ['Drain', '12.3 energy/ly'],
        ])
    })

    test('Warp Drive', () => {
        const figures = getModuleFigures(ITEM_WARP_T1, STARTER)
        expect(figures?.sectionLabel).toBe('Warp')
        expect(figures?.rows.map((r) => [r.label, r.text, r.note])).toEqual([
            ['Jump distance', '739 ly', 'Spends a full charge; the hold must be empty.'],
        ])
    })

    test('Limpet Bay', () => {
        expect(getModuleFigures(ITEM_GATHERER_T1, STARTER)?.sectionLabel).toBe('Gathering')
        expect(rows(ITEM_GATHERER_T1)).toEqual([
            ['Yield', '28.2 t/min'],
            ['Depth', '1,565 km'],
            ['Drain', '11.8 energy/min'],
        ])
    })

    test('Shuttle Bay', () => {
        const figures = getModuleFigures(ITEM_LOADER_T1, STARTER)
        expect(figures?.sectionLabel).toBe('Shuttling')
        expect(figures?.rows.map((r) => [r.label, r.text])).toEqual([
            ['Transfer', '364 t/min'],
            ['Payload', '58.7%'],
            ['Shuttles', '1'],
        ])
    })

    test('Fabricator', () => {
        expect(getModuleFigures(ITEM_CRAFTER_T1, STARTER)?.sectionLabel).toBe('Crafting')
        expect(rows(ITEM_CRAFTER_T1)).toEqual([
            ['Speed', '16.2 t/min'],
            ['Drain', '157 energy/k t'],
        ])
    })

    test('Assembly Arm reads the same as the Fabricator', () => {
        expect(getModuleFigures(ITEM_BUILDER_T1, STARTER)?.sectionLabel).toBe('Building')
        expect(rows(ITEM_BUILDER_T1)).toEqual([
            ['Speed', '16.2 t/min'],
            ['Drain', '157 energy/k t'],
        ])
    })

    test('Drive Coil', () => {
        expect(getModuleFigures(ITEM_LAUNCHER_T1, STARTER)?.sectionLabel).toBe('Launch')
        expect(rows(ITEM_LAUNCHER_T1, encodeStats([500, 300, 20]))).toEqual([
            ['Charge', '30.0 t/min'],
            ['Launch speed', '300 ly/s'],
            ['Drain', '20 energy/k t per ly'],
        ])
    })
})

describe('getModuleFigures numeric values', () => {
    test('Engine cruises 0.63 ly/min on the 10,000 t reference mass', () => {
        const speed = getModuleFigures(ITEM_ENGINE_T1, STARTER)?.rows[0].value ?? 0
        expect(speed / 60).toBeCloseTo(0.634, 3)
    })

    test('Engine drain is the sole-engine drain at 100% output', () => {
        expect(getModuleFigures(ITEM_ENGINE_T1, STARTER)?.rows[1].value).toBeCloseTo(200.8, 1)
    })

    test('Shuttle Bay moves 1,000 t between two ships in 165 s', () => {
        expect(getModuleFigures(ITEM_LOADER_T1, STARTER)?.rows[0].value).toBeCloseTo(
            60_000 / 165,
            6
        )
    })

    test('accepts packed stats as a chain string', () => {
        expect(getModuleFigures(ITEM_GENERATOR_T1, STARTER.toString())).toEqual(
            getModuleFigures(ITEM_GENERATOR_T1, STARTER)
        )
    })

    test('non-module items have no figures', () => {
        expect(getModuleFigures(1, 0n)).toBeUndefined()
    })
})
