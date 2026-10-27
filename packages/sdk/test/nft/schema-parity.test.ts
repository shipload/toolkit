import {describe, expect, test} from 'bun:test'
import {getRecipe, getWrappedSchema, getWrappedSchemas} from '../../src'
import {
    ITEM_CONSTRUCTION_DOCK_T1_PACKED,
    ITEM_DEPOT_T1_PACKED,
    ITEM_LAUNCHER_T1,
    ITEM_MASS_CATCHER_T1_PACKED,
    ITEM_MASS_DRIVER_T1_PACKED,
    ITEM_NEXUS_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WORKSHOP_T1_PACKED,
} from '../../src/data/item-ids'
import catalogItems from '../../src/data/items.json'

describe('wrapped-asset schema parity with the contract catalog', () => {
    test('the catalog carries 31 schemas named <base>.v1', () => {
        const names = getWrappedSchemas().map((s) => s.name)
        expect(names).toHaveLength(31)
        for (const name of names) expect(name).toMatch(/^[a-z]{1,9}\.v1$/)
    })

    test('no schema carries a per-stat field', () => {
        for (const schema of getWrappedSchemas()) {
            const names = schema.fields.map((f) => f.name)
            expect(names.indexOf('stats')).toBe(names.indexOf('quantity') + 1)
            expect(schema.fields.filter((f) => f.type === 'uint16').map((f) => f.name)).toEqual([
                'item_id',
            ])
        }
    })

    test('every gathered or craftable item has a schema', () => {
        const missing = catalogItems
            .filter((item) => item.type === 'resource' || getRecipe(item.id))
            .filter((item) => !getWrappedSchema(item.id))
            .map((item) => item.id)
        expect(missing).toEqual([])
    })

    test('built-in-place structures, the generic Ship and the Drive Coil have no schema', () => {
        for (const itemId of [
            ITEM_WORKSHOP_T1_PACKED,
            ITEM_DEPOT_T1_PACKED,
            ITEM_NEXUS_T1_PACKED,
            ITEM_CONSTRUCTION_DOCK_T1_PACKED,
            ITEM_MASS_DRIVER_T1_PACKED,
            ITEM_MASS_CATCHER_T1_PACKED,
            ITEM_SHIP_T1_PACKED,
            ITEM_LAUNCHER_T1,
        ]) {
            expect(getWrappedSchema(itemId)).toBeUndefined()
        }
    })
})
