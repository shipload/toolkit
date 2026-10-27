import {describe, expect, test} from 'bun:test'
import {
    decodeCraftedItemStats,
    getItem,
    getRecipe,
    getWrappedSchema,
    getWrappedSchemaItemIds,
    getWrappedSchemas,
    wrappedSchemaStatFields,
} from '../../src'
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

function sdkStatNames(itemId: number): string[] {
    return Object.keys(decodeCraftedItemStats(itemId, 0n))
}

describe('wrapped-asset schema parity with the contract catalog', () => {
    test('the catalog carries 32 schemas named <base>.v1', () => {
        const names = getWrappedSchemas().map((s) => s.name)
        expect(names).toHaveLength(32)
        for (const name of names) expect(name).toMatch(/^[a-z]{1,9}\.v1$/)
    })

    test("every item's SDK stat names equal its schema's stat fields", () => {
        const mismatches: string[] = []
        for (const schema of getWrappedSchemas()) {
            const fields = wrappedSchemaStatFields(schema)
            const itemIds = getWrappedSchemaItemIds(schema.name)
            const union = new Set<string>()
            for (const itemId of itemIds) {
                const names = sdkStatNames(itemId)
                for (const n of names) union.add(n)
                const expected =
                    getItem(itemId).type === 'entity'
                        ? fields.filter((f) => names.includes(f))
                        : fields
                if (names.join(',') !== expected.join(',')) {
                    mismatches.push(`${itemId} ${schema.name}: [${names}] != [${expected}]`)
                }
            }
            if ([...union].sort().join(',') !== [...fields].sort().join(',')) {
                mismatches.push(`${schema.name}: union [${[...union]}] != fields [${fields}]`)
            }
        }
        expect(mismatches).toEqual([])
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

    test('the ship schema carries both recipe lines as one union', () => {
        const ship = getWrappedSchemas().find((s) => s.name === 'ship.v1')
        expect(ship && wrappedSchemaStatFields(ship)).toEqual([
            'strength',
            'cohesion',
            'plasticity',
            'volatility',
            'conductivity',
        ])
    })
})
