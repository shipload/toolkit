import {describe, expect, test} from 'bun:test'
import {
    buildEntityLoadout,
    buildImmutableData,
    computeNftImageUrl,
    decodeStat,
    encodeStats,
    getWrappedSchema,
    type ImmutableEntry,
} from '../../src'
import {
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T2,
    ITEM_ORE_T1,
    ITEM_PLATE,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T2_PACKED,
    ITEM_WORKSHOP_T1_PACKED,
} from '../../src/data/item-ids'

function layout(entries: ImmutableEntry[]): [string, string][] {
    return entries.map((e) => [e.first, e.second[0]])
}

function value(entries: ImmutableEntry[], key: string): unknown {
    return entries.find((e) => e.first === key)?.second[1]
}

const COMMON_TAIL: [string, string][] = [
    ['stats', 'uint64'],
    ['origin_x', 'int32'],
    ['origin_y', 'int32'],
    ['img', 'string'],
    ['deposit_amount', 'uint64'],
    ['deposit_token', 'uint64'],
    ['deposit_symbol', 'uint64'],
]

describe('buildImmutableData', () => {
    test('resource (ore) writes its three stats between quantity and stats', () => {
        const stats = encodeStats([200, 150, 99])
        const entries = buildImmutableData(ITEM_ORE_T1, 10, stats, -5, 7)

        expect(layout(entries)).toEqual([
            ['quantity', 'uint32'],
            ['strength', 'uint16'],
            ['tolerance', 'uint16'],
            ['density', 'uint16'],
            ...COMMON_TAIL,
        ])
        expect(value(entries, 'quantity')).toBe(10)
        expect(value(entries, 'stats')).toBe(String(stats))
        expect(value(entries, 'origin_x')).toBe(-5)
        expect(value(entries, 'origin_y')).toBe(7)
        expect(value(entries, 'strength')).toBe(200)
        expect(value(entries, 'tolerance')).toBe(150)
        expect(value(entries, 'density')).toBe(99)
        expect(String(value(entries, 'img'))).toMatch(
            /^https:\/\/item\.shiploadgame\.com\/item\/[A-Za-z0-9_-]+\.png$/
        )
    })

    test('component (plate) names its stats from its recipe', () => {
        const entries = buildImmutableData(ITEM_PLATE, 1, encodeStats([512, 333, 250]), 0, 0)
        expect(layout(entries).slice(1, 4)).toEqual([
            ['strength', 'uint16'],
            ['density', 'uint16'],
            ['tolerance', 'uint16'],
        ])
        expect(value(entries, 'tolerance')).toBe(250)
    })

    test('module layout pins the Limpet Bay T1 raw stats and no derived fields', () => {
        const stats = encodeStats([500, 600, 400])
        const entries = buildImmutableData(ITEM_GATHERER_T1, 1, stats, 0, 0)

        expect(layout(entries)).toEqual([
            ['quantity', 'uint32'],
            ['strength', 'uint16'],
            ['tolerance', 'uint16'],
            ['saturation', 'uint16'],
            ...COMMON_TAIL,
        ])
        expect(value(entries, 'strength')).toBe(500)
        expect(value(entries, 'tolerance')).toBe(600)
        expect(value(entries, 'saturation')).toBe(400)
        expect(getWrappedSchema(ITEM_GATHERER_T1)?.name).toBe('limpetbay.v1')
    })

    test('ship layout pins entity_id, the hull stats of its own line, and the loadout', () => {
        const hull = encodeStats([101, 202, 303, 404, 505])
        const core = encodeStats([300, 250])
        const engine = encodeStats([213, 213])
        const modules = [
            {type: 0, installed: {item_id: ITEM_GENERATOR_T1, stats: core}},
            {type: 0, installed: {item_id: ITEM_ENGINE_T1, stats: engine}},
            {type: 0},
        ]
        const entries = buildImmutableData(ITEM_ROUSTABOUT_T1A_PACKED, 1, hull, 3, 4, modules, 77)

        expect(layout(entries)).toEqual([
            ['entity_id', 'uint64'],
            ['quantity', 'uint32'],
            ['strength', 'uint16'],
            ['hardness', 'uint16'],
            ['plasticity', 'uint16'],
            ['volatility', 'uint16'],
            ['conductivity', 'uint16'],
            ...COMMON_TAIL,
            ['module_items', 'UINT16_VEC'],
            ['module_stats', 'UINT64_VEC'],
            ['loadout', 'string'],
        ])
        expect(value(entries, 'entity_id')).toBe('77')
        expect(value(entries, 'conductivity')).toBe(505)
        expect(value(entries, 'module_items')).toEqual([ITEM_GENERATOR_T1, ITEM_ENGINE_T1, 0])
        expect(value(entries, 'module_stats')).toEqual([String(core), String(engine), '0'])
        expect(value(entries, 'loadout')).toBe(
            [
                'Slot 1: Power Core T1 (resonance 300, reflectivity 250)',
                'Slot 2: Engine T1 (volatility 213, thermal 213)',
                'Slot 3: empty',
            ].join('\n')
        )
        expect(getWrappedSchema(ITEM_ROUSTABOUT_T1A_PACKED)?.name).toBe('ship.v1')
    })

    test('structure layout pins the Warehouse hull stats and loadout', () => {
        const hull = encodeStats([111, 222, 333, 444])
        const bay = encodeStats([321, 123])
        const modules = [
            {type: 0, installed: {item_id: ITEM_LOADER_T2, stats: bay}},
            {type: 0},
            {type: 0},
            {type: 0},
            {type: 0},
        ]
        const entries = buildImmutableData(ITEM_WAREHOUSE_T2_PACKED, 1, hull, 0, 0, modules)

        expect(layout(entries).slice(0, 6)).toEqual([
            ['entity_id', 'uint64'],
            ['quantity', 'uint32'],
            ['strength', 'uint16'],
            ['density', 'uint16'],
            ['hardness', 'uint16'],
            ['fineness', 'uint16'],
        ])
        expect(value(entries, 'entity_id')).toBe('0')
        expect(value(entries, 'fineness')).toBe(444)
        expect(value(entries, 'loadout')).toBe(
            [
                'Slot 1: Shuttle Bay T2 (insulation 321, plasticity 123)',
                'Slot 2: empty',
                'Slot 3: empty',
                'Slot 4: empty',
                'Slot 5: empty',
            ].join('\n')
        )
        expect(getWrappedSchema(ITEM_WAREHOUSE_T2_PACKED)?.name).toBe('warehouse.v1')
    })

    test('items without a schema cannot be built', () => {
        expect(() => buildImmutableData(ITEM_SHIP_T1_PACKED, 1, 0n, 0, 0, [])).toThrow()
        expect(() => buildImmutableData(ITEM_WORKSHOP_T1_PACKED, 1, 0n, 0, 0, [])).toThrow()
    })

    test('an entity with no slots writes an empty loadout', () => {
        expect(buildEntityLoadout([], [])).toBe('')
    })

    test('computeNftImageUrl returns a base64url-encoded image link with no padding', () => {
        const url = computeNftImageUrl(
            {item_id: ITEM_ORE_T1, stats: encodeStats([1, 2, 3]), modules: [], quantity: 1},
            0,
            0
        )
        expect(url.startsWith('https://item.shiploadgame.com/item/')).toBe(true)
        expect(url.endsWith('.png')).toBe(true)
        const slug = url.slice('https://item.shiploadgame.com/item/'.length, -'.png'.length)
        expect(slug).not.toMatch(/[+/=]/)
    })

    test('decodeStat round-trips through encodeStats', () => {
        const stats = encodeStats([5, 600, 1023, 200])
        expect(decodeStat(stats, 0)).toBe(5)
        expect(decodeStat(stats, 1)).toBe(600)
        expect(decodeStat(stats, 2)).toBe(1023)
        expect(decodeStat(stats, 3)).toBe(200)
    })
})
