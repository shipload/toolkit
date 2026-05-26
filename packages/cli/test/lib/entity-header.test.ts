import { describe, expect, test } from "bun:test";
import { ServerContract, TaskType } from "@shipload/sdk";
import { TimePoint, UInt64 } from "@wharfkit/antelope";
import {
	type HeaderContext,
	renderEntityFull,
	renderEntityHeader,
	renderInventoryView,
} from "../../src/lib/entity-header";

const idleShip = {
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
	test("renders installed module with slot index, accepted type, name, and stats", () => {
		const out = renderEntityFull({
			...idleShip,
			modules: [
				{ type: 0, installed: { item_id: 10102, stats: 0n } },
			],
		});
		expect(out).toMatch(/Modules:/);
		expect(out).toMatch(/#0 \(Any\):\s+Gatherer \(T1\) — depth \d+ · yield \d+ · \d+ energy\/s/);
	});

	test("renders empty slot with its accepted type", () => {
		const out = renderEntityFull({
			...idleShip,
			modules: [
				{ type: 4, installed: null },
				{ type: 8, installed: null },
			],
		});
		expect(out).toMatch(/#0 \(Loader\):\s+\(empty\)/);
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
			energy: 200,
			generator: { capacity: 350, recharge: 10 },
		});
		expect(out).toMatch(/Energy:\s+200\/350 \(recharge: 10\/s\)/);
		expect(out).not.toContain("→");
	});

	test("busy entity with elapsed task renders live-projected energy with arrow", () => {
		const out = renderEntityFull({
			...idleShip,
			is_idle: false,
			energy: 200,
			generator: { capacity: 350, recharge: 10 },
			current_task: {
				type: 5,
				duration: 60,
				cancelable: 0,
				cargo: [],
				energy_cost: 60,
			},
			current_task_elapsed: 10,
			current_task_remaining: 50,
		});
		expect(out).toMatch(/Energy:\s+200 → /);
		expect(out).toContain("/350 (live, recharge: 10/s)");
	});
});

describe("renderEntityFull projection labels", () => {
	test("ctx with projected.energy and label='live' renders → with (live, ...)", () => {
		const ctx: HeaderContext = {
			projected: { energy: UInt64.from(87) },
			projectionLabel: "live",
		};
		const out = renderEntityFull(
			{
				...idleShip,
				energy: 100,
				generator: { capacity: 200, recharge: 5 },
			},
			ctx,
		);
		expect(out).toContain("100 → 87/200 (live, recharge: 5/s)");
	});

	test("ctx with projected.energy and label='projected' renders → with (projected, ...)", () => {
		const ctx: HeaderContext = {
			projected: { energy: UInt64.from(50) },
			projectionLabel: "projected",
		};
		const out = renderEntityFull(
			{
				...idleShip,
				energy: 100,
				generator: { capacity: 200, recharge: 5 },
			},
			ctx,
		);
		expect(out).toContain("100 → 50/200 (projected, recharge: 5/s)");
	});

	test("no ctx: idle entity renders static energy", () => {
		const out = renderEntityFull({
			...idleShip,
			energy: 100,
			generator: { capacity: 200, recharge: 5 },
		});
		expect(out).toContain("100/200 (recharge: 5/s)");
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
		const busy = {
			...idleShip,
			is_idle: false,
			current_task: {
				type: TaskType.TRAVEL,
				coordinates: { x: 5n, y: 5n },
				cargo: [],
			},
			current_task_remaining: 60,
		};
		const out = renderEntityHeader(busy);
		expect(out).toContain("Task:");
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
	return ServerContract.Types.entity_info.from({
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
		pending_tasks: opts.pending_tasks ?? [],
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
	const totalDurationS = [opts.current_task, ...(opts.pending_tasks ?? [])].reduce(
		(sum, t) => sum + Number(t.duration.toString()),
		0,
	);
	const allTasks = [opts.current_task, ...(opts.pending_tasks ?? [])];
	return ServerContract.Types.entity_info.from({
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
		pending_tasks: opts.pending_tasks ?? [],
		schedule: {
			started: TimePoint.fromMilliseconds(startedMs),
			tasks: allTasks,
		},
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
			cargomass: 10 * 52_000,
			capacity: 4_000_000_000,
			current_task: busyTask(TaskType.UNDEPLOY, 60, []),
		});
		const out = renderEntityFull(entity);
		expect(out).not.toMatch(/When done/);
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
