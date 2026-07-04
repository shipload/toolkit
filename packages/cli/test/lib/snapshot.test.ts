import {describe, expect, test} from 'bun:test'
import {ServerContract, schedule as sched} from '@shipload/sdk'
import {entityInfoToSnapshot, completedCount, snapshotTaskTimes} from '../../src/lib/snapshot'

function workerOnlyInfoArgs(at: Date) {
	const startedWorker = new Date(at.getTime() - 60_000).toISOString().slice(0, 23);
	return {
		type: "ship",
		id: 43,
		owner: "alice",
		entity_name: "Worker",
		coordinates: { x: 0, y: 0, z: 800 },
		item_id: 0,
		cargomass: 0,
		cargo: [],
		modules: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		loader_lanes: [],
		lanes: [
			{
				lane_key: 3,
				schedule: {
					started: startedWorker,
					tasks: [{ type: 6, duration: 300, cancelable: 0, cargo: [] }],
				},
			},
		],
		holds: [],
	};
}

function multiLaneInfoArgs(at: Date) {
	const startedMobility = new Date(at.getTime() - 120_000).toISOString().slice(0, 23);
	const startedWorker = new Date(at.getTime() - 60_000).toISOString().slice(0, 23);
	return {
		type: "ship",
		id: 42,
		owner: "alice",
		entity_name: "Multi",
		coordinates: { x: 0, y: 0, z: 800 },
		item_id: 0,
		cargomass: 0,
		cargo: [],
		modules: [],
		is_idle: false,
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		loader_lanes: [],
		lanes: [
			{
				lane_key: 0,
				schedule: {
					started: startedMobility,
					tasks: [{ type: 1, duration: 60, cancelable: 0, cargo: [] }],
				},
			},
			{
				lane_key: 3,
				schedule: {
					started: startedWorker,
					tasks: [
						{ type: 6, duration: 300, cancelable: 0, cargo: [] },
						{ type: 7, duration: 540, cancelable: 2, cargo: [] },
					],
				},
			},
		],
		holds: [],
	};
}

describe('entityInfoToSnapshot', () => {
    test('produces primitive-typed fields', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'alice',
            entity_name: 'Test',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            lanes: [],
            holds: [],
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
    })

    test('value equality holds for identically-valued names from distinct instances', () => {
        const a = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'alice',
            entity_name: 'A',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            lanes: [],
            holds: [],
        })
        const b = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 2,
            owner: 'alice',
            entity_name: 'B',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            lanes: [],
            holds: [],
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
            item_id: 0,
            cargomass: 5,
            cargo: [
                {item_id: 101, quantity: 3, stats: 0, modules: [], id: 0},
            ],
            modules: [],
            energy: 1000,
            capacity: 5000,
            generator: {capacity: 200, recharge: 50},
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            gatherer_lanes: [{slot_index: 0, yield: 1, drain: 1, depth: 4, output_pct: 100}],
            crafter_lanes: [],
            loader_lanes: [],
            lanes: [],
            holds: [],
        })
        const snap = entityInfoToSnapshot(ei)
        expect(snap.energy).toBe(1000n)
        expect(snap.capacity).toBe(5000n)
        expect(snap.generator).toEqual({capacity: 200n, recharge: 50n})
        expect(snap.gatherer).toEqual({yield: 1n, drain: 1n, depth: 4n})
        expect(snap.cargo[0]).toMatchObject({
            item_id: 101n,
            quantity: 3n,
            stats: 0n,
            id: 0n,
        })
        expect(snap.cargo[0].entity_id).toBeUndefined()
    })

    test('carries entity_id from an individuated cargo_view', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 7,
            owner: 'alice',
            entity_name: 'Individuated',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 5,
            cargo: [
                {item_id: 10201, quantity: 1, stats: 196849, modules: [], id: 5, entity_id: 42},
            ],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            lanes: [],
            holds: [],
        })
        const snap = entityInfoToSnapshot(ei)
        expect(snap.cargo[0].entity_id).toBe(42n)
    })
})

describe("entityInfoToSnapshot lanes", () => {
	test("carries raw lanes from ei.lanes (not ei.schedule)", () => {
		const at = new Date("2026-06-11T12:00:00.000Z");
		const ei = ServerContract.Types.entity_info.from(multiLaneInfoArgs(at));
		const snap = entityInfoToSnapshot(ei);
		expect(snap.lanes.length).toBe(2);
		expect(sched.getLanes(snap).map((l) => l.laneKey)).toEqual([0, 3]);
		expect(sched.mobilityLane(snap)?.schedule.tasks.length).toBe(1);
	});

	test("completedCount is entity-wide resolveOrder length", () => {
		const at = new Date("2026-06-11T12:00:00.000Z");
		const ei = ServerContract.Types.entity_info.from(multiLaneInfoArgs(at));
		const snap = entityInfoToSnapshot(ei);
		expect(completedCount(snap, at)).toBe(1);
	});

	test("derives elapsed/remaining from a non-mobility worker lane", () => {
		const at = new Date("2026-06-11T12:00:00.000Z");
		const ei = ServerContract.Types.entity_info.from(workerOnlyInfoArgs(at));
		const snap = entityInfoToSnapshot(ei, at);
		expect(snap.is_idle).toBe(false);
		const times = snapshotTaskTimes(snap, at);
		expect(times.elapsed_s).toBe(60);
		expect(times.remaining_s).toBe(240);
		expect(times.total_s).toBe(300);
	});
});
