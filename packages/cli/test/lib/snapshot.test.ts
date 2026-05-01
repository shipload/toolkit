import {describe, expect, test} from 'bun:test'
import {ServerContract} from '@shipload/sdk'
import {entityInfoToSnapshot} from '../../src/lib/snapshot'

describe('entityInfoToSnapshot', () => {
    test('produces primitive-typed fields', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'alice',
            entity_name: 'Test',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        const snap = entityInfoToSnapshot(ei)
        expect(typeof snap.type).toBe('string')
        expect(snap.type).toBe('ship')
        expect(typeof snap.id).toBe('bigint')
        expect(snap.id).toBe(1n)
        expect(typeof snap.owner).toBe('string')
        expect(snap.owner).toBe('alice')
        expect(typeof snap.entity_name).toBe('string')
        expect(snap.entity_name).toBe('Test')
        expect(typeof snap.coordinates.x).toBe('bigint')
        expect(typeof snap.coordinates.y).toBe('bigint')
        expect(typeof snap.cargomass).toBe('bigint')
        expect(snap.is_idle).toBe(true)
        expect(typeof snap.current_task_elapsed).toBe('bigint')
        expect(typeof snap.current_task_remaining).toBe('bigint')
    })

    test('value equality holds for identically-valued names from distinct instances', () => {
        const a = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'alice',
            entity_name: 'A',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        const b = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 2,
            owner: 'alice',
            entity_name: 'B',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        // Sanity: distinct Name instances are not === at the wharfkit level.
        expect(a.type === b.type).toBe(false)
        // After conversion, primitive strings are === for value equality.
        const sa = entityInfoToSnapshot(a)
        const sb = entityInfoToSnapshot(b)
        expect(sa.type === sb.type).toBe(true)
    })

    test('maps optional fields when present', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 7,
            owner: 'alice',
            entity_name: 'WithOpts',
            coordinates: {x: 10, y: -20, z: 800},
            cargomass: 5,
            cargo: [
                {item_id: 101, quantity: 3, stats: 0, modules: [], id: 0},
            ],
            modules: [],
            energy: 1000,
            capacity: 5000,
            generator: {capacity: 200, recharge: 50},
            gatherer: {yield: 1, drain: 1, depth: 4, speed: 1},
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        const snap = entityInfoToSnapshot(ei)
        expect(snap.energy).toBe(1000n)
        expect(snap.capacity).toBe(5000n)
        expect(snap.generator).toEqual({capacity: 200n, recharge: 50n})
        expect(snap.gatherer).toEqual({depth: 4n})
        expect(snap.cargo[0]).toMatchObject({
            item_id: 101n,
            quantity: 3n,
            stats: 0n,
            id: 0n,
        })
    })
})
