import { describe, expect, test } from "bun:test";
import { getItem, ServerContract, ServerTypes, TaskType } from "@shipload/sdk";
import { projectedCargoMass, projectedCoords } from "../../src/lib/projection";
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
	const started = new Date(Date.now() - 1000).toISOString().slice(0, 23);
	const lanes = tasks.length > 0 ? [{ lane_key: 0, schedule: { started, tasks } }] : [];
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
		lanes,
		hullmass: 100,
		energy: 1000,
		engines: { thrust: 500, drain: 1 },
		generator: { capacity: 1000, recharge: 10 },
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

const ORE_T1 = 101;
const ORE_MASS = getItem(ORE_T1).mass;

function oreCargoItem(quantity: number, stackId = 12345) {
	return ServerTypes.cargo_item.from({
		item_id: ORE_T1,
		quantity,
		stats: stackId,
		modules: [],
	});
}

function oreCargoView(quantity: number, stackId = 12345, id = 1) {
	return ServerTypes.cargo_view.from({
		item_id: ORE_T1,
		quantity,
		stats: stackId,
		modules: [],
		id,
	});
}

function unloadTask(quantity: number, stackId = 12345) {
	return ServerTypes.task.from({
		type: TaskType.UNLOAD,
		duration: 60,
		cancelable: 1,
		coordinates: { x: 0, y: 0 },
		cargo: [oreCargoItem(quantity, stackId)],
	});
}

function makeShipWithCargo(opts: {
	cargoQuantity: number;
	current_task?: ServerContract.Types.task;
	pending_tasks?: ServerContract.Types.task[];
}) {
	const tasks: ServerContract.Types.task[] = [];
	if (opts.current_task) tasks.push(opts.current_task);
	if (opts.pending_tasks) tasks.push(...opts.pending_tasks);
	const started = new Date(Date.now() - 1000).toISOString().slice(0, 23);
	const lanes = tasks.length > 0 ? [{ lane_key: 0, schedule: { started, tasks } }] : [];
	const ei = ServerContract.Types.entity_info.from({
		type: "ship",
		id: 1,
		owner: "alice",
		entity_name: "Test",
		coordinates: { x: 0, y: 0, z: 800 },
		item_id: 0,
		cargomass: ORE_MASS * opts.cargoQuantity,
		cargo: [oreCargoView(opts.cargoQuantity)],
		modules: [],
		is_idle: tasks.length === 0,
		current_task: opts.current_task,
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: opts.pending_tasks ?? [],
		lanes,
		hullmass: 100,
		capacity: 10_000_000,
		energy: 1000,
		engines: { thrust: 500, drain: 1 },
		generator: { capacity: 1000, recharge: 10 },
	});
	return entityInfoToSnapshot(ei);
}

describe("projectedCargoMass", () => {
	test("idle ship: returns the recorded cargo mass", () => {
		const snap = makeShipWithCargo({ cargoQuantity: 100 });
		expect(projectedCargoMass(snap)).toBe(BigInt(ORE_MASS) * 100n);
	});

	test("ship mid-unload of full cargo: projects to empty", () => {
		const snap = makeShipWithCargo({
			cargoQuantity: 100,
			current_task: unloadTask(100),
		});
		expect(projectedCargoMass(snap)).toBe(0n);
	});

	test("ship with current + pending unloads: subtracts both", () => {
		const snap = makeShipWithCargo({
			cargoQuantity: 100,
			current_task: unloadTask(40),
			pending_tasks: [unloadTask(35)],
		});
		expect(projectedCargoMass(snap)).toBe(BigInt(ORE_MASS) * 25n);
	});
});
