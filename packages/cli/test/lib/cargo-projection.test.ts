import { describe, expect, test } from "bun:test";
import { ServerContract, TaskType } from "@shipload/sdk";
import { projectCargoFromSnapshot } from "../../src/lib/cargo-projection";
import { entityInfoToSnapshot } from "../../src/lib/snapshot";

function makeShip(opts: {
	cargo?: { item_id: number; quantity: number; stats: number | bigint; id?: number }[];
	current_task?: ServerContract.Types.task;
	pending_tasks?: ServerContract.Types.task[];
}) {
	const ei = ServerContract.Types.entity_info.from({
		type: "ship",
		id: 1,
		owner: "alice",
		entity_name: "Test",
		coordinates: { x: 0, y: 0, z: 800 },
		cargomass: 0,
		cargo: (opts.cargo ?? []).map((c) => ({
			item_id: c.item_id,
			quantity: c.quantity,
			stats: c.stats,
			modules: [],
			id: c.id ?? 0,
		})),
		modules: [],
		is_idle: !opts.current_task,
		current_task: opts.current_task,
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: opts.pending_tasks ?? [],
	});
	return entityInfoToSnapshot(ei);
}

function task(type: TaskType, items: { item_id: number; quantity: number; stats: number | bigint }[]) {
	return ServerContract.Types.task.from({
		type,
		duration: 60,
		cancelable: 0,
		cargo: items.map((i) => ({
			item_id: i.item_id,
			quantity: i.quantity,
			stats: i.stats,
			modules: [],
		})),
	});
}

describe("projectCargoFromSnapshot", () => {
	test("returns current cargo unchanged when no tasks", () => {
		const snap = makeShip({ cargo: [{ item_id: 101, quantity: 5, stats: 100n, id: 1 }] });
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(1);
		expect(out[0].item_id).toBe(101n);
		expect(out[0].quantity).toBe(5n);
		expect(out[0].stats).toBe(100n);
	});

	test("applies in-progress GATHER as new stack when stats differ", () => {
		const snap = makeShip({
			cargo: [{ item_id: 101, quantity: 5, stats: 100n, id: 1 }],
			current_task: task(TaskType.GATHER, [{ item_id: 101, quantity: 15, stats: 46318911n }]),
		});
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(2);
		expect(out.find((s) => s.stats === 46318911n)?.quantity).toBe(15n);
		expect(out.find((s) => s.stats === 100n)?.quantity).toBe(5n);
	});

	test("merges GATHER into existing stack with same item+stats", () => {
		const snap = makeShip({
			cargo: [{ item_id: 101, quantity: 5, stats: 100n, id: 1 }],
			current_task: task(TaskType.GATHER, [{ item_id: 101, quantity: 15, stats: 100n }]),
		});
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(1);
		expect(out[0].quantity).toBe(20n);
	});

	test("ignores GATHER with entitytarget (cargo goes to other entity)", () => {
		const gatherToOther = ServerContract.Types.task.from({
			type: TaskType.GATHER,
			duration: 60,
			cancelable: 0,
			cargo: [{ item_id: 101, quantity: 15, stats: 100n, modules: [] }],
			entitytarget: { entity_type: "container", entity_id: 99 },
		});
		const snap = makeShip({ cargo: [], current_task: gatherToOther });
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(0);
	});

	test("CRAFT removes inputs and adds output", () => {
		const craft = task(TaskType.CRAFT, [
			{ item_id: 101, quantity: 40, stats: 100n },
			{ item_id: 10001, quantity: 1, stats: 240979n },
		]);
		const snap = makeShip({
			cargo: [{ item_id: 101, quantity: 50, stats: 100n, id: 1 }],
			current_task: craft,
		});
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(2);
		expect(out.find((s) => s.item_id === 101n)?.quantity).toBe(10n);
		expect(out.find((s) => s.item_id === 10001n)?.quantity).toBe(1n);
	});

	test("CRAFT removing entire stack drops it", () => {
		const craft = task(TaskType.CRAFT, [
			{ item_id: 101, quantity: 40, stats: 100n },
			{ item_id: 10001, quantity: 1, stats: 240979n },
		]);
		const snap = makeShip({
			cargo: [{ item_id: 101, quantity: 40, stats: 100n, id: 1 }],
			current_task: craft,
		});
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(1);
		expect(out[0].item_id).toBe(10001n);
	});

	test("walks current then pending tasks in order", () => {
		const snap = makeShip({
			cargo: [],
			current_task: task(TaskType.GATHER, [{ item_id: 101, quantity: 15, stats: 100n }]),
			pending_tasks: [task(TaskType.GATHER, [{ item_id: 101, quantity: 25, stats: 100n }])],
		});
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(1);
		expect(out[0].quantity).toBe(40n);
	});

	test("LOAD adds cargo, UNLOAD removes cargo", () => {
		const snap = makeShip({
			cargo: [{ item_id: 101, quantity: 10, stats: 100n, id: 1 }],
			current_task: task(TaskType.LOAD, [{ item_id: 101, quantity: 5, stats: 100n }]),
			pending_tasks: [task(TaskType.UNLOAD, [{ item_id: 101, quantity: 8, stats: 100n }])],
		});
		const out = projectCargoFromSnapshot(snap);
		expect(out).toHaveLength(1);
		expect(out[0].quantity).toBe(7n);
	});
});
