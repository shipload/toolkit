import {describe, expect, test} from 'bun:test'
import {
    buildComponentImmutable,
    buildEntityImmutable,
    buildImmutableData,
    buildModuleImmutable,
    buildResourceImmutable,
    computeEngineDrain,
    computeEngineThrust,
    computeGathererDepth,
    computeGathererDrain,
    computeGathererYield,
    computeHaulerCapacity,
    computeHaulerEfficiency,
    computeNftImageUrl,
    decodeStat,
    type ImmutableEntry,
} from '../../src'
import {computeHaulerDrain as moduleComputeHaulerDrain} from '../../src/nft/description'

const ITEM_CRUDE_ORE = 101
const ITEM_COMPONENT_ORE_BASED = 10001
const ITEM_ENGINE_T1 = 10100
const ITEM_GATHERER_T1 = 10102
const ITEM_STORAGE_T1 = 10105
const ITEM_HAULER_T1 = 10106
const ITEM_BATTERY_T1 = 10108
const ITEM_SHIP_T1_PACKED = 10201

function encodeStats(values: number[]): bigint {
    let result = 0n
    for (let i = 0; i < values.length; i++) {
        result |= (BigInt(values[i]!) & 0x3ffn) << BigInt(i * 10)
    }
    return result
}

function findEntry(entries: ImmutableEntry[], key: string): ImmutableEntry | undefined {
    return entries.find((e) => e.first === key)
}

function keys(entries: ImmutableEntry[]): string[] {
    return entries.map((e) => e.first)
}

describe('buildImmutableData', () => {
    test('resource (ore) emits common base + 3 category stats in fixed order', () => {
        const stats = encodeStats([200, 150, 99])
        const entries = buildResourceImmutable(ITEM_CRUDE_ORE, 10, stats, -5, 7)

        expect(keys(entries)).toEqual([
            'quantity',
            'stats',
            'origin_x',
            'origin_y',
            'img',
            'deposit_amount',
            'deposit_token',
            'deposit_symbol',
            'strength',
            'tolerance',
            'density',
        ])

        expect(findEntry(entries, 'quantity')!.second).toEqual(['uint32', 10])
        expect(findEntry(entries, 'stats')!.second).toEqual(['uint64', String(stats)])
        expect(findEntry(entries, 'origin_x')!.second).toEqual(['int32', -5])
        expect(findEntry(entries, 'origin_y')!.second).toEqual(['int32', 7])
        expect(findEntry(entries, 'strength')!.second).toEqual(['uint16', 200])
        expect(findEntry(entries, 'tolerance')!.second).toEqual(['uint16', 150])
        expect(findEntry(entries, 'density')!.second).toEqual(['uint16', 99])

        const img = findEntry(entries, 'img')!.second
        expect(img[0]).toBe('string')
        expect(String(img[1])).toMatch(
            /^https:\/\/item\.shiploadgame\.com\/item\/[A-Za-z0-9_-]+\.png$/
        )
    })

    test('resource dispatcher routes through buildImmutableData', () => {
        const stats = encodeStats([42, 17, 9])
        const direct = buildResourceImmutable(ITEM_CRUDE_ORE, 3, stats, 0, 0)
        const dispatched = buildImmutableData(ITEM_CRUDE_ORE, 3, stats, 0, 0)
        expect(dispatched).toEqual(direct)
    })

    test('component (ore-based) emits decoded crafted stat keys', () => {
        const stats = encodeStats([512, 333])
        const entries = buildComponentImmutable(ITEM_COMPONENT_ORE_BASED, 1, stats, 0, 0)

        expect(keys(entries)).toEqual([
            'quantity',
            'stats',
            'origin_x',
            'origin_y',
            'img',
            'deposit_amount',
            'deposit_token',
            'deposit_symbol',
            'strength',
            'density',
        ])
        expect(findEntry(entries, 'strength')!.second).toEqual(['uint16', 512])
        expect(findEntry(entries, 'density')!.second).toEqual(['uint16', 333])
    })

    test('module (engine) emits volatility/thermal + computed thrust/drain', () => {
        const vol = 700
        const thm = 420
        const stats = encodeStats([vol, thm])
        const entries = buildModuleImmutable(ITEM_ENGINE_T1, 1, stats, 0, 0)

        expect(keys(entries)).toEqual([
            'quantity',
            'stats',
            'origin_x',
            'origin_y',
            'img',
            'deposit_amount',
            'deposit_token',
            'deposit_symbol',
            'volatility',
            'thermal',
            'thrust',
            'drain',
        ])
        expect(findEntry(entries, 'volatility')!.second).toEqual(['uint16', vol])
        expect(findEntry(entries, 'thermal')!.second).toEqual(['uint16', thm])
        expect(findEntry(entries, 'thrust')!.second).toEqual(['uint32', computeEngineThrust(vol)])
        expect(findEntry(entries, 'drain')!.second).toEqual(['uint16', computeEngineDrain(thm)])
    })

    test('module (gatherer) emits 4 stats + 3 computed values in fixed order', () => {
        const str = 500
        const tol = 600
        const con = 400
        const ref = 700
        const stats = encodeStats([str, tol, con, ref])
        const entries = buildModuleImmutable(ITEM_GATHERER_T1, 1, stats, 0, 0)

        expect(keys(entries)).toEqual([
            'quantity',
            'stats',
            'origin_x',
            'origin_y',
            'img',
            'deposit_amount',
            'deposit_token',
            'deposit_symbol',
            'strength',
            'tolerance',
            'conductivity',
            'reflectivity',
            'yield',
            'drain',
            'depth',
        ])
        expect(findEntry(entries, 'yield')!.second).toEqual(['uint16', computeGathererYield(str)])
        expect(findEntry(entries, 'drain')!.second).toEqual(['uint16', computeGathererDrain(con)])
        expect(findEntry(entries, 'depth')!.second).toEqual([
            'uint16',
            computeGathererDepth(tol, 1),
        ])
    })

    test('module (hauler) emits 3 stats + 3 computed capabilities', () => {
        const res = 400
        const con = 250
        const ref = 600
        const stats = encodeStats([res, con, ref])
        const entries = buildModuleImmutable(ITEM_HAULER_T1, 1, stats, 0, 0)

        expect(keys(entries)).toEqual([
            'quantity',
            'stats',
            'origin_x',
            'origin_y',
            'img',
            'deposit_amount',
            'deposit_token',
            'deposit_symbol',
            'resonance',
            'plasticity',
            'reflectivity',
            'capacity',
            'efficiency',
            'drain',
        ])
        expect(findEntry(entries, 'resonance')!.second).toEqual(['uint16', res])
        expect(findEntry(entries, 'capacity')!.second).toEqual([
            'uint8',
            computeHaulerCapacity(res),
        ])
        expect(findEntry(entries, 'efficiency')!.second).toEqual([
            'uint16',
            computeHaulerEfficiency(con),
        ])
        expect(findEntry(entries, 'drain')!.second).toEqual([
            'uint16',
            moduleComputeHaulerDrain(ref),
        ])
    })

    test('module (storage/Cargo Bay) emits raw capacity as uint32', () => {
        const stats = encodeStats([999, 999, 999, 999])
        const entries = buildModuleImmutable(ITEM_STORAGE_T1, 1, stats, 0, 0)

        expect(keys(entries)).toContain('capacity')
        expect(keys(entries)).not.toContain('capacity_bonus_pct')
        expect(findEntry(entries, 'strength')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'density')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'hardness')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'cohesion')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'capacity')!.second).toEqual(['uint32', 60_000_000])
    })

    test('module (battery/Battery Bank) emits raw capacity as uint32', () => {
        const stats = encodeStats([999, 999, 999, 999])
        const entries = buildModuleImmutable(ITEM_BATTERY_T1, 1, stats, 0, 0)

        expect(keys(entries)).toContain('capacity')
        expect(keys(entries)).not.toContain('capacity_bonus_pct')
        expect(findEntry(entries, 'volatility')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'thermal')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'plasticity')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'insulation')!.second).toEqual(['uint16', 999])
        expect(findEntry(entries, 'capacity')!.second).toEqual(['uint32', 10_000])
    })

    test('entity (ship) emits module vectors and description; pads empty slots with 0', () => {
        const shipStats = encodeStats([100, 200])
        const engineStats = encodeStats([700, 420])
        const modules = [
            {type: 1, installed: {item_id: ITEM_ENGINE_T1, stats: engineStats}},
            {type: 1},
            {type: 1},
            {type: 1},
            {type: 1},
        ]
        const entries = buildEntityImmutable(ITEM_SHIP_T1_PACKED, 1, shipStats, 0, 0, modules)

        expect(keys(entries)).toEqual([
            'quantity',
            'stats',
            'origin_x',
            'origin_y',
            'img',
            'deposit_amount',
            'deposit_token',
            'deposit_symbol',
            'module_items',
            'module_stats',
            'description',
        ])
        expect(findEntry(entries, 'module_items')!.second).toEqual([
            'UINT16_VEC',
            [ITEM_ENGINE_T1, 0, 0, 0, 0],
        ])
        expect(findEntry(entries, 'module_stats')!.second).toEqual([
            'UINT64_VEC',
            [String(engineStats), '0', '0', '0', '0'],
        ])
        const description = findEntry(entries, 'description')!.second
        expect(description[0]).toBe('string')
        expect(typeof description[1]).toBe('string')
        expect((description[1] as string).length).toBeGreaterThan(0)
    })

    test('entity dispatcher routes through buildImmutableData', () => {
        const shipStats = encodeStats([100, 200])
        const modules = [{type: 1}, {type: 1}, {type: 1}, {type: 1}, {type: 1}]
        const direct = buildEntityImmutable(ITEM_SHIP_T1_PACKED, 1, shipStats, 0, 0, modules)
        const dispatched = buildImmutableData(ITEM_SHIP_T1_PACKED, 1, shipStats, 0, 0, modules)
        expect(dispatched).toEqual(direct)
    })

    test('computeNftImageUrl returns a base64url-encoded image link with no padding', () => {
        const url = computeNftImageUrl(
            {item_id: ITEM_CRUDE_ORE, stats: encodeStats([1, 2, 3]), modules: [], quantity: 1},
            0,
            0
        )
        expect(url.startsWith('https://item.shiploadgame.com/item/')).toBe(true)
        expect(url.endsWith('.png')).toBe(true)
        const slug = url.slice('https://item.shiploadgame.com/item/'.length, -'.png'.length)
        expect(slug).not.toMatch(/[+/=]/)
    })

    test('decodeStat round-trips through encodeStats helper used in tests', () => {
        const stats = encodeStats([5, 600, 1023, 200])
        expect(decodeStat(stats, 0)).toBe(5)
        expect(decodeStat(stats, 1)).toBe(600)
        expect(decodeStat(stats, 2)).toBe(1023)
        expect(decodeStat(stats, 3)).toBe(200)
    })
})
