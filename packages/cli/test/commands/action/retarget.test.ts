import {test, expect} from 'bun:test'
import {ServerContract} from '@shipload/sdk'
import {findRetargetableLane} from '../../../src/commands/action/retarget'
import {entityInfoToSnapshot} from '../../../src/lib/snapshot'

function snapWithWorkerLane(tasks: unknown[]) {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const ei = ServerContract.Types.entity_info.from({
        type: 'ship',
        id: 5,
        owner: 'alice',
        entity_name: 'Hauler',
        coordinates: {x: 0, y: 0, z: 800},
        item_id: 0,
        cargomass: 0,
        cargo: [],
        modules: [],
        is_idle: false,
        current_task_elapsed: 0,
        current_task_remaining: 0,
        pending_tasks: [],
        lanes: [
            {
                lane_key: 0,
                schedule: {
                    started: new Date(at.getTime() - 30_000).toISOString().slice(0, 23),
                    tasks: [{type: 1, duration: 60, cancelable: 0, cargo: []}],
                },
            },
            {
                lane_key: 3,
                schedule: {
                    started: new Date(at.getTime() + 10_000).toISOString().slice(0, 23),
                    tasks,
                },
            },
        ],
    })
    return entityInfoToSnapshot(ei)
}

test('finds a pending UNLOAD-with-target on a worker lane by local index', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const snap = snapWithWorkerLane([
        {type: 5, duration: 300, cancelable: 0, cargo: []},
        {
            type: 4,
            duration: 60,
            cancelable: 2,
            cargo: [{item_id: 101, quantity: 1, stats: 0, modules: []}],
            entitytarget: {entity_type: 'container', entity_id: 99},
        },
    ])
    const hit = findRetargetableLane(snap, 1, at)
    expect(hit?.laneKey).toBe(3)
})

test('rejects an index that is not a pending UNLOAD-with-target', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const snap = snapWithWorkerLane([{type: 5, duration: 300, cancelable: 0, cargo: []}])
    expect(findRetargetableLane(snap, 0, at)).toBeNull()
})
