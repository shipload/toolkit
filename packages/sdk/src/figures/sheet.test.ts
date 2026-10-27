import {describe, expect, test} from 'bun:test'
import {decodeCraftedItemStats, encodeStats} from '../derivation/crafting'
import {
    ITEM_BATTERY_T1,
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_PORTER_T1A_PACKED,
    ITEM_PROSPECTOR_T1A_PACKED,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_STORAGE_T1,
    ITEM_TUG_T1A_PACKED,
    ITEM_WARP_T1,
    ITEM_WORKSHOP_T1_PACKED,
} from '../data/item-ids'
import {getItem} from '../data/catalog'
import {computeEntityCapabilities} from '../derivation/capabilities'
import {getEntityLayout} from '../data/recipes-runtime'
import {makeEntity} from '../entities/makers'
import {
    computeEntitySheet,
    entitySheetInput,
    previewModuleFit,
    type EntitySheetInput,
} from './sheet'
import type {EntitySheet, SheetRow} from './types'

const STARTER = encodeStats([213, 213, 213, 213, 213, 213])

function section(sheet: EntitySheet, key: string) {
    const found = sheet.sections.find((s) => s.key === key)
    if (!found) throw new Error(`missing section ${key}`)
    return found
}

function rowOf(sheet: EntitySheet, sectionKey: string, rowKey: string): SheetRow {
    const found = section(sheet, sectionKey).rows.find((r) => r.key === rowKey)
    if (!found) throw new Error(`missing row ${sectionKey}.${rowKey}`)
    return found
}

function texts(sheet: EntitySheet, key: string) {
    return section(sheet, key).rows.map((r) => [r.label, r.text])
}

function prospector(cargoMass = 0): EntitySheetInput {
    return {
        itemId: ITEM_PROSPECTOR_T1A_PACKED,
        hullStats: decodeCraftedItemStats(ITEM_PROSPECTOR_T1A_PACKED, STARTER),
        modules: [
            {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: STARTER},
            {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: STARTER},
            {slotIndex: 2, itemId: ITEM_GATHERER_T1, stats: STARTER},
        ],
        cargoMass,
    }
}

describe('computeEntitySheet on a starter Prospector', () => {
    const sheet = computeEntitySheet(prospector())

    test('shows only the sections its modules provide, each naming its headline', () => {
        expect(sheet.sections.map((s) => [s.key, s.label, s.headline])).toEqual([
            ['movement', 'Movement', 'speed'],
            ['mass', 'Mass', 'total'],
            ['energy', 'Energy', 'capacity'],
            ['gathering', 'Gathering', 'yield'],
            ['storage', 'Storage', 'capacity'],
        ])
        for (const s of sheet.sections) {
            expect(s.rows.filter((r) => r.headline).map((r) => r.key)).toEqual([s.headline])
        }
    })

    test('Energy rows at full charge with per-module lines at actual slot output', () => {
        expect(texts(sheet, 'energy')).toEqual([
            ['Capacity', '1,196 energy'],
            ['Recharge', '167 energy/min'],
            ['Range', '5.5 ly'],
            ['Travel drain', '218 energy/ly'],
        ])
        const capacity = rowOf(sheet, 'energy', 'capacity')
        expect(capacity.breakdown?.map((l) => [l.label, l.slotIndex, l.outputPct, l.text])).toEqual(
            [['Power Core', 0, 85, '+1,196 energy']]
        )
        expect(
            rowOf(sheet, 'energy', 'travelDrain').breakdown?.map((l) => [l.label, l.text])
        ).toEqual([['Engines', '218 energy/ly']])
    })

    test('Gathering reads per worker at the reference deposit, with minutes per charge', () => {
        expect(texts(sheet, 'gathering')).toEqual([
            ['Yield', '28.2 t/min'],
            ['Depth', '1,565 km'],
            ['Drain', '11.8 energy/min'],
            ['Per charge', '101 min'],
        ])
    })

    test('Mass total breaks down into hull, modules and cargo', () => {
        const total = rowOf(sheet, 'mass', 'total')
        const caps = computeEntityCapabilities(
            decodeCraftedItemStats(ITEM_PROSPECTOR_T1A_PACKED, STARTER),
            ITEM_PROSPECTOR_T1A_PACKED,
            prospector().modules,
            getEntityLayout(ITEM_PROSPECTOR_T1A_PACKED)?.slots ?? []
        )
        expect(total.value).toBe(caps.hullmass / 10)
        expect(total.breakdown?.map((l) => [l.label, l.text])).toEqual([
            ['Hull', '3,717 t'],
            ['Modules', '2,880 t'],
            ['Cargo', '0 t'],
        ])
    })

    test('Speed reads at current mass, with empty-hold and full-hold speed in the breakdown', () => {
        const empty = rowOf(sheet, 'movement', 'speed')
        const loaded = rowOf(computeEntitySheet(prospector(20_000)), 'movement', 'speed')
        expect(loaded.value).toBeLessThan(empty.value)
        expect(empty.breakdown?.map((l) => l.label)).toEqual(['Empty hold', 'Full hold', 'Engine'])
        expect(empty.breakdown?.[0].value).toBe(empty.value)
        expect(loaded.breakdown?.[0].value).toBe(empty.value)
        expect(loaded.breakdown?.[1].value).toBe(empty.breakdown?.[1].value)
        expect(empty.breakdown?.[1].value).toBeLessThan(empty.value)
    })
})

describe('computeEntitySheet on structures', () => {
    test('a Workshop with five Fabricators at 75% has Crafting and Storage but no Energy', () => {
        const sheet = computeEntitySheet({
            itemId: ITEM_WORKSHOP_T1_PACKED,
            modules: [0, 1, 2, 3, 4].map((slotIndex) => ({
                slotIndex,
                itemId: ITEM_CRAFTER_T1,
                stats: STARTER,
            })),
            anchor: {capacity: 2_200_000, hullmass: 1000 + 5 * getItem(ITEM_CRAFTER_T1).mass},
        })
        expect(sheet.sections.map((s) => s.key)).toEqual(['crafting', 'storage'])
        expect(texts(sheet, 'crafting')).toEqual([
            ['Speed', '5 × 12.1 t/min'],
            ['Drain', '5 × 157 energy/k t'],
        ])
        expect(rowOf(sheet, 'crafting', 'speed').workers).toEqual([
            {count: 5, value: (202 * 60) / 1000, text: '12.1'},
        ])
        expect(texts(sheet, 'storage')).toEqual([['Capacity', '220,000 t']])
    })

    test('unequal workers list each figure in slot order', () => {
        const sheet = computeEntitySheet({
            itemId: ITEM_WORKSHOP_T1_PACKED,
            modules: [
                {slotIndex: 0, itemId: ITEM_CRAFTER_T1, stats: encodeStats([0, 0])},
                {slotIndex: 1, itemId: ITEM_CRAFTER_T1, stats: STARTER},
                {slotIndex: 2, itemId: ITEM_CRAFTER_T1, stats: STARTER},
            ],
        })
        expect(rowOf(sheet, 'crafting', 'speed').text).toBe('4.5 + 2 × 12.1 t/min')
        expect(rowOf(sheet, 'crafting', 'drain').text).toBe('200 + 2 × 157 energy/k t')
    })

    test('a container shows Storage alone', () => {
        const sheet = computeEntitySheet({
            itemId: ITEM_CONTAINER_T1_PACKED,
            hullStats: {},
            modules: [],
        })
        expect(sheet.sections.map((s) => s.key)).toEqual(['storage'])
        expect(texts(sheet, 'storage')).toEqual([['Capacity', '14,100 t']])
    })
})

describe('computeEntitySheet sections for movement modules', () => {
    test('Tug: Towing with per-beam lines and the beam drain in Travel drain', () => {
        const sheet = computeEntitySheet({
            itemId: ITEM_TUG_T1A_PACKED,
            hullStats: {},
            modules: [
                {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: STARTER},
                {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: STARTER},
                {slotIndex: 2, itemId: ITEM_HAULER_T1, stats: STARTER},
            ],
        })
        expect(texts(sheet, 'towing')).toEqual([
            ['Tows', '1 container, T1 and below'],
            ['Handling', '+10% travel time per towed container, plus its weight'],
        ])
        expect(section(sheet, 'towing').headline).toBe('tows')
        expect(
            rowOf(sheet, 'energy', 'travelDrain').breakdown?.map((l) => [l.label, l.text])
        ).toEqual([
            ['Engines', '218 energy/ly'],
            ['Tractor Beam', '12.3 energy/ly'],
        ])
    })

    test('base Ship: Warp names Jump distance at slot output, Shuttling counts workers', () => {
        const sheet = computeEntitySheet({
            itemId: ITEM_SHIP_T1_PACKED,
            hullStats: {},
            modules: [
                {slotIndex: 0, itemId: ITEM_WARP_T1, stats: STARTER},
                {slotIndex: 1, itemId: ITEM_LOADER_T1, stats: STARTER},
                {slotIndex: 2, itemId: ITEM_LOADER_T1, stats: STARTER},
            ],
        })
        const jump = rowOf(sheet, 'warp', 'jump')
        expect(jump.text).toBe('591 ly')
        expect(jump.note).toBe('Spends a full charge; the hold must be empty.')
        expect(jump.breakdown?.map((l) => [l.label, l.outputPct, l.text])).toEqual([
            ['Warp Drive', 80, '591 ly'],
        ])
        expect(section(sheet, 'shuttling').headline).toBe('transfer')
        expect(texts(sheet, 'shuttling')).toEqual([
            ['Transfer', '2 × 326 t/min'],
            ['Shuttles', '2'],
        ])
    })
})

describe('computeEntitySheet at the Range floor', () => {
    const core = {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: encodeStats([213, 213])}
    const engine = {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: encodeStats([213, 213])}
    const hold = {slotIndex: 2, itemId: ITEM_STORAGE_T1, stats: encodeStats([213, 213])}

    test('a starter Roustabout with a Cargo Hold shows the floor line and a Range note', () => {
        const sheet = computeEntitySheet({
            itemId: ITEM_ROUSTABOUT_T1A_PACKED,
            hullStats: {},
            modules: [core, engine, hold],
        })
        const drain = rowOf(sheet, 'energy', 'travelDrain')
        expect(drain.text).toBe('225 energy/ly')
        expect(drain.breakdown?.map((l) => [l.label, l.text])).toEqual([
            ['Engines', '225 energy/ly'],
            ['Cargo Hold', '9.3 energy/ly'],
            ['Range floor', '-8.7 energy/ly'],
        ])
        const sum = drain.breakdown!.reduce((total, l) => total + l.value, 0)
        expect(sum).toBeCloseTo(drain.value, 9)
        const range = rowOf(sheet, 'energy', 'range')
        expect(range.text).toBe('5.0 ly')
        expect(range.note).toBe(
            'Every ship reaches at least 5.0 ly on a full charge. This ship needs 9 energy/ly less drain to fly farther.'
        )
    })

    test('a starter Roustabout without a hold sits above the floor with no note', () => {
        const sheet = computeEntitySheet({
            itemId: ITEM_ROUSTABOUT_T1A_PACKED,
            hullStats: {},
            modules: [core, engine],
        })
        expect(rowOf(sheet, 'energy', 'travelDrain').breakdown?.map((l) => l.label)).toEqual([
            'Engines',
        ])
        expect(rowOf(sheet, 'energy', 'range').note).toBeUndefined()
    })
})

describe('previewModuleFit', () => {
    const porter: EntitySheetInput = {
        itemId: ITEM_PORTER_T1A_PACKED,
        hullStats: {},
        modules: [
            {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: STARTER},
            {slotIndex: 1, itemId: ITEM_ENGINE_T1, stats: STARTER},
            {slotIndex: 2, itemId: ITEM_STORAGE_T1, stats: STARTER},
        ],
    }

    test('Battery Bank into the Cargo Hold slot: headlines plus every changed row', () => {
        const {diff} = previewModuleFit(porter, 2, {itemId: ITEM_BATTERY_T1, stats: STARTER})
        const summary = diff.map((s) => [
            s.key,
            s.rows.map((r) => [r.label, r.before?.text, r.after?.text, r.headline, r.changed]),
        ])
        expect(summary).toEqual([
            ['movement', [['Speed', '42 ly/hr', '42 ly/hr', true, false]]],
            ['mass', [['Total', '7,040 t', '7,040 t', true, false]]],
            [
                'energy',
                [
                    ['Capacity', '1,196 energy', '5,295 energy', true, true],
                    ['Range', '5.3 ly', '24.3 ly', false, true],
                    ['Travel drain', '227 energy/ly', '218 energy/ly', false, true],
                ],
            ],
            ['storage', [['Capacity', '25,661 t', '5,000 t', true, true]]],
        ])
    })

    test('keeps the live hull anchors when hull stats are unknown', () => {
        const live = {
            ...porter,
            hullStats: undefined,
            anchor: {capacity: 300_000, hullmass: 50_000},
        }
        const {before, after} = previewModuleFit(live, 2, null)
        expect(rowOf(before, 'storage', 'capacity').text).toBe('30,000 t')
        expect(rowOf(after, 'storage', 'capacity').text).toBe(
            `${(30_000 - 20_660.6).toLocaleString('en-US', {maximumFractionDigits: 0})} t`
        )
        expect(rowOf(after, 'mass', 'total').value).toBe(5000 - getItem(ITEM_STORAGE_T1).mass / 10)
    })
})

describe('entitySheetInput', () => {
    test('builds the sheet input from a live entity row', () => {
        const entity = makeEntity(ITEM_PROSPECTOR_T1A_PACKED, {
            id: 1,
            owner: 'alice',
            name: 'p',
            coordinates: {x: 0, y: 0},
            modules: [
                {itemId: ITEM_GENERATOR_T1, stats: STARTER},
                {itemId: ITEM_ENGINE_T1, stats: STARTER},
                {itemId: ITEM_GATHERER_T1, stats: STARTER},
            ],
            cargomass: 500,
        })
        const input = entitySheetInput(entity)
        expect(input.itemId).toBe(ITEM_PROSPECTOR_T1A_PACKED)
        expect(input.modules.map((m) => m.slotIndex)).toEqual([0, 1, 2])
        expect(input.anchor).toEqual({
            capacity: Number(entity.capacity),
            hullmass: Number(entity.hullmass),
        })
        expect(input.cargoMass).toBe(500)
        const sheet = computeEntitySheet(input)
        expect(rowOf(sheet, 'mass', 'total').value).toBe((Number(entity.hullmass) + 500) / 10)
    })
})
