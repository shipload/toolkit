import {describe, expect, test} from 'bun:test'
import {UInt64} from '@wharfkit/antelope'
import {cargoRef, cargoRowEntityId, cargoRowItemId, cargoStackFloor} from './cargo'

describe('cargoRef', () => {
    test('forwards entity_id when provided', () => {
        const ref = cargoRef({item_id: 10201, stats: 196849n, modules: [], entity_id: 42n})
        expect(ref.entity_id).toBe(42n)
    })

    test('omits entity_id when absent', () => {
        const ref = cargoRef({item_id: 10201, stats: 196849n})
        expect(ref.entity_id).toBeUndefined()
    })
})

describe('cargo stack key', () => {
    test('decodes entity and item from the row id', () => {
        const id = UInt64.from(cargoStackFloor(77n, 10201) + 5n)
        expect(cargoRowEntityId({id}).toString()).toBe('77')
        expect(cargoRowItemId({id})).toBe(10201)
    })

    test('floor has a zero slot and accepts UInt64 entity ids', () => {
        const floor = cargoStackFloor(UInt64.from(3), 1)
        expect(floor).toBe((3n << 36n) | (1n << 20n))
        expect(floor & 0xfffffn).toBe(0n)
    })
})
