import {expect, test} from 'bun:test'
import {UInt16, UInt64} from '@wharfkit/antelope'
import {resolveItem} from './resolve-item'
import {encodeStats} from '../derivation/crafting'
import {computeContainerCapabilities} from '../derivation/capabilities'
import {
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_MASS_DRIVER_T1_PACKED,
    ITEM_MASS_CATCHER_T1_PACKED,
} from '../data/item-ids'

function hullStats(strength: number, density: number, hardness: number): UInt64 {
    return UInt64.from(encodeStats([strength, density, hardness]).toString())
}

const CONTAINER_ENTITIES = [
    ['factory', ITEM_FACTORY_T1_PACKED],
    ['extractor', ITEM_EXTRACTOR_T1_PACKED],
    ['mass driver', ITEM_MASS_DRIVER_T1_PACKED],
    ['mass catcher', ITEM_MASS_CATCHER_T1_PACKED],
] as const

for (const [label, itemId] of CONTAINER_ENTITIES) {
    test(`resolveItem resolves ${label} hull capacity via container formula`, () => {
        const stats = hullStats(300, 100, 400)
        const resolved = resolveItem(UInt16.from(itemId), stats)
        const hull = resolved.attributes?.find((g) => g.capability === 'Hull')
        const capacity = hull?.attributes.find((a) => a.label === 'Capacity')?.value
        const expected = computeContainerCapabilities({
            strength: 300,
            hardness: 400,
            density: 100,
        }).capacity
        expect(capacity).toBe(expected)
    })
}
