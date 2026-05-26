import { describe, expect, test } from "bun:test";
import { ServerContract, TaskType } from "@shipload/sdk";
import { projectedCoords } from "../../src/lib/projection";
import { entityInfoToSnapshot } from "../../src/lib/snapshot";

function travelTask(destX: number, destY: number) {
	return ServerContract.Types.task.from({
		type: TaskType.TRAVEL,
		duration: 60,
		cancelable: 0,
		coordinates: { x: destX, y: destY },
		cargo: [],
	});
}

function makeShip(opts: {
	x: number;
	y: number;
	current_task?: ServerContract.Types.task;
	pending_tasks?: ServerContract.Types.task[];
}) {
	const tasks: ServerContract.Types.task[] = [];
	if (opts.current_task) tasks.push(opts.current_task);
	if (opts.pending_tasks) tasks.push(...opts.pending_tasks);
	const ei = ServerContract.Types.entity_info.from({
		type: "ship",
		id: 1,
		owner: "alice",
		entity_name: "Test",
		coordinates: { x: opts.x, y: opts.y, z: 800 },
		item_id: 0,
		cargomass: 0,
		cargo: [],
		modules: [],
		is_idle: tasks.length === 0,
		current_task: opts.current_task,
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: opts.pending_tasks ?? [],
		hullmass: 100,
		energy: 1000,
		engines: { thrust: 500, drain: 1 },
		generator: { capacity: 1000, recharge: 10 },
		schedule:
			tasks.length > 0
				? { started: "1970-01-01T00:00:00", tasks }
				: undefined,
	});
	return entityInfoToSnapshot(ei);
}

describe("projectedCoords", () => {
	test("idle ship: returns recorded coordinates", () => {
		const snap = makeShip({ x: 42, y: 7 });
		expect(projectedCoords(snap)).toEqual({ x: 42n, y: 7n });
	});

	test("ship with pending travel: returns destination, not recorded coords", () => {
		const snap = makeShip({
			x: 0,
			y: 0,
			current_task: travelTask(100, 200),
		});
		expect(projectedCoords(snap)).toEqual({ x: 100n, y: 200n });
	});

	test("ship with queued travel (current + pending): returns last leg's destination", () => {
		const snap = makeShip({
			x: 0,
			y: 0,
			current_task: travelTask(50, 50),
			pending_tasks: [travelTask(300, 400)],
		});
		expect(projectedCoords(snap)).toEqual({ x: 300n, y: 400n });
	});
});
