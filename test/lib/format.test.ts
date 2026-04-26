import { describe, expect, test } from "bun:test";
import { encodeStats, TaskType } from "@shipload/sdk";
import { Checksum256, UInt64 } from "@wharfkit/antelope";
import {
	formatCargo,
	formatCategory,
	formatEntity,
	formatInstallHint,
	formatLiveEnergy,
	formatLocation,
	formatOutput,
	formatReserve,
	formatResolveHint,
	formatStats,
	formatTier,
	typeLabel,
} from "../../src/lib/format";

describe("formatStats", () => {
	test("returns empty string for 0", () => {
		expect(formatStats(0n)).toBe("");
	});

	test("decodes packed uint64 into slash-separated stats", () => {
		const packed = encodeStats([100, 200, 300]);
		expect(formatStats(packed)).toBe("100/200/300");
	});

	test("accepts bigint, number, and string inputs", () => {
		const packed = encodeStats([50, 60, 70]);
		expect(formatStats(packed)).toBe("50/60/70");
		expect(formatStats(Number(packed))).toBe("50/60/70");
		expect(formatStats(String(packed))).toBe("50/60/70");
	});

	test("pads to at least 3 stats, trims trailing zeros above 3", () => {
		const packed = encodeStats([1, 2, 0]);
		expect(formatStats(packed)).toBe("1/2/0");
	});

	test("shows extra stats beyond 3 when present", () => {
		const packed = encodeStats([1, 2, 3, 4, 5]);
		expect(formatStats(packed)).toBe("1/2/3/4/5");
	});

	test("labels stats with category abbreviations when itemId is a known resource", () => {
		const packed = encodeStats([276, 198, 234]);
		expect(formatStats(packed, 501)).toBe("PLA 276 / INS 198 / SAT 234");
	});

	test("labels ore with ore abbreviations", () => {
		const packed = encodeStats([500, 400, 300]);
		expect(formatStats(packed, 101)).toBe("STR 500 / TOL 400 / DEN 300");
	});

	test("falls back to slash-joined values for unknown itemId", () => {
		const packed = encodeStats([1, 2, 3]);
		expect(formatStats(packed, 99999)).toBe("1/2/3");
	});
});

describe("formatEntity modules", () => {
	const base = {
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

	test("renders gatherer with full values when installed", () => {
		const out = formatEntity({
			...base,
			gatherer: { depth: 100, yield: 700, drain: 25, speed: 500 },
		});
		expect(out).toMatch(/Gatherer:\s+depth 100 · yield 700 · speed 500 · 25 energy\/s/);
	});

	test("renders zero-valued slot to distinguish from absent", () => {
		const out = formatEntity({ ...base, warp: { range: 0 } });
		expect(out).toMatch(/Warp:\s+range 0/);
		expect(out).not.toMatch(/Warp:\s+— \(not installed\)/);
	});

	test("renders absent slots as — (not installed)", () => {
		const out = formatEntity({ ...base });
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
		const out = formatEntity({
			...base,
			schedule: {
				started: { toDate: () => new Date() },
				tasks: [completedCraft],
			},
		});
		expect(out).not.toMatch(/When done/);
	});
});

describe("formatLocation with reach", () => {
	const gameSeed = Checksum256.from(
		"0000000000000000000000000000000000000000000000000000000000000000",
	);
	const epochSeed = Checksum256.from(
		"1111111111111111111111111111111111111111111111111111111111111111",
	);

	// biome-ignore lint/suspicious/noExplicitAny: stub for location_info
	const loc: any = { coords: { x: 0n, y: 0n }, is_system: true };

	test("without reach, output shape is unchanged (no reach tokens)", () => {
		const out = formatLocation(loc, gameSeed, epochSeed);
		expect(out).toContain("Location (0, 0)");
		expect(out).not.toContain("Top reachable");
		expect(out).not.toContain("Top overall");
	});

	test("with reach, swaps Top strata for Top reachable (or shows no-reachable message)", () => {
		const out = formatLocation(loc, gameSeed, epochSeed, { depth: 100, showAll: false });
		expect(out).not.toContain("Top strata:");
		expect(out).toMatch(/Top reachable|no reachable strata/);
	});

	test("with reach + showAll, always includes Top overall block if any strata exist", () => {
		const out = formatLocation(loc, gameSeed, epochSeed, { depth: 100, showAll: true });
		expect(out).toMatch(/Top reachable|no reachable strata/);
		expect(out.includes("Top overall") || out.includes("no reachable strata")).toBe(true);
	});
});

describe("formatOutput", () => {
	test("returns pretty output when json is falsy", () => {
		const out = formatOutput({ a: 1 }, { json: false }, (d) => `pretty: ${d.a}`);
		expect(out).toBe("pretty: 1");
	});
	test("returns JSON string when json is true", () => {
		const out = formatOutput({ a: 1, big: 9n }, { json: true }, () => "unused");
		expect(JSON.parse(out)).toEqual({ a: 1, big: "9" });
	});
	test("JSON output round-trips deeply-nested BigInts", () => {
		const data = { level: { list: [1n, 2n, { inner: 3n }] } };
		const out = formatOutput(data, { json: true }, () => "unused");
		expect(JSON.parse(out)).toEqual({ level: { list: ["1", "2", { inner: "3" }] } });
	});
});

describe("formatCategory", () => {
	test("returns SDK label for known enum int", () => {
		// contract enum: ORE=0, GAS=1, REGOLITH=2, BIOMASS=3, CRYSTAL=4
		expect(formatCategory(0)).toBe("Ore");
		expect(formatCategory(4)).toBe("Crystal");
		expect(formatCategory(1)).toBe("Gas");
		expect(formatCategory(2)).toBe("Regolith");
		expect(formatCategory(3)).toBe("Biomass");
	});
	test("falls back to 'category N' for unknown value", () => {
		expect(formatCategory(99)).toBe("category 99");
	});
});

describe("formatTier", () => {
	test("returns Tn for 1-based tier", () => {
		expect(formatTier(1)).toBe("T1");
		expect(formatTier(10)).toBe("T10");
	});
});

describe("formatInstallHint", () => {
	test("emits install command referencing entity and slot", () => {
		const hint = formatInstallHint("ship", 1n, 2, "Crafter");
		expect(hint).toContain("ship 1 addmodule 2");
		expect(hint).toContain("Crafter");
	});
});

describe("formatResolveHint", () => {
	test("emits resolve command + count", () => {
		const h = formatResolveHint("ship", 1n, 3);
		expect(h).toContain("shiploadcli ship 1 resolve");
		expect(h).toContain("3 completed");
	});
});

describe("formatLiveEnergy", () => {
	test("no active task → stored value with no projection", () => {
		expect(formatLiveEnergy({ storedEnergy: 200, capacity: 350, recharge: 10 })).toBe(
			"200/350 (recharge: 10/s)",
		);
	});

	test("active task projects live value with recharge only", () => {
		const started = new Date("2026-04-22T18:00:00Z");
		const now = new Date("2026-04-22T18:00:10Z");
		const out = formatLiveEnergy({
			storedEnergy: 200,
			capacity: 350,
			recharge: 10,
			activeTaskStartedAt: started,
			now,
		});
		expect(out).toContain("200 → ");
		expect(out).toContain("/350");
		expect(out).toContain("300/350");
	});

	test("active task with drain clamps at zero", () => {
		const started = new Date("2026-04-22T18:00:00Z");
		const now = new Date("2026-04-22T18:01:00Z");
		const out = formatLiveEnergy({
			storedEnergy: 10,
			capacity: 350,
			recharge: 0,
			drainPerSec: 5,
			activeTaskStartedAt: started,
			now,
		});
		expect(out).toContain("0/350");
	});

	test("projection clamps at capacity", () => {
		const started = new Date("2026-04-22T18:00:00Z");
		const now = new Date("2026-04-22T18:10:00Z");
		const out = formatLiveEnergy({
			storedEnergy: 200,
			capacity: 350,
			recharge: 10,
			activeTaskStartedAt: started,
			now,
		});
		expect(out).toContain("350/350");
	});

	test("combined drain and regen produces net projection", () => {
		const started = new Date("2026-04-22T18:00:00Z");
		const now = new Date("2026-04-22T18:00:10Z");
		const out = formatLiveEnergy({
			storedEnergy: 200,
			capacity: 350,
			recharge: 10,
			drainPerSec: 5,
			activeTaskStartedAt: started,
			now,
		});
		// 200 + 10*10 - 5*10 = 250
		expect(out).toContain("250/350");
	});
});

describe("formatEntity live energy", () => {
	const base = {
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

	test("idle entity renders energy in stored form (no arrow)", () => {
		const out = formatEntity({
			...base,
			energy: 200,
			generator: { capacity: 350, recharge: 10 },
		});
		expect(out).toMatch(/Energy:\s+200\/350 \(recharge: 10\/s\)/);
		expect(out).not.toContain("→");
	});

	test("busy entity renders live-projected energy with arrow", () => {
		const out = formatEntity({
			...base,
			is_idle: false,
			energy: 200,
			generator: { capacity: 350, recharge: 10 },
			current_task: {
				type: 5, // gather
				duration: 60,
				cancelable: 0,
				cargo: [],
				energy_cost: 60,
			},
			current_task_elapsed: 0,
			current_task_remaining: 60,
		});
		expect(out).toMatch(/Energy:\s+200 → /);
		expect(out).toContain("/350 (live, recharge: 10/s)");
	});
});

describe("typeLabel", () => {
	test("decodes the item-type enum (0=Resource 1=Component 2=Module 3=Entity)", () => {
		expect(typeLabel(0)).toBe("Resource");
		expect(typeLabel(1)).toBe("Component");
		expect(typeLabel(2)).toBe("Module");
		expect(typeLabel(3)).toBe("Entity");
		expect(typeLabel(99)).toBe("type 99");
	});
});

describe("formatReserve", () => {
	test("returns single value when reserve equals reserve_max", () => {
		expect(formatReserve(820, 820)).toBe("820");
	});
	test("returns remaining/max with percentage when depleted", () => {
		expect(formatReserve(56, 820)).toBe("56/820 (7%)");
	});
	test("fully depleted shows 0/max (0%)", () => {
		expect(formatReserve(0, 820)).toBe("0/820 (0%)");
	});
	test("handles reserve_max of 0 gracefully", () => {
		expect(formatReserve(0, 0)).toBe("0");
	});
});

describe("formatEntity — empty name", () => {
	const base = {
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
		const out = formatEntity({ ...base, entity_name: "" });
		expect(out).toContain("container 2 owned by");
		expect(out).not.toContain('""');
	});

	test("omits quoted name when entity_name is whitespace only", () => {
		const out = formatEntity({ ...base, entity_name: "   " });
		expect(out).toContain("container 2 owned by");
		expect(out).not.toContain('"');
	});

	test("includes quoted name when entity_name is present", () => {
		const out = formatEntity({ ...base, entity_name: "Test Box" });
		expect(out).toContain('container 2 "Test Box" owned by');
	});
});

describe("formatCargo stats suffix", () => {
	test("appends stats=<uint> to each stack line", () => {
		const cargo = [{ item_id: 201, quantity: 45, stats: 251479207179n, modules: [] } as any];
		const out = formatCargo(cargo);
		expect(out).toContain("stats=251479207179");
	});
	test("stats=0 still rendered so the discriminator is always visible", () => {
		const cargo = [{ item_id: 10200, quantity: 1, stats: 0n, modules: [] } as any];
		const out = formatCargo(cargo);
		expect(out).toContain("stats=0");
	});
});
