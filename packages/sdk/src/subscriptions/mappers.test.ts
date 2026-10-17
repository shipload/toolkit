import {describe, expect, test} from 'bun:test'
import {computeLoaderPayload} from '../derivation/capabilities'
import {parseWireEntity} from './mappers'
import type {WireEntity} from './types'

function wire(loaderLanes: unknown[]): WireEntity {
    return {
        projected_at: 0,
        id: 1,
        owner: 'alice',
        type: 'ship',
        entity_name: 'Test Ship',
        coordinates: {x: 10, y: 20},
        item_id: 0,
        is_idle: true,
        hullmass: 100,
        capacity: 5000,
        cargomass: 0,
        cargo: [],
        modules: [],
        current_task_elapsed: 0,
        current_task_remaining: 0,
        pending_tasks: [],
        lanes: [],
        gatherer_lanes: [],
        crafter_lanes: [],
        builder_lanes: [],
        loader_lanes: loaderLanes,
        holds: [],
    } as unknown as WireEntity
}

describe('parseWireEntity', () => {
    test('decodes a loader lane from a contract that still sends mass', () => {
        const ei = parseWireEntity(wire([{slot_index: 2, mass: 12, thrust: 40, output_pct: 100}]))
        expect(ei.loader_lanes[0].payload.toNumber()).toBe(computeLoaderPayload(400))
        expect(ei.loader_lanes[0].thrust.toNumber()).toBe(40)
    })

    test('keeps a payload the contract sends', () => {
        const ei = parseWireEntity(
            wire([{slot_index: 2, payload: 700, thrust: 40, output_pct: 100}])
        )
        expect(ei.loader_lanes[0].payload.toNumber()).toBe(700)
    })
})
