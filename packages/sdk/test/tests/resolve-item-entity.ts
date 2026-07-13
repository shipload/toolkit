import {describe, test} from 'bun:test'
import {assert} from 'chai'

import {
    applyCapacityTier,
    computeContainerCapabilities,
    computeWarehouseHullCapabilities,
    encodeStats,
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    resolveItem,
} from '$lib'

describe('resolveItem - entity capacity dispatch', () => {
    const defaultStatInputs = {strength: 500, density: 500, hardness: 500, cohesion: 500}
    const defaultPackedStats = encodeStats([500, 500, 500, 500])

    function findCapacityAttr(attributes: any[] | undefined): number | undefined {
        return attributes
            ?.flatMap((g: any) => g.attributes ?? [])
            .find((a: any) => a.label === 'Capacity')?.value
    }

    test('ship-t1 uses computeShipHullCapabilities', () => {
        const resolved = resolveItem(ITEM_SHIP_T1_PACKED, defaultPackedStats)
        assert.equal(findCapacityAttr(resolved.attributes), Math.floor(5_000_000 * 6 ** (2000 / 4995)))
    })

    test('warehouse-t1 uses computeWarehouseHullCapabilities (NOT Container)', () => {
        const resolved = resolveItem(ITEM_WAREHOUSE_T1_PACKED, defaultPackedStats)
        const expected = computeWarehouseHullCapabilities(defaultStatInputs).capacity
        assert.equal(findCapacityAttr(resolved.attributes), expected)
        assert.isAbove(Number(findCapacityAttr(resolved.attributes)), 50_000_000)
    })

    test('container uses computeContainerCapabilities', () => {
        const resolved = resolveItem(ITEM_CONTAINER_T1_PACKED, defaultPackedStats)
        const expected = computeContainerCapabilities(defaultStatInputs).capacity
        assert.equal(findCapacityAttr(resolved.attributes), expected)
    })

    test('container-t2 uses the plain container base times the tier-2 multiplier (container_t2 retired)', () => {
        const resolved = resolveItem(ITEM_CONTAINER_T2_PACKED, defaultPackedStats)
        const decodedInputs = {strength: 500, density: 500, hardness: 500, cohesion: 500}
        const base = computeContainerCapabilities(decodedInputs).capacity
        const expected = applyCapacityTier(base, 2)
        assert.equal(findCapacityAttr(resolved.attributes), expected)
    })
})
