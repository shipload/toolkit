import {describe, expect, test} from 'bun:test'
import {Name, UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../src/contracts'
import {projectEntity, type Projectable} from '../src/scheduling/projection'
import {ITEM_ROUSTABOUT_T1_PACKED, ITEM_ENGINE_T1} from '../src/data/item-ids'
import {encodeStats, decodeCraftedItemStats} from '../src/derivation/crafting'
import {computeEntityCapabilities} from '../src/derivation/capabilities'
import {getEntityLayout} from '../src/data/recipes-runtime'

describe('projectEntity (lean row recompute)', () => {
    test('recomputes capabilities from stats + item_id + modules when cap fields absent', () => {
        const seed = encodeStats([500, 500, 0, 0])
        const modules = [{slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: seed}]
        const lean: Projectable = {
            coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
            energy: UInt16.from(1000),
            cargo: [],
            cargomass: UInt32.from(0),
            owner: Name.from('teamgreymass'),
            stats: seed,
            item_id: ITEM_ROUSTABOUT_T1_PACKED,
            modules,
        }

        const expected = computeEntityCapabilities(
            decodeCraftedItemStats(ITEM_ROUSTABOUT_T1_PACKED, seed),
            ITEM_ROUSTABOUT_T1_PACKED,
            modules,
            getEntityLayout(ITEM_ROUSTABOUT_T1_PACKED)?.slots ?? []
        )

        const projected = projectEntity(lean)
        const caps = projected.capabilities()

        expect(expected.engines).toBeDefined()
        expect(caps.engines).toBeDefined()
        expect(Number(caps.engines!.thrust.value)).toBe(expected.engines!.thrust)
        expect(caps.capacity).toBeDefined()
        expect(Number(caps.capacity!.value)).toBe(expected.capacity)
        expect(Number(caps.hullmass.value)).toBe(expected.hullmass)
    })
})
