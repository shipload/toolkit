import { describe, expect, test } from "bun:test";
import { ServerContract, TaskType } from "@shipload/sdk";
import {
	diffStacks,
	type ProjectedCargoStack,
	projectCargoFromSnapshot,
	stackKey,
} from "../../src/lib/cargo-projection";
import { entityInfoToSnapshot } from "../../src/lib/snapshot";

function makeShip(opts: {
	cargo?: { item_id: number; quantity: number; stats: number | bigint; id?: number }[];
	current_task?: ServerContract.Types.task;
	pending_tasks?: ServerContract.Types.task[];
}) {
	const tasks = [
		...(opts.current_task ? [opts.current_task] : []),
		...(opts.pending_tasks ?? []),
	];
	const started = new Date(Date.now() - 1000).toISOString().slice(0, 23);
	const lanes = tasks.length > 0
		? [{ lane_key: 0, schedule: { started, tasks } }]
		: [];
	const ei = ServerContract.Types.entity_info.from({
		type: "ship",
		id: 1,
		owner: "alice",
		entity_name: "Test",
		coordinates: { x: 0, y: 0, z: 800 },
		item_id: 0,
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
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: [],
		lanes,
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

function stack(
	item_id: bigint,
	stats: bigint,
	quantity: bigint,
	modules: unknown[] = [],
	id: bigint = 0n,
): ProjectedCargoStack {
	return { item_id, stats, quantity, modules, id };
}

function gatherOnWorkerLane(at: Date) {
	const started = new Date(at.getTime() - 60_000).toISOString().slice(0, 23);
	return {
		type: "ship", id: 7, owner: "alice", entity_name: "Gatherer",
		coordinates: { x: 0, y: 0, z: 800 }, item_id: 0, cargomass: 0, cargo: [],
		modules: [], is_idle: false, current_task_elapsed: 0, current_task_remaining: 0,
		pending_tasks: [],
		lanes: [
			{ lane_key: 3, schedule: { started, tasks: [
				{ type: 5, duration: 300, cancelable: 0,
				  cargo: [{ item_id: 101, quantity: 25, stats: 0, modules: [], id: 0 }] },
			] } },
		],
	};
}

test("projects worker-lane gather cargo, not just mobility", () => {
	const at = new Date("2026-06-11T12:00:00.000Z");
	const snap = entityInfoToSnapshot(ServerContract.Types.entity_info.from(gatherOnWorkerLane(at)));
	const stacks = projectCargoFromSnapshot(snap, at);
	const ore = stacks.find((s) => s.item_id === 101n);
	expect(ore?.quantity).toBe(25n);
});

describe("diffStacks", () => {
	test("empty current and empty projected yields empty map", () => {
		const out = diffStacks([], []);
		expect(out.size).toBe(0);
	});

	test("unchanged stack yields empty map", () => {
		const current = [stack(101n, 100n, 5n)];
		const projected = [stack(101n, 100n, 5n)];
		const out = diffStacks(current, projected);
		expect(out.size).toBe(0);
	});

	test("quantity increase yields single add entry", () => {
		const current = [stack(101n, 100n, 5n)];
		const projected = [stack(101n, 100n, 12n)];
		const out = diffStacks(current, projected);
		expect(out.size).toBe(1);
		const delta = out.get(stackKey(101n, 100n, []));
		expect(delta).toEqual({ kind: "add", quantity: 7n });
	});

	test("quantity decrease yields single remove entry", () => {
		const current = [stack(101n, 100n, 20n)];
		const projected = [stack(101n, 100n, 8n)];
		const out = diffStacks(current, projected);
		expect(out.size).toBe(1);
		const delta = out.get(stackKey(101n, 100n, []));
		expect(delta).toEqual({ kind: "remove", quantity: 12n });
	});

	test("projected stack absent from current yields new entry", () => {
		const current: ProjectedCargoStack[] = [];
		const projected = [stack(101n, 46318911n, 15n)];
		const out = diffStacks(current, projected);
		expect(out.size).toBe(1);
		const delta = out.get(stackKey(101n, 46318911n, []));
		expect(delta).toEqual({ kind: "new", quantity: 15n });
	});

	test("current stack absent from projected yields full remove entry", () => {
		const current = [stack(101n, 100n, 40n)];
		const projected: ProjectedCargoStack[] = [];
		const out = diffStacks(current, projected);
		expect(out.size).toBe(1);
		const delta = out.get(stackKey(101n, 100n, []));
		expect(delta).toEqual({ kind: "remove", quantity: 40n });
	});

	test("same item with different stats stay distinct", () => {
		const current = [stack(101n, 100n, 5n)];
		const projected = [stack(101n, 100n, 5n), stack(101n, 46318911n, 15n)];
		const out = diffStacks(current, projected);
		expect(out.size).toBe(1);
		expect(out.get(stackKey(101n, 100n, []))).toBeUndefined();
		expect(out.get(stackKey(101n, 46318911n, []))).toEqual({ kind: "new", quantity: 15n });
	});

	test("modules-differing stacks stay distinct", () => {
		const modsA = [{ type: "engine", installed: { item_id: 7000n, stats: 200n } }];
		const modsB = [{ type: "engine", installed: { item_id: 7000n, stats: 999n } }];
		const current = [stack(20000n, 0n, 1n, modsA)];
		const projected = [stack(20000n, 0n, 1n, modsB)];
		const out = diffStacks(current, projected);
		expect(out.size).toBe(2);
		expect(out.get(stackKey(20000n, 0n, modsA))).toEqual({ kind: "remove", quantity: 1n });
		expect(out.get(stackKey(20000n, 0n, modsB))).toEqual({ kind: "new", quantity: 1n });
	});
});
