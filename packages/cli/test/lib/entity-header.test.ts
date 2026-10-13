import { describe, expect, test } from "bun:test";
import { encodeStats, HoldKind, ServerContract, TaskType } from "@shipload/sdk";
import { UInt16, UInt64 } from "@wharfkit/antelope";
import {
	counterpartKey,
	type HeaderContext,
	renderEntityFull,
	renderEntityHeader,
	renderInventoryView,
} from "../../src/lib/entity-header";

const idleShip = {
	projected_at: 0,
	type: "ship",
	id: 1n,
	owner: "agent.gm",
	entity_name: "Test Ship",
	coordinates: { x: 0n, y: 0n, z: 800 },
	cargomass: 0,
	cargo: [],
	is_idle: true,
	current_task: null,
	current_task_elapsed: 0,
	current_task_remaining: 0,
	pending_tasks: [],
	idle_at: null,
	schedule: null,
	// biome-ignore lint/suspicious/noExplicitAny: test fixture stands in for entity_info
} as any;

describe("renderEntityFull modules", () => {
	const fitted = (type: number, itemId: number, stats: bigint) => ({
		type,
		installed: { item_id: UInt16.from(itemId), stats: UInt64.from(stats) },
	});

	test("renders the Tractor Beam's towing figures on the entity sheet", () => {
		const out = renderEntityFull({
			...idleShip,
			modules: [fitted(9, 10106, encodeStats([500, 500, 500]))],
		});
		expect(out).toMatch(/#0 \(Towing\):\s+Tractor Beam \(T1\)/);
		expect(out).toContain("Towing:");
		expect(out).toMatch(/Tows:\s+\d+ containers?, T1 and below/);
		expect(out).toContain("Handling:");
		expect(out).not.toContain("energy/tile");
	});

	test("renders Cargo Hold capacity in tonnes on the entity sheet", () => {
		const out = renderEntityFull({
			...idleShip,
			modules: [fitted(8, 10105, encodeStats([999, 999, 999, 999]))],
		});
		expect(out).toContain("Storage:");
		expect(out).toMatch(/Capacity:\s+[\d,]+ t/);
	});

	test("renders installed module with slot index, accepted type, and name", () => {
		const out = renderEntityFull({
			...idleShip,
			modules: [fitted(0, 10102, encodeStats([500, 500, 500]))],
		});
		expect(out).toMatch(/Modules:/);
		expect(out).toMatch(/#0 \(Any\):\s+Limpet Bay \(T1\)/);
		expect(out).toMatch(/Depth:\s+[\d,]+ km/);
		expect(out).toMatch(/Yield:\s+[\d.]+ t\/min/);
	});

	test("--raw renders capability values as the contract stores them", () => {
		const out = renderEntityFull(
			{ ...idleShip, modules: [fitted(0, 10102, encodeStats([500, 500, 500]))] },
			{ raw: true },
		);
		expect(out).toMatch(/Limpet Bay \(T1\) — yield \d+ · drain \d+ · depth \d+/);
		expect(out).toContain("Values as the contract stores them");
		expect(out).not.toContain("t/min");
	});

	test("renders empty slot with its accepted activity", () => {
		const out = renderEntityFull({
			...idleShip,
			modules: [
				{ type: 4, installed: null },
				{ type: 8, installed: null },
			],
		});
		expect(out).toMatch(/#0 \(Shuttling\):\s+\(empty\)/);
		expect(out).toMatch(/#1 \(Storage\):\s+\(empty\)/);
	});

	test("omits Modules section when entity has no slots", () => {
		const out = renderEntityFull({ ...idleShip });
		expect(out).not.toMatch(/Modules:/);
	});

	test("skips completed tasks lingering in schedule (avoids double-apply crash)", () => {
		const stats = UInt64.from(0);
		const completedCraft = {
			type: { toNumber: () => TaskType.CRAFT },
			duration: { toNumber: () => 60 },
			cargo: [
				{ item_id: 101, quantity: 5, stats, modules: [] },
				{ item_id: 102, quantity: 1, stats, modules: [] },
			],
		};
		const out = renderEntityFull({
			...idleShip,
			schedule: {
				started: { toDate: () => new Date() },
				tasks: [completedCraft],
			},
		});
		expect(out).not.toMatch(/When done/);
	});
});

describe("renderEntityFull live energy", () => {
	test("idle entity renders energy in stored form (no arrow)", () => {
		const out = renderEntityFull({
			...idleShip,
			energy: 200_000,
			generator: { capacity: 350_000, recharge: 10_000 },
		});
		expect(out).toMatch(/Energy:\s+200 \/ 350 energy \(\+600 energy\/min\)/);
		expect(out).not.toContain("→");
	});

	function shipWithTask(type: number, durationS: number, elapsedS: number) {
		const started = new Date(Date.now() - elapsedS * 1000).toISOString().slice(0, 23);
		return ServerContract.Types.entity_info.from({
			projected_at: 0,
			type: "ship",
			id: 1,
			owner: "agent.gm",
			entity_name: "Test Ship",
			coordinates: { x: 0, y: 0, z: 800 },
			item_id: 0,
			cargomass: 0,
			cargo: [],
			modules: [],
			energy: 200_000,
			generator: { capacity: 350_000, recharge: 10_000 },
			gatherer_lanes: [],
			crafter_lanes: [],
			builder_lanes: [],
			loader_lanes: [],
			lanes: [
				{
					lane_key: 0,
					schedule: {
						started,
						tasks: [{ type, duration: durationS, cancelable: 0, cargo: [], couplings: [] }],
					},
				},
			],
			holds: [],
		});
	}

	test("a running task does not add recharge; energy changes only when a task completes", () => {
		const out = renderEntityFull(shipWithTask(TaskType.GATHER, 60, 10));
		expect(out).toMatch(/Energy:\s+200 \/ 350 energy/);
		expect(out).not.toContain("→");
	});

	test("a finished recharge awaiting resolve projects energy to capacity", () => {
		const out = renderEntityFull(shipWithTask(TaskType.RECHARGE, 5, 10));
		expect(out).toMatch(/Energy:\s+200 → 350 \/ 350 energy \(live, /);
	});
});

describe("renderEntityFull holds", () => {
	const base = {
		projected_at: 0,
		type: "warehouse",
		id: 2,
		owner: "agent.gm",
		entity_name: "Depot",
		coordinates: { x: 0, y: 0, z: 0 },
		item_id: 0,
		cargomass: 0,
		cargo: [],
		modules: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		builder_lanes: [],
		loader_lanes: [],
		lanes: [],
	};

	test("incoming push hold renders a player-facing incoming transfer line", () => {
		const until = new Date(Date.now() + 30_000).toISOString().slice(0, 23);
		const ei = ServerContract.Types.entity_info.from({
			projected_at: 0,
			...base,
			holds: [
				{
					id: 1,
					kind: HoldKind.PUSH,
					counterpart: { entity_type: "ship", entity_id: 1 },
					until,
					incoming_mass: 5000,
				},
			],
		});
		const out = renderEntityFull(ei);
		expect(out).toContain("Incoming transfer:");
		expect(out).toContain("from ship 1");
		expect(out).not.toContain("hold");
		expect(out).not.toContain("counterpart");
	});

	test("outgoing pull hold renders an outgoing transfer line with an in-flight note", () => {
		const until = new Date(Date.now() + 30_000).toISOString().slice(0, 23);
		const ei = ServerContract.Types.entity_info.from({
			projected_at: 0,
			...base,
			holds: [
				{
					id: 1,
					kind: HoldKind.PULL,
					counterpart: { entity_type: "ship", entity_id: 14 },
					until,
					incoming_mass: 0,
				},
			],
		});
		const out = renderEntityFull(ei);
		expect(out).toContain("Outgoing transfer:");
		expect(out).toContain("to ship 14");
		expect(out).toContain("already debited");
		expect(out).not.toContain("Outgoing reservation");
	});

	test("build hold renders under construction with the builder", () => {
		const until = new Date(Date.now() + 120_000).toISOString().slice(0, 23);
		const ei = ServerContract.Types.entity_info.from({
			projected_at: 0,
			...base,
			type: "plot",
			holds: [
				{
					id: 1,
					kind: HoldKind.BUILD,
					counterpart: { entity_type: "ship", entity_id: 1 },
					until,
					incoming_mass: 0,
				},
			],
		});
		const out = renderEntityFull(ei);
		expect(out).toContain("Under construction:");
		expect(out).toContain("by ship 1");
	});

	test("three-party shuttle names the far endpoint and the carrier", () => {
		const until = new Date(Date.now() + 30_000).toISOString().slice(0, 23);
		const carrier = ServerContract.Types.entity_info.from({
			projected_at: 0,
			...base,
			type: "depot",
			id: 3,
			entity_name: "Depot (3)",
			holds: [],
			lanes: [
				{
					lane_key: 1,
					schedule: {
						started: new Date(Date.now() - 10_000).toISOString().slice(0, 23),
						tasks: [
							{
								type: TaskType.SHUTTLE,
								duration: 600,
								cancelable: 2,
								cargo: [],
								couplings: [
									{
										counterpart: { entity_type: "ship", entity_id: 5 },
										hold: 1,
										kind: HoldKind.PULL,
									},
									{
										counterpart: { entity_type: "ship", entity_id: 15 },
										hold: 1,
										kind: HoldKind.PUSH,
									},
								],
							},
						],
					},
				},
			],
		});
		const sender = ServerContract.Types.entity_info.from({
			projected_at: 0,
			...base,
			type: "ship",
			id: 5,
			holds: [
				{
					id: 1,
					kind: HoldKind.PULL,
					counterpart: { entity_type: "depot", entity_id: 3 },
					until,
					incoming_mass: 0,
				},
			],
		});
		const out = renderEntityFull(sender, {
			counterparts: new Map([[counterpartKey("depot", 3), carrier]]),
		});
		expect(out).toContain("Outgoing transfer:");
		expect(out).toContain("to ship 15");
		expect(out).toContain("via depot 3");
	});

	test("no holds renders no reservation lines", () => {
		const ei = ServerContract.Types.entity_info.from({ ...base, holds: [] });
		const out = renderEntityFull(ei);
		expect(out).not.toContain("Incoming transfer:");
		expect(out).not.toContain("Under construction:");
	});
});

describe("renderEntityFull projection labels", () => {
	test("ctx with projected.energy and label='live' renders → with (live, ...)", () => {
		const ctx: HeaderContext = {
			projected: { energy: UInt64.from(87_000) },
			projectionLabel: "live",
		};
		const out = renderEntityFull(
			{
				...idleShip,
				energy: 100_000,
				generator: { capacity: 200_000, recharge: 5_000 },
			},
			ctx,
		);
		expect(out).toContain("100 → 87 / 200 energy (live, +300 energy/min)");
	});

	test("ctx with projected.energy and label='projected' renders → with (projected, ...)", () => {
		const ctx: HeaderContext = {
			projected: { energy: UInt64.from(50_000) },
			projectionLabel: "projected",
		};
		const out = renderEntityFull(
			{
				...idleShip,
				energy: 100_000,
				generator: { capacity: 200_000, recharge: 5_000 },
			},
			ctx,
		);
		expect(out).toContain("100 → 50 / 200 energy (projected, +300 energy/min)");
	});

	test("no ctx: idle entity renders static energy", () => {
		const out = renderEntityFull({
			...idleShip,
			energy: 100_000,
			generator: { capacity: 200_000, recharge: 5_000 },
		});
		expect(out).toContain("100 / 200 energy (+300 energy/min)");
	});

	test("raw ctx renders energy as the contract stores it", () => {
		const out = renderEntityFull(
			{
				...idleShip,
				energy: 100_000,
				generator: { capacity: 200_000, recharge: 5_000 },
			},
			{ raw: true },
		);
		expect(out).toContain("100000/200000 (recharge: 5000/s)");
	});
});

describe("renderEntityFull empty name", () => {
	const containerBase = {
		type: "container",
		id: 2n,
		owner: "agent.gm",
		coordinates: { x: 0n, y: 0n, z: 800 },
		cargomass: 0,
		cargo: [],
		is_idle: true,
		current_task: null,
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: [],
		idle_at: null,
		schedule: null,
		// biome-ignore lint/suspicious/noExplicitAny: test fixture
	} as any;

	test("omits quoted name when entity_name is empty string", () => {
		const out = renderEntityFull({ ...containerBase, entity_name: "" });
		expect(out).toContain("container 2 owned by");
		expect(out).not.toContain('""');
	});

	test("omits quoted name when entity_name is whitespace only", () => {
		const out = renderEntityFull({ ...containerBase, entity_name: "   " });
		expect(out).toContain("container 2 owned by");
		expect(out).not.toContain('"');
	});

	test("includes quoted name when entity_name is present", () => {
		const out = renderEntityFull({ ...containerBase, entity_name: "Test Box" });
		expect(out).toContain('container 2 "Test Box" owned by');
	});
});

describe("renderEntityHeader", () => {
	test("identity + idle status row for idle ship", () => {
		const out = renderEntityHeader(idleShip);
		expect(out).toContain('ship 1 "Test Ship" owned by agent.gm');
		expect(out).toContain("Status:");
		expect(out).toContain("idle");
	});

	test("includes Task row when busy", () => {
		const started = new Date(Date.now() - 30_000).toISOString().slice(0, 23);
		const busy = ServerContract.Types.entity_info.from({
			projected_at: 0,
			type: "ship",
			id: 1,
			owner: "agent.gm",
			entity_name: "Test Ship",
			coordinates: { x: 0, y: 0, z: 800 },
			item_id: 0,
			cargomass: 0,
			cargo: [],
			modules: [],
			gatherer_lanes: [],
			crafter_lanes: [],
			builder_lanes: [],
			loader_lanes: [],
			lanes: [
				{
					lane_key: 0,
					schedule: {
						started,
						tasks: [
							{
								type: TaskType.TRAVEL,
								duration: 60,
								cancelable: 0,
								coordinates: { x: 5, y: 5, z: 800 },
								cargo: [],
								couplings: [],
							},
						],
					},
				},
			],
			holds: [],
		});
		const out = renderEntityHeader(busy);
		expect(out).toContain("Task (mobility):");
		expect(out).toContain("Travel");
	});

	test("does not include hull/energy/modules rows", () => {
		const out = renderEntityHeader({
			...idleShip,
			hullmass: 100,
			generator: { capacity: 350, recharge: 10 },
			energy: 200,
		});
		expect(out).not.toContain("Hull:");
		expect(out).not.toContain("Energy:");
	});
});

function makeInventoryEntity(opts: {
	cargo?: { item_id: number; quantity: number; stats: number | bigint; id?: number }[];
	current_task?: ServerContract.Types.task;
	pending_tasks?: ServerContract.Types.task[];
}) {
	const tasks = [
		...(opts.current_task ? [opts.current_task] : []),
		...(opts.pending_tasks ?? []),
	];
	const started = new Date(Date.now() - 1000).toISOString().slice(0, 23);
	const lanes = tasks.length > 0 ? [{ lane_key: 0, schedule: { started, tasks } }] : [];
	return ServerContract.Types.entity_info.from({
		projected_at: 0,
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
		current_task: opts.current_task,
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		builder_lanes: [],
		loader_lanes: [],
		lanes,
		holds: [],
	});
}

function invTask(
	type: TaskType,
	items: { item_id: number; quantity: number; stats: number | bigint }[],
	extras: Record<string, unknown> = {},
) {
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
		couplings: [],
		...extras,
	});
}

describe("renderInventoryView", () => {
	test("idle entity with empty queue renders raw cargo, no projection", () => {
		const entity = makeInventoryEntity({
			cargo: [{ item_id: 301, quantity: 5, stats: 0n, id: 1 }],
		});
		const result = renderInventoryView(entity);
		expect(result.projectionApplied).toBe(false);
		expect(result.tasksConsidered).toBe(0);
		expect(result.text).toContain('ship 1 "Test" owned by alice');
		expect(result.text).toContain("5");
		expect(result.text).not.toContain("(+");
		expect(result.text).not.toContain("(-");
		expect(result.text).not.toContain("(new)");
	});

	test("idle entity with queued UNLOAD removing 1u shows (-1) annotation", () => {
		const entity = makeInventoryEntity({
			cargo: [{ item_id: 301, quantity: 5, stats: 0n, id: 1 }],
			pending_tasks: [invTask(TaskType.UNLOAD, [{ item_id: 301, quantity: 1, stats: 0n }])],
		});
		const result = renderInventoryView(entity);
		expect(result.projectionApplied).toBe(true);
		expect(result.tasksConsidered).toBe(1);
		expect(result.text).toContain("(-1)");
	});

	test("idle entity with queued GATHER adding 5u of a new stack shows (new) 5", () => {
		const entity = makeInventoryEntity({
			cargo: [{ item_id: 301, quantity: 5, stats: 0n, id: 1 }],
			pending_tasks: [invTask(TaskType.GATHER, [{ item_id: 401, quantity: 5, stats: 0n }])],
		});
		const result = renderInventoryView(entity);
		expect(result.projectionApplied).toBe(true);
		expect(result.text).toContain("(new) 5");
	});

	test("busy entity counts current_task + pending_tasks for tasksConsidered", () => {
		const entity = makeInventoryEntity({
			cargo: [{ item_id: 301, quantity: 10, stats: 0n, id: 1 }],
			current_task: invTask(TaskType.UNLOAD, [{ item_id: 301, quantity: 1, stats: 0n }]),
			pending_tasks: [
				invTask(TaskType.UNLOAD, [{ item_id: 301, quantity: 1, stats: 0n }]),
				invTask(TaskType.UNLOAD, [{ item_id: 301, quantity: 1, stats: 0n }]),
			],
		});
		const result = renderInventoryView(entity);
		expect(result.tasksConsidered).toBe(3);
		expect(result.projectionApplied).toBe(true);
	});

	test("opts.current=true skips projection entirely (tasksConsidered=0)", () => {
		const entity = makeInventoryEntity({
			cargo: [{ item_id: 301, quantity: 5, stats: 0n, id: 1 }],
			pending_tasks: [invTask(TaskType.UNLOAD, [{ item_id: 301, quantity: 1, stats: 0n }])],
		});
		const result = renderInventoryView(entity, { current: true });
		expect(result.projectionApplied).toBe(false);
		expect(result.tasksConsidered).toBe(0);
		expect(result.text).not.toContain("(-1)");
		expect(result.text).not.toContain("(new)");
		expect(result.text).toContain("5");
	});

	test("empty cargo renders (empty) footer", () => {
		const entity = makeInventoryEntity({ cargo: [] });
		const result = renderInventoryView(entity);
		expect(result.text).toContain("(empty)");
		expect(result.projectionApplied).toBe(false);
		expect(result.tasksConsidered).toBe(0);
	});
});

function makeBusyEntity(opts: {
	cargo: { item_id: number; quantity: number; stats: number | bigint; id?: number }[];
	cargomass: number;
	capacity?: number;
	current_task: ServerContract.Types.task;
	pending_tasks?: ServerContract.Types.task[];
}) {
	const startedMs = Date.now() - 1000;
	const allTasks = [opts.current_task, ...(opts.pending_tasks ?? [])];
	const totalDurationS = allTasks.reduce(
		(sum, t) => sum + Number(t.duration.toString()),
		0,
	);
	const started = new Date(startedMs).toISOString().slice(0, 23);
	return ServerContract.Types.entity_info.from({
		projected_at: 0,
		type: "ship",
		id: 7,
		owner: "alice",
		entity_name: "Busy",
		coordinates: { x: 0, y: 0, z: 800 },
		item_id: 0,
		cargomass: opts.cargomass,
		capacity: opts.capacity ?? 4_000_000_000,
		cargo: opts.cargo.map((c) => ({
			item_id: c.item_id,
			quantity: c.quantity,
			stats: c.stats,
			modules: [],
			id: c.id ?? 0,
		})),
		modules: [],
		is_idle: false,
		current_task: opts.current_task,
		current_task_elapsed: 1,
		current_task_remaining: Math.max(0, totalDurationS - 1),
		pending_tasks: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		builder_lanes: [],
		loader_lanes: [],
		lanes: [{ lane_key: 0, schedule: { started, tasks: allTasks } }],
		holds: [],
	});
}

function busyTask(
	type: TaskType,
	durationS: number,
	items: { item_id: number; quantity: number; stats: number | bigint }[],
) {
	return ServerContract.Types.task.from({
		type,
		duration: durationS,
		cancelable: 0,
		cargo: items.map((i) => ({
			item_id: i.item_id,
			quantity: i.quantity,
			stats: i.stats,
			modules: [],
		})),
		couplings: [],
	});
}

describe("renderEntityFull whenDoneBlock per-stack diffs", () => {
	test("UNLOAD -1u of a stack renders remove line with current → projected", () => {
		const STAT = 296902688n;
		const entity = makeBusyEntity({
			cargo: [{ item_id: 101, quantity: 73, stats: STAT, id: 1 }],
			cargomass: 73 * 52_000,
			capacity: 4_000_000_000,
			current_task: busyTask(TaskType.UNLOAD, 60, [
				{ item_id: 101, quantity: 1, stats: STAT },
			]),
		});
		const out = renderEntityFull(entity);
		expect(out).toMatch(/When done/);
		expect(out).toMatch(/Cargo:\s+[^\n]*→/);
		expect(out).toMatch(/-\s+Crude Ore \(T1\) stack 296902688:\s+73 → 72/);
	});

	test("GATHER creating a new stack renders add line with (new) +N", () => {
		const entity = makeBusyEntity({
			cargo: [{ item_id: 101, quantity: 10, stats: 100n, id: 1 }],
			cargomass: 10 * 52_000,
			capacity: 4_000_000_000,
			current_task: busyTask(TaskType.GATHER, 60, [
				{ item_id: 101, quantity: 5, stats: 555n },
			]),
		});
		const out = renderEntityFull(entity);
		expect(out).toMatch(/When done/);
		expect(out).toMatch(/\+\s+Crude Ore \(T1\) stack 555:\s+\(new\) \+5/);
	});

	test("CRAFT renders per-stack lines for each consumed input and produced output", () => {
		const entity = makeBusyEntity({
			cargo: [
				{ item_id: 101, quantity: 40, stats: 100n, id: 1 },
				{ item_id: 201, quantity: 20, stats: 200n, id: 2 },
			],
			cargomass: 40 * 52_000 + 20 * 35_000,
			capacity: 4_000_000_000,
			current_task: busyTask(TaskType.CRAFT, 60, [
				{ item_id: 101, quantity: 10, stats: 100n },
				{ item_id: 201, quantity: 5, stats: 200n },
				{ item_id: 10100, quantity: 1, stats: 0n },
			]),
		});
		const out = renderEntityFull(entity);
		expect(out).toMatch(/When done/);
		expect(out).toMatch(/-\s+Crude Ore \(T1\) stack 100:\s+40 → 30/);
		expect(out).toMatch(/-\s+Crude Crystal \(T1\) stack 200:\s+20 → 15/);
		expect(out).toMatch(/\+\s+[^\n]*stack 0:\s+\(new\) \+1/);
	});

	test("no-op task with no cargo changes leaves whenDoneBlock empty", () => {
		const entity = makeBusyEntity({
			cargo: [{ item_id: 101, quantity: 10, stats: 100n, id: 1 }],
			cargomass: 10 * 10,
			capacity: 4_000_000_000,
			current_task: busyTask(TaskType.UNDEPLOY, 60, []),
		});
		const out = renderEntityFull(entity);
		expect(out).not.toMatch(/When done/);
	});
});

describe("renderEntityFull worker-lane schedule", () => {
	test("whenDone + pending reflect worker lanes", () => {
		const at = new Date();
		const ei = ServerContract.Types.entity_info.from({
			projected_at: 0,
			type: "ship",
			id: 9,
			owner: "alice",
			entity_name: "Worker",
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
			builder_lanes: [],
			loader_lanes: [],
			lanes: [
				{
					lane_key: 3,
					schedule: {
						started: new Date(at.getTime() - 30_000).toISOString().slice(0, 23),
						tasks: [
							{ type: 5, duration: 300, cancelable: 0, cargo: [], couplings: [] },
							{ type: 7, duration: 540, cancelable: 2, cargo: [], couplings: [] },
						],
					},
				},
			],
			holds: [],
		});
		const out = renderEntityFull(ei);
		expect(out).toContain("Pending:");
	});
});

describe("renderEntityFull suppressWhenDone", () => {
	test("suppressWhenDone: true on busy entity hides When done block", () => {
		const STAT = 296902688n;
		const entity = makeBusyEntity({
			cargo: [{ item_id: 101, quantity: 73, stats: STAT, id: 1 }],
			cargomass: 73 * 52_000,
			capacity: 4_000_000_000,
			current_task: busyTask(TaskType.UNLOAD, 60, [
				{ item_id: 101, quantity: 1, stats: STAT },
			]),
		});
		const out = renderEntityFull(entity, { suppressWhenDone: true });
		expect(out).not.toMatch(/When done/);
	});

	test("suppressWhenDone: false (default) on busy entity still shows When done block", () => {
		const STAT = 296902688n;
		const entity = makeBusyEntity({
			cargo: [{ item_id: 101, quantity: 73, stats: STAT, id: 1 }],
			cargomass: 73 * 52_000,
			capacity: 4_000_000_000,
			current_task: busyTask(TaskType.UNLOAD, 60, [
				{ item_id: 101, quantity: 1, stats: STAT },
			]),
		});
		const out = renderEntityFull(entity, { suppressWhenDone: false });
		expect(out).toMatch(/When done/);
	});

	test("suppressWhenDone: true on idle entity is a no-op", () => {
		const out = renderEntityFull(idleShip, { suppressWhenDone: true });
		expect(out).not.toMatch(/When done/);
	});
});
