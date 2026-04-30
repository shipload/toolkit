import { describe, expect, test } from "bun:test";
import { TaskType } from "@shipload/sdk";
import { UInt64 } from "@wharfkit/antelope";
import {
	type HeaderContext,
	renderEntityFull,
	renderEntityHeader,
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
	test("renders gatherer with full values when installed", () => {
		const out = renderEntityFull({
			...idleShip,
			gatherer: { depth: 100, yield: 700, drain: 25, speed: 500 },
		});
		expect(out).toMatch(/Gatherer:\s+depth 100 · yield 700 · speed 500 · 25 energy\/s/);
	});

	test("renders zero-valued slot to distinguish from absent", () => {
		const out = renderEntityFull({ ...idleShip, warp: { range: 0 } });
		expect(out).toMatch(/Warp:\s+range 0/);
		expect(out).not.toMatch(/Warp:\s+— \(not installed\)/);
	});

	test("renders absent slots as — (not installed)", () => {
		const out = renderEntityFull({ ...idleShip });
		expect(out).toMatch(/Gatherer:\s+— \(not installed\)/);
		expect(out).toMatch(/Hauler:\s+— \(not installed\)/);
		expect(out).toMatch(/Warp:\s+— \(not installed\)/);
		expect(out).toMatch(/Crafter:\s+— \(not installed\)/);
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
