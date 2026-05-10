import {expect, test} from 'bun:test'
import {deserializeAtomicData, type SchemaField} from '../../src/nft/atomicdata'

const ORE_SCHEMA: SchemaField[] = [
    {name: 'name', type: 'string'},
    {name: 'item_id', type: 'uint16'},
    {name: 'quantity', type: 'uint64'},
    {name: 'stats', type: 'uint64'},
    {name: 'origin_x', type: 'int64'},
    {name: 'origin_y', type: 'int64'},
    {name: 'strength', type: 'uint16'},
    {name: 'tolerance', type: 'uint16'},
    {name: 'density', type: 'uint16'},
]

const SHIP_SCHEMA: SchemaField[] = [
    {name: 'name', type: 'string'},
    {name: 'item_id', type: 'uint16'},
    {name: 'quantity', type: 'uint64'},
    {name: 'stats', type: 'uint64'},
    {name: 'origin_x', type: 'int64'},
    {name: 'origin_y', type: 'int64'},
    {name: 'module_items', type: 'uint16[]'},
    {name: 'module_stats', type: 'uint64[]'},
    {name: 'description', type: 'string'},
]

test('decodes a template payload of {name, item_id}', () => {
    const hex = '04094372756465204f72650565'
    const decoded = deserializeAtomicData(hex, ORE_SCHEMA)
    expect(decoded.name).toBe('Crude Ore')
    expect(decoded.item_id).toBe(101)
    expect(decoded.quantity).toBeUndefined()
})

test('decodes an asset payload with all base fields and resource stats', () => {
    const hex = '04094372756465204f72650565060a07b9600809090e0ac8010b96010c63'
    const decoded = deserializeAtomicData(hex, ORE_SCHEMA)
    expect(decoded.name).toBe('Crude Ore')
    expect(decoded.item_id).toBe(101)
    expect(decoded.quantity).toBe(10n)
    expect(decoded.stats).toBe(12345n)
    expect(decoded.origin_x).toBe(-5n)
    expect(decoded.origin_y).toBe(7n)
    expect(decoded.strength).toBe(200)
    expect(decoded.tolerance).toBe(150)
    expect(decoded.density).toBe(99)
})

test('decodes an entity-asset payload with uint16[] and uint64[] vectors', () => {
    const hex =
        '040954657374205368697005d94f060107bbd502080009000a05f44e000000000b058120000000000c15546573742053686970206465736372697074696f6e'
    const decoded = deserializeAtomicData(hex, SHIP_SCHEMA)
    expect(decoded.name).toBe('Test Ship')
    expect(decoded.item_id).toBe(10201)
    expect(decoded.quantity).toBe(1n)
    expect(decoded.stats).toBe(0xaabbn)
    expect(decoded.origin_x).toBe(0n)
    expect(decoded.origin_y).toBe(0n)
    expect(decoded.module_items).toEqual([10100, 0, 0, 0, 0])
    expect(decoded.module_stats).toEqual([0x1001n, 0n, 0n, 0n, 0n])
    expect(decoded.description).toBe('Test Ship description')
})

test('accepts Uint8Array input', () => {
    const hex = '04094372756465204f72650565'
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    const decoded = deserializeAtomicData(bytes, ORE_SCHEMA)
    expect(decoded.name).toBe('Crude Ore')
    expect(decoded.item_id).toBe(101)
})

test('accepts {immutable_serialized_data} wrapper', () => {
    const hex = '04094372756465204f72650565'
    const decoded = deserializeAtomicData({immutable_serialized_data: hex}, ORE_SCHEMA)
    expect(decoded.name).toBe('Crude Ore')
    expect(decoded.item_id).toBe(101)
})

test('accepts number[] input', () => {
    const bytes = [0x04, 0x09, 0x43, 0x72, 0x75, 0x64, 0x65, 0x20, 0x4f, 0x72, 0x65, 0x05, 0x65]
    const decoded = deserializeAtomicData(bytes, ORE_SCHEMA)
    expect(decoded.name).toBe('Crude Ore')
    expect(decoded.item_id).toBe(101)
})

test('throws on unknown field type', () => {
    const hex = '0401'
    expect(() => deserializeAtomicData(hex, [{name: 'x', type: 'uint128'}])).toThrow(
        'Unknown type: uint128'
    )
})
