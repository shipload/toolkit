import {describe, expect, test} from 'bun:test'
import {cargoRef} from './cargo'

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
