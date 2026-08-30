import {UInt64} from '@wharfkit/antelope'
import {describe, expect, test} from 'bun:test'
import {entityToRouteMover, hydrateEntityLanes} from './hydrate'

describe('hydrateEntityLanes', () => {
    test('maps camelCase gathererLanes to gatherer_lane with snake_case fields', () => {
        const lanes = hydrateEntityLanes({
            gathererLanes: [
                {slotIndex: 2, yield: 700, drain: 1_250_000, depth: 5000, outputPct: 100},
            ],
        })
        expect(lanes).toHaveLength(1)
        expect(lanes[0].slot_index.toNumber()).toBe(2)
        expect(lanes[0].yield.toNumber()).toBe(700)
        expect(lanes[0].drain.toNumber()).toBe(1_250_000)
        expect(lanes[0].depth.toNumber()).toBe(5000)
        expect(lanes[0].output_pct.toNumber()).toBe(100)
    })

    test('falls back to a single synthetic lane from caps.gatherer when gathererLanes is absent', () => {
        const lanes = hydrateEntityLanes({gatherer: {yield: 300, drain: 50, depth: 1000}})
        expect(lanes).toHaveLength(1)
        expect(lanes[0].slot_index.toNumber()).toBe(0)
        expect(lanes[0].yield.toNumber()).toBe(300)
        expect(lanes[0].drain.toNumber()).toBe(50)
        expect(lanes[0].depth.toNumber()).toBe(1000)
        expect(lanes[0].output_pct.toNumber()).toBe(100)
    })

    test('prefers gathererLanes over the caps.gatherer fallback when both are present', () => {
        const lanes = hydrateEntityLanes({
            gathererLanes: [{slotIndex: 1, yield: 10, drain: 20, depth: 30, outputPct: 40}],
            gatherer: {yield: 999, drain: 999, depth: 999},
        })
        expect(lanes).toHaveLength(1)
        expect(lanes[0].slot_index.toNumber()).toBe(1)
    })

    test('returns an empty array when there is no gatherer capability at all', () => {
        expect(hydrateEntityLanes({})).toEqual([])
    })

    test('clamps out-of-range and non-integer fields to the contract field bounds', () => {
        const lanes = hydrateEntityLanes({
            gathererLanes: [
                {
                    slotIndex: -5,
                    yield: 999_999,
                    drain: -1,
                    depth: 70_000.7,
                    outputPct: Number.NaN,
                },
            ],
        })
        expect(lanes[0].slot_index.toNumber()).toBe(0)
        expect(lanes[0].yield.toNumber()).toBe(65_535)
        expect(lanes[0].drain.toNumber()).toBe(0)
        expect(lanes[0].depth.toNumber()).toBe(65_535)
        expect(lanes[0].output_pct.toNumber()).toBe(0)
    })

    test('clamps a slot index above the uint8 ceiling', () => {
        const lanes = hydrateEntityLanes({
            gathererLanes: [{slotIndex: 300, yield: 0, drain: 0, depth: 0, outputPct: 0}],
        })
        expect(lanes[0].slot_index.toNumber()).toBe(255)
    })

    test('clamps drain above the uint32 ceiling', () => {
        const lanes = hydrateEntityLanes({
            gathererLanes: [{slotIndex: 0, yield: 0, drain: 5_000_000_000, depth: 0, outputPct: 0}],
        })
        expect(lanes[0].drain.toNumber()).toBe(4_294_967_295)
    })
})

describe('entityToRouteMover', () => {
    test('sums hullmass, cargomass, and loader lane mass into total mass', () => {
        const mover = entityToRouteMover(
            {id: UInt64.from(1), energy: 500, cargomass: 200},
            {
                hullmass: 1000,
                loaderLanes: [
                    {slotIndex: 0, mass: 50, thrust: 10, outputPct: 100},
                    {slotIndex: 1, mass: 25, thrust: 10, outputPct: 100},
                ],
            }
        )
        expect(mover.mass).toBe(1000 + 200 + 50 + 25)
        expect(mover.energy).toBe(500)
        expect(mover.ref).toEqual({entityType: 'ship', entityId: UInt64.from(1)})
    })

    test('derives hasMovement from the presence of both engines and a generator', () => {
        const withMovement = entityToRouteMover(
            {id: UInt64.from(1)},
            {
                hullmass: 0,
                engines: {thrust: 100, drain: 10},
                generator: {capacity: 1000, recharge: 10},
            }
        )
        expect(withMovement.hasMovement).toBe(true)

        const withoutMovement = entityToRouteMover({id: UInt64.from(1)}, {hullmass: 0})
        expect(withoutMovement.hasMovement).toBe(false)
    })

    test('an explicit hasMovement opt overrides the derived value', () => {
        const mover = entityToRouteMover(
            {id: UInt64.from(1)},
            {
                hullmass: 0,
                engines: {thrust: 100, drain: 10},
                generator: {capacity: 1000, recharge: 10},
            },
            {hasMovement: false}
        )
        expect(mover.hasMovement).toBe(false)
    })

    test('narrows hauler down to capacity and efficiency, dropping drain and capacityByTier', () => {
        const mover = entityToRouteMover(
            {id: UInt64.from(1)},
            {
                hullmass: 0,
                hauler: {
                    capacity: 500,
                    efficiency: 80,
                    drain: 10,
                    capacityByTier: [{tier: 1, capacity: 500}],
                },
            }
        )
        expect(mover.hauler).toEqual({capacity: 500, efficiency: 80})
    })

    test('defaults energy, priorMobilityEnd, and narrowBarrierEnd to zero when unset', () => {
        const mover = entityToRouteMover({id: UInt64.from(1)}, {hullmass: 0})
        expect(mover.energy).toBe(0)
        expect(mover.priorMobilityEnd).toBe(0)
        expect(mover.narrowBarrierEnd).toBe(0)
    })

    test('opts override entityType and scheduling fields', () => {
        const mover = entityToRouteMover(
            {id: UInt64.from(7)},
            {hullmass: 0},
            {entityType: 'starbase', priorMobilityEnd: 30, narrowBarrierEnd: 15, allLanesEnd: 45}
        )
        expect(mover.ref).toEqual({entityType: 'starbase', entityId: UInt64.from(7)})
        expect(mover.priorMobilityEnd).toBe(30)
        expect(mover.narrowBarrierEnd).toBe(15)
        expect(mover.allLanesEnd).toBe(45)
    })
})
