import {describe, expect, test} from 'bun:test'
import {getItems, itemTypeIndex, typeLabel} from './catalog'

describe('itemTypeIndex', () => {
    test('agrees with typeLabel for every item in the catalog', () => {
        for (const item of getItems()) {
            expect(typeLabel(itemTypeIndex(item.id))).toBe(typeLabel(item.type))
        }
    })

    test('covers every type in the chain enum order', () => {
        const indexes = new Set(getItems().map((item) => itemTypeIndex(item.id)))
        expect([...indexes].sort()).toEqual([0, 1, 2, 3])
    })

    test('throws for an unknown item', () => {
        expect(() => itemTypeIndex(65535)).toThrow()
    })
})
