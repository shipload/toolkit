import {describe, expect, test} from 'bun:test'
import {computeEntityCapabilities, computeLoaderWorkerMass} from '../src/derivation/capabilities'
import {encodeStats} from '../src/derivation/crafting'
import {ITEM_ENGINE_T1, ITEM_LOADER_T1, ITEM_SHIP_T1_PACKED} from '../src/data/item-ids'
import {getEntityLayout} from '../src/data/recipes-runtime'
import {makeEntity} from '../src/entities/makers'
import {projectEntity} from '../src/scheduling/projection'
import {calc_ship_mass} from '../src/travel/travel'

const BAY_16 = encodeStats([213, 213])
const BAY_13 = encodeStats([350, 213])

const modules = [
    {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([213, 213])},
    {slotIndex: 1, itemId: ITEM_LOADER_T1, stats: BAY_16},
    {slotIndex: 2, itemId: ITEM_LOADER_T1, stats: BAY_13},
]

function ship() {
    return makeEntity(ITEM_SHIP_T1_PACKED, {
        id: 1,
        owner: 'alice',
        name: 'hauler',
        coordinates: {x: 0, y: 0},
        modules: modules.map(({itemId, stats}) => ({itemId, stats})),
        cargomass: 0,
    })
}

describe('Shuttle Bay worker mass matches the contract floor(mean) × count', () => {
    test('computeLoaderWorkerMass', () => {
        expect(computeLoaderWorkerMass([])).toBe(0)
        expect(computeLoaderWorkerMass([16])).toBe(16)
        expect(computeLoaderWorkerMass([16, 13])).toBe(28)
        expect(computeLoaderWorkerMass([20, 19, 19])).toBe(57)
    })

    test('ComputedCapabilities.loaders.mass', () => {
        const caps = computeEntityCapabilities(
            {},
            ITEM_SHIP_T1_PACKED,
            modules,
            getEntityLayout(ITEM_SHIP_T1_PACKED)?.slots ?? []
        )
        expect(caps.loaderLanes?.map((l) => l.mass)).toEqual([16, 13])
        expect(caps.loaders?.mass).toBe(28)
        expect(caps.loaders?.quantity).toBe(2)
    })

    test('Entity.totalMass includes the worker mass', () => {
        const entity = ship()
        expect(Number(entity.totalMass)).toBe(Number(entity.hullmass) + 28)
    })

    test('ProjectedEntity.totalMass and calc_ship_mass agree with Entity.totalMass', () => {
        const entity = ship()
        const projected = projectEntity(entity)
        expect(Number(projected.totalMass)).toBe(Number(entity.hullmass) + 28)
        expect(Number(calc_ship_mass(entity, []))).toBe(Number(entity.hullmass) + 28)
    })
})
