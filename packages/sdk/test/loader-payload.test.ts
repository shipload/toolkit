import {describe, expect, test} from 'bun:test'
import {
    calcShuttleMass,
    computeEntityCapabilities,
    computeLoaderDockedMass,
    computeLoaderPayload,
} from '../src/derivation/capabilities'
import {encodeStats} from '../src/derivation/crafting'
import {ITEM_ENGINE_T1, ITEM_LOADER_T1, ITEM_SHIP_T1_PACKED} from '../src/data/item-ids'
import {getEntityLayout} from '../src/data/recipes-runtime'
import {makeEntity} from '../src/entities/makers'
import {projectEntity} from '../src/scheduling/projection'
import {calc_ship_mass} from '../src/travel/travel'

const BAY_213 = encodeStats([213, 213])
const BAY_350 = encodeStats([350, 213])

const modules = [
    {slotIndex: 0, itemId: ITEM_ENGINE_T1, stats: encodeStats([213, 213])},
    {slotIndex: 1, itemId: ITEM_LOADER_T1, stats: BAY_213},
    {slotIndex: 2, itemId: ITEM_LOADER_T1, stats: BAY_350},
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

describe('Shuttle Bay payload matches compute_loader_payload', () => {
    test.each([
        [0, 500],
        [213, 587],
        [350, 643],
        [500, 705],
        [999, 910],
        [1200, 910],
    ])('insulation %i carries %i permille', (insulation, payload) => {
        expect(computeLoaderPayload(insulation)).toBe(payload)
    })

    test('the thermal container scales with the load', () => {
        expect(calcShuttleMass(0, 500)).toBe(0)
        expect(calcShuttleMass(10_000, 500)).toBe(20_000)
        expect(calcShuttleMass(10_000, 705)).toBe(14_184)
        expect(calcShuttleMass(10_000, 910)).toBe(10_989)
    })

    test('ComputedCapabilities averages payload across bays', () => {
        const caps = computeEntityCapabilities(
            {},
            ITEM_SHIP_T1_PACKED,
            modules,
            getEntityLayout(ITEM_SHIP_T1_PACKED)?.slots ?? []
        )
        expect(caps.loaderLanes?.map((l) => l.payload)).toEqual([587, 643])
        expect(caps.loaders?.payload).toBe(615)
        expect(caps.loaders?.quantity).toBe(2)
    })
})

describe('Each fitted Shuttle Bay docks at a fixed 2 t', () => {
    test('computeLoaderDockedMass', () => {
        expect(computeLoaderDockedMass(0)).toBe(0)
        expect(computeLoaderDockedMass(1)).toBe(20)
        expect(computeLoaderDockedMass(3)).toBe(60)
    })

    test('Entity, ProjectedEntity and calc_ship_mass agree', () => {
        const entity = ship()
        expect(Number(entity.totalMass)).toBe(Number(entity.hullmass) + 40)
        expect(Number(projectEntity(entity).totalMass)).toBe(Number(entity.hullmass) + 40)
        expect(Number(calc_ship_mass(entity, []))).toBe(Number(entity.hullmass) + 40)
    })
})
