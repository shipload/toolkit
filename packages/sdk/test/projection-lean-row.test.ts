import {describe, expect, test} from 'bun:test'
import {Name, UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../src/contracts'
import {projectEntity, type Projectable} from '../src/scheduling/projection'
import {
    ITEM_ENGINE_T1,
    ITEM_EXTRACTOR_T2_PACKED,
    ITEM_FACTORY_T2_PACKED,
    ITEM_HUB_T2_PACKED,
    ITEM_ROUSTABOUT_T1A_PACKED,
    ITEM_WORKSHOP_T1_PACKED,
} from '../src/data/item-ids'
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
            item_id: ITEM_ROUSTABOUT_T1A_PACKED,
            modules,
        }

        const expected = computeEntityCapabilities(
            decodeCraftedItemStats(ITEM_ROUSTABOUT_T1A_PACKED, seed),
            ITEM_ROUSTABOUT_T1A_PACKED,
            modules,
            getEntityLayout(ITEM_ROUSTABOUT_T1A_PACKED)?.slots ?? []
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

// compute_capabilities.cpp:138 reads packed slot 1 for a non-ship hull, whatever the recipe names it.
describe('non-ship hullmass is positional on packed slot 1', () => {
    const NON_SHIP_HULLS = [
        ['Hub T2', ITEM_HUB_T2_PACKED],
        ['Extractor T2', ITEM_EXTRACTOR_T2_PACKED],
        ['Factory T2', ITEM_FACTORY_T2_PACKED],
        ['Workshop T1', ITEM_WORKSHOP_T1_PACKED],
    ] as const

    for (const [label, itemId] of NON_SHIP_HULLS) {
        test(`${label} charges slot 1, not whichever stat the recipe happens to name`, () => {
            const stats = encodeStats([100, 500, 300])
            const lean: Projectable = {
                coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
                energy: UInt16.from(0),
                cargo: [],
                cargomass: UInt32.from(0),
                owner: Name.from('teamgreymass'),
                stats,
                item_id: itemId,
                modules: [],
            }
            const base = getEntityLayout(itemId)?.baseHullmass ?? 0
            expect(base).toBeGreaterThan(0)
            expect(Number(projectEntity(lean).capabilities().hullmass.value)).toBe(
                Math.floor((base * (2000 - 500)) / 2000)
            )
        })
    }

    test('a ship hull still sums all five channels, counting slot 1 once', () => {
        const stats = encodeStats([100, 500, 300, 700, 900])
        const lean: Projectable = {
            coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
            energy: UInt16.from(0),
            cargo: [],
            cargomass: UInt32.from(0),
            owner: Name.from('teamgreymass'),
            stats,
            item_id: ITEM_ROUSTABOUT_T1A_PACKED,
            modules: [],
        }
        const base = getEntityLayout(ITEM_ROUSTABOUT_T1A_PACKED)?.baseHullmass ?? 0
        expect(Number(projectEntity(lean).capabilities().hullmass.value)).toBe(
            Math.floor((base * (10_000 - 2500)) / 10_000)
        )
    })
})
