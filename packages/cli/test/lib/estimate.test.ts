import { describe, expect, test } from "bun:test";
import {
	calc_acceleration,
	calc_travel_flighttime,
	type CargoInput,
	cargoInputKey,
	distanceBetweenPoints,
	getItem,
	cargoKey,
	HoldKind,
	type IncomingSource,
	laneKeyForModule,
	projectedCargoAvailableAt,
	ServerTypes,
	TaskType,
} from "@shipload/sdk";
import {
	buildIncomingSources,
	computeCraftCargoDelta,
	computeFlightDurationSeconds,
	computeGatherCargoDelta,
	estimateCraft,
	estimateGroupTravel,
	type EstimateResult,
	estimateGatherFromStratum,
	estimateTravel,
	populateCraftFeasibility,
	populateGatherFeasibility,
	populateTravelFeasibility,
} from "../../src/lib/estimate";
import { renderEstimate } from "../../src/lib/render-estimate";

describe("computeFlightDurationSeconds", () => {
	test("returns 0 when distance is zero", () => {
		expect(computeFlightDurationSeconds(0, 1000)).toBe(0);
	});
	test("returns 0 when acceleration is zero or negative", () => {
		expect(computeFlightDurationSeconds(10_000, 0)).toBe(0);
		expect(computeFlightDurationSeconds(10_000, -5)).toBe(0);
	});
	test("uses 2*sqrt(d/a) up to the 2*PRECISION cruise transition", () => {
		expect(computeFlightDurationSeconds(10_000, 100)).toBe(20);
		expect(computeFlightDurationSeconds(20_000, 1)).toBe(282);
	});
	test("adds the cruise phase past 2*PRECISION, matching calc_travel_flighttime", () => {
		expect(computeFlightDurationSeconds(40_000, 1)).toBe(424);
		expect(computeFlightDurationSeconds(1_000_000, 100)).toBe(721);
	});
	test("accepts bigint distance", () => {
		expect(computeFlightDurationSeconds(10_000n, 100)).toBe(20);
	});
});

describe("computeGatherCargoDelta", () => {
	test("returns +quantity for the item id", () => {
		expect(computeGatherCargoDelta(45, 16)).toEqual({ 45: 16 });
	});
	test("returns empty for non-positive quantity or item id", () => {
		expect(computeGatherCargoDelta(45, 0)).toEqual({});
		expect(computeGatherCargoDelta(0, 16)).toEqual({});
		expect(computeGatherCargoDelta(45, -5)).toEqual({});
	});
});

describe("computeCraftCargoDelta", () => {
	test("inputs negative and output positive", () => {
		const d = computeCraftCargoDelta(
			[
				{ itemId: 101, quantity: 15 },
				{ itemId: 102, quantity: 5 },
			],
			200,
			1,
		);
		expect(d).toEqual({ 101: -15, 102: -5, 200: 1 });
	});
	test("aggregates duplicate input item ids", () => {
		const d = computeCraftCargoDelta(
			[
				{ itemId: 101, quantity: 10 },
				{ itemId: 101, quantity: 5 },
			],
			200,
			1,
		);
		expect(d).toEqual({ 101: -15, 200: 1 });
	});
	test("omits output when outputItemId is 0", () => {
		const d = computeCraftCargoDelta([{ itemId: 101, quantity: 10 }], 0, 1);
		expect(d).toEqual({ 101: -10 });
	});
});

describe("renderEstimate", () => {
	test("formats travel estimate (no cargo delta)", () => {
		const out = renderEstimate({
			duration_s: 47,
			energy_cost: 43_000,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
		});
		expect(out).toBe("Estimate: duration 47s, energy -43");
	});
	test("formats gather estimate with cargo delta", () => {
		const out = renderEstimate({
			duration_s: 120,
			energy_cost: 30_000,
			cargo_delta: { 45: 16 },
			feasibility: { ok: true, issues: [] },
		});
		expect(out).toContain("duration 2m");
		expect(out).toContain("energy -30");
		expect(out).toContain("+16");
	});
	test("omits energy line when energy_cost is zero", () => {
		const out = renderEstimate({
			duration_s: 10,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
		});
		expect(out).toBe("Estimate: duration 10s");
	});
	test("formats hours for long durations", () => {
		const out = renderEstimate({
			duration_s: 7200,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
		});
		expect(out).toContain("duration 2h");
	});
});

describe("EstimateResult has feasibility", () => {
	test("default shape includes feasibility.ok and issues", () => {
		const result: EstimateResult = {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
		};
		expect(result.feasibility.ok).toBe(true);
		expect(result.feasibility.issues).toEqual([]);
	});
});

describe("populateTravelFeasibility", () => {
	test("flags energy_capacity_exceeded when energy_cost > generator capacity", () => {
		const issues = populateTravelFeasibility({
			generatorCapacity: 383,
			currentEnergy: 383,
			energyCost: 387,
			flightSeconds: 100,
			originX: 0,
			originY: 0,
			targetX: 10,
			targetY: 0,
		});
		expect(issues.some((i) => i.code === "energy_capacity_exceeded")).toBe(true);
	});
	test("flags insufficient_energy when current < cost but cost fits capacity", () => {
		const issues = populateTravelFeasibility({
			generatorCapacity: 500,
			currentEnergy: 82,
			energyCost: 200,
			flightSeconds: 100,
			originX: 0,
			originY: 0,
			targetX: 10,
			targetY: 0,
		});
		expect(issues.some((i) => i.code === "insufficient_energy")).toBe(true);
		expect(issues.some((i) => i.code === "energy_capacity_exceeded")).toBe(false);
	});
	test("returns empty when feasible", () => {
		const issues = populateTravelFeasibility({
			generatorCapacity: 500,
			currentEnergy: 400,
			energyCost: 200,
			flightSeconds: 100,
			originX: 0,
			originY: 0,
			targetX: 10,
			targetY: 0,
		});
		expect(issues).toEqual([]);
	});
});

describe("populateTravelFeasibility — willRechargeFirst", () => {
	test("with willRechargeFirst=true and current<cost<=capacity, no insufficient_energy issue", () => {
		const issues = populateTravelFeasibility({
			generatorCapacity: 700,
			currentEnergy: 82,
			energyCost: 690,
			flightSeconds: 60,
			originX: 0,
			originY: 0,
			targetX: 5,
			targetY: 5,
			willRechargeFirst: true,
		});
		expect(issues.find((i) => i.code === "insufficient_energy")).toBeUndefined();
	});
	test("with willRechargeFirst=true but cost>capacity, still flags energy_capacity_exceeded", () => {
		const issues = populateTravelFeasibility({
			generatorCapacity: 500,
			currentEnergy: 500,
			energyCost: 690,
			flightSeconds: 60,
			originX: 0,
			originY: 0,
			targetX: 5,
			targetY: 5,
			willRechargeFirst: true,
		});
		expect(issues.find((i) => i.code === "energy_capacity_exceeded")).toBeDefined();
	});
	test("with willRechargeFirst omitted (false) and current<cost, flags insufficient_energy", () => {
		const issues = populateTravelFeasibility({
			generatorCapacity: 700,
			currentEnergy: 82,
			energyCost: 690,
			flightSeconds: 60,
			originX: 0,
			originY: 0,
			targetX: 5,
			targetY: 5,
		});
		expect(issues.find((i) => i.code === "insufficient_energy")).toBeDefined();
	});
});

describe("populateGatherFeasibility", () => {
	test("flags capacity before energy — root-cause ordering", () => {
		const issues = populateGatherFeasibility({
			generatorCapacity: 383,
			currentEnergy: 82,
			energyCost: 690,
			availableCargo: 100000,
			cargoDelta: 500,
			reserveRemaining: 56,
			quantity: 34,
		});
		expect(issues[0].code).toBe("energy_capacity_exceeded");
	});
	test("flags reserve depletion", () => {
		const issues = populateGatherFeasibility({
			generatorCapacity: 500,
			currentEnergy: 400,
			energyCost: 100,
			availableCargo: 100000,
			cargoDelta: 500,
			reserveRemaining: 12,
			quantity: 34,
		});
		expect(issues.some((i) => i.code === "insufficient_reserve")).toBe(true);
	});
	test("flags cargo capacity overflow", () => {
		const issues = populateGatherFeasibility({
			generatorCapacity: 500,
			currentEnergy: 400,
			energyCost: 100,
			availableCargo: 100,
			cargoDelta: 500,
			reserveRemaining: 100,
			quantity: 10,
		});
		expect(issues.some((i) => i.code === "insufficient_cargo_capacity")).toBe(true);
	});
});

describe("populateGatherFeasibility — willRechargeFirst", () => {
	test("with willRechargeFirst=true and current<cost<=capacity, no insufficient_energy", () => {
		const issues = populateGatherFeasibility({
			generatorCapacity: 700,
			currentEnergy: 82,
			energyCost: 690,
			availableCargo: 10000,
			cargoDelta: 100,
			reserveRemaining: 100,
			quantity: 10,
			willRechargeFirst: true,
		});
		expect(issues.find((i) => i.code === "insufficient_energy")).toBeUndefined();
	});
	test("with willRechargeFirst=true but cost>capacity, still flags capacity", () => {
		const issues = populateGatherFeasibility({
			generatorCapacity: 500,
			currentEnergy: 500,
			energyCost: 690,
			availableCargo: 10000,
			cargoDelta: 100,
			reserveRemaining: 100,
			quantity: 10,
			willRechargeFirst: true,
		});
		expect(issues.find((i) => i.code === "energy_capacity_exceeded")).toBeDefined();
	});
});

describe("populateCraftFeasibility", () => {
	test("flags capacity before energy", () => {
		const issues = populateCraftFeasibility({
			generatorCapacity: 383,
			currentEnergy: 383,
			energyCost: 500,
			availableCargo: 1000,
			cargoDelta: 200,
		});
		expect(issues[0].code).toBe("energy_capacity_exceeded");
	});
	test("flags cargo when mass_delta > 0 and exceeds available", () => {
		const issues = populateCraftFeasibility({
			generatorCapacity: 500,
			currentEnergy: 500,
			energyCost: 100,
			availableCargo: 100,
			cargoDelta: 500,
		});
		expect(issues.some((i) => i.code === "insufficient_cargo_capacity")).toBe(true);
	});
});

describe("populateCraftFeasibility — willRechargeFirst", () => {
	test("with willRechargeFirst=true, no insufficient_energy when cost fits capacity", () => {
		const issues = populateCraftFeasibility({
			generatorCapacity: 700,
			currentEnergy: 82,
			energyCost: 600,
			availableCargo: 10000,
			cargoDelta: 100,
			willRechargeFirst: true,
		});
		expect(issues.find((i) => i.code === "insufficient_energy")).toBeUndefined();
	});
});

import { pickGathererLane, type GathererLaneInput } from "../../src/lib/estimate";

describe("pickGathererLane — depth-aware auto-selection", () => {
	const makeLane = (depth: number, slotIndex: number = 0): GathererLaneInput => ({
		slotIndex,
		yield: 300,
		drain: 500,
		depth,
		outputPct: 100,
	});

	test("picks the single reaching lane", () => {
		const result = pickGathererLane([makeLane(510, 0)], [], 0);
		expect(result.slotIndex).toBe(0);
	});

	test("picks the first free lane that reaches stratum among multiple", () => {
		const lanes = [makeLane(510, 0), makeLane(2000, 1), makeLane(510, 2)];
		const result = pickGathererLane(lanes, [], 1000);
		expect(result.slotIndex).toBe(1);
	});

	test("picks a higher-slot reaching lane when the lower-slot lane is too shallow", () => {
		// slot 0 is shallow (510 < 1500), slot 1 reaches (2000 >= 1500).
		const lanes = [makeLane(510, 0), makeLane(2000, 1)];
		const result = pickGathererLane(lanes, [], 1500);
		expect(result.slotIndex).toBe(1);
		expect(result.depth).toBe(2000);
	});

	test("skips a busy reaching lane and returns a later free reaching lane", () => {
		// both reach 1500; slot 0 (lane_key 1) is busy, slot 1 (lane_key 2) is free.
		const lanes = [makeLane(2000, 0), makeLane(2000, 1)];
		const busyLaneKeys = [laneKeyForModule(0)];
		const result = pickGathererLane(lanes, busyLaneKeys, 1500);
		expect(result.slotIndex).toBe(1);
	});

	test("is insensitive to input array order (sorts by slotIndex)", () => {
		// Lanes supplied out of slot order; lower slot is busy, higher is free.
		const lanes = [makeLane(2000, 2), makeLane(2000, 0), makeLane(2000, 1)];
		const busyLaneKeys = [laneKeyForModule(0)];
		// First free reaching lane in slot order is slot 1.
		const result = pickGathererLane(lanes, busyLaneKeys, 1500);
		expect(result.slotIndex).toBe(1);
	});

	test("falls back to the lowest-slot reaching lane when all reaching lanes are busy", () => {
		// Supplied out of order; all reaching lanes busy → lowest slot index reaching wins.
		const lanes = [makeLane(2000, 2), makeLane(2000, 0), makeLane(2000, 1)];
		const busyLaneKeys = [laneKeyForModule(0), laneKeyForModule(1), laneKeyForModule(2)];
		const result = pickGathererLane(lanes, busyLaneKeys, 1500);
		expect(result.slotIndex).toBe(0);
	});

	test("throws 'no gatherer reaches this stratum' when depth < stratum on all lanes", () => {
		expect(() =>
			pickGathererLane([makeLane(510, 0)], [], 9999),
		).toThrow("no gatherer reaches this stratum");
	});
});

describe("estimateTravel projection", () => {
	test("does not crash when snapshot.schedule contains completed CRAFT lingering for resolve", async () => {
		// Mirrors the ship 3 repro: cargo already projected forward through completed CRAFT,
		// schedule still has the task. Without the fix, projectEntity re-applies the CRAFT
		// against post-craft cargo and throws INSUFFICIENT_ITEM_QUANTITY.
		const stats = {
			toString: () => "0",
			equals: (o: { toString(): string }) => o.toString() === "0",
		};
		const snap = {
			type: "ship",
			id: 1n,
			owner: "agent.gm",
			entity_name: "Test Ship",
			coordinates: { x: 0n, y: 0n },
			cargomass: 0,
			cargo: [],
			capacity: 1000n,
			energy: 100,
			hullmass: 1000n,
			engines: { thrust: 1000, drain: 1 },
			generator: { capacity: 100, recharge: 1 },
			is_idle: true,
			current_task_elapsed: 0,
			current_task_remaining: 0,
			pending_tasks: [],
			schedule: {
				started: { toMilliseconds: () => Date.now() - 600_000 },
				tasks: [
					{
						type: { toNumber: () => TaskType.CRAFT },
						duration: { toNumber: () => 60 },
						cargo: [
							{ item_id: 101, quantity: 5, stats, modules: [] },
							{ item_id: 102, quantity: 1, stats, modules: [] },
						],
					},
				],
			},
			// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
		} as any;
		const est = await estimateTravel({
			entityType: "ship",
			entityId: 1n,
			target: { x: 100, y: 100 },
			snapshot: snap,
			hasSystemAtDestination: true,
		});
		expect(est.travel?.origin).toEqual({ x: 0, y: 0 });
	});
});

describe("estimateGatherFromStratum — gatherplan model", () => {
	const RICHNESS = 500;
	const STRATUM = 100;
	const ORE = 101;
	const CAPACITY = 1_406_000n;

	function gatherSnap(overrides: Record<string, unknown> = {}) {
		return {
			type: "ship",
			id: 39n,
			owner: "agent.gm",
			entity_name: "Test Gatherer",
			coordinates: { x: 0n, y: 0n },
			cargomass: 0n,
			cargo: [],
			capacity: 10_000_000n,
			energy: 1_406_000n,
			generator: { capacity: CAPACITY, recharge: 2n },
			gatherer_lanes: [
				{ slot_index: 2, yield: 510, drain: 2_500_000, depth: 5495, output_pct: 100 },
				{ slot_index: 3, yield: 510, drain: 2_500_000, depth: 5495, output_pct: 100 },
			],
			crafter_lanes: [],
			builder_lanes: [],
			loader_lanes: [],
			is_idle: true,
			lanes: [],
			holds: [],
			...overrides,
			// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
		} as any;
	}

	function estimate(overrides: Record<string, unknown> = {}, quantity = 8000, recharge = true) {
		return estimateGatherFromStratum({
			snapshot: gatherSnap(overrides),
			entityId: 39n,
			stratum: STRATUM,
			quantity,
			itemId: ORE,
			richness: RICHNESS,
			reserveRemaining: 1_000_000,
			recharge,
		});
	}

	test("multi-charge fill plans cycles with recharges and stays feasible with recharge=true", () => {
		const est = estimate();
		expect(est.gather?.limpets).toBe(2);
		expect(est.gather!.cycles).toBeGreaterThan(1);
		expect(est.gather!.recharges).toBe(est.gather!.cycles - 1);
		expect(est.energy_cost).toBeGreaterThan(Number(CAPACITY));
		expect(est.duration_s).toBeGreaterThan(0);
		expect(est.with_recharge).toBe(true);
		expect(est.feasibility.ok).toBe(true);
	});

	test("multi-charge fill without recharge reports insufficient_energy", () => {
		const est = estimate({}, 8000, false);
		expect(est.feasibility.ok).toBe(false);
		expect(est.feasibility.issues.some((i) => i.code === "insufficient_energy")).toBe(true);
	});

	test("single affordable cycle needs no recharge either way", () => {
		const est = estimate({}, 100, false);
		expect(est.gather?.cycles).toBe(1);
		expect(est.gather?.recharges).toBe(0);
		expect(est.with_recharge).toBe(false);
		expect(est.feasibility.ok).toBe(true);
	});

	test("parallel limpets beat the single-lane serial duration", () => {
		const twoLanes = estimate({}, 100, false);
		const oneLane = estimateGatherFromStratum({
			snapshot: gatherSnap({
				gatherer_lanes: [
					{ slot_index: 2, yield: 510, drain: 2_500_000, depth: 5495, output_pct: 100 },
				],
			}),
			entityId: 39n,
			stratum: STRATUM,
			quantity: 100,
			itemId: ORE,
			richness: RICHNESS,
			reserveRemaining: 1_000_000,
			recharge: false,
		});
		expect(twoLanes.duration_s).toBeLessThan(oneLane.duration_s);
	});

	test("only reaching limpets deploy", () => {
		const est = estimateGatherFromStratum({
			snapshot: gatherSnap({
				gatherer_lanes: [
					{ slot_index: 2, yield: 510, drain: 2_500_000, depth: 5495, output_pct: 100 },
					{ slot_index: 3, yield: 510, drain: 2_500_000, depth: 50, output_pct: 100 },
				],
			}),
			entityId: 39n,
			stratum: STRATUM,
			quantity: 100,
			itemId: ORE,
			richness: RICHNESS,
			reserveRemaining: 1_000_000,
			recharge: true,
		});
		expect(est.gather?.limpets).toBe(1);
	});

	test("reserve and cargo caps surface as feasibility issues on the full request", () => {
		const overReserve = estimateGatherFromStratum({
			snapshot: gatherSnap(),
			entityId: 39n,
			stratum: STRATUM,
			quantity: 100,
			itemId: ORE,
			richness: RICHNESS,
			reserveRemaining: 50,
			recharge: true,
		});
		expect(overReserve.feasibility.ok).toBe(false);
		expect(overReserve.feasibility.issues.some((i) => i.code.includes("reserve"))).toBe(true);

		const overCargo = estimate({ capacity: 10n }, 100, true);
		expect(overCargo.feasibility.ok).toBe(false);
		expect(overCargo.feasibility.issues.some((i) => i.code.includes("cargo"))).toBe(true);
	});

	test("no generator degrades to a zero estimate (preflight/chain surface it)", () => {
		const est = estimate({ generator: undefined }, 100, true);
		expect(est.duration_s).toBe(0);
		expect(est.feasibility.ok).toBe(true);
	});
});

describe("craft sufficiency keys match SDK availability keys", () => {
	const cases: { label: string; itemId: number; stats: bigint; modules: unknown[] }[] = [
		{ label: "plain input", itemId: 301, stats: 214202522n, modules: [] },
		{ label: "module-bearing input", itemId: 302, stats: 7n, modules: [{ type: 3 }] },
	];

	for (const { label, itemId, stats, modules } of cases) {
		test(label, () => {
			const entries = modules.map((m) => ServerTypes.module_entry.from(m));
			const input: CargoInput = { itemId, stats, modules: entries, quantity: 4 };
			const item = ServerTypes.cargo_item.from({
				item_id: itemId,
				stats,
				modules: entries,
				quantity: 4,
			});
			expect(cargoInputKey(input)).toBe(cargoKey(item));
			const avail = projectedCargoAvailableAt({ lanes: [], cargo: [item] }, new Date());
			expect(avail.get(cargoInputKey(input))).toBe(4n);
		});
	}
});

describe("estimateCraft — duration matches the SDK's calc_craft_duration", () => {
	test("mass 100 units at speed 500 -> floor(100*100/500)+1 = 21s", async () => {
		// item 101 (ore T1) mass = 10 units; 10 units of input -> totalInputMass = 100.
		const est = await estimateCraft({
			entityId: 5n,
			recipeId: 10003,
			quantity: 1,
			inputs: [{ itemId: 101, stackId: 0n, quantity: 10, modules: [] }],
			snapshot: {
				type: "ship",
				id: 5n,
				owner: "agent.gm",
				entity_name: "Test Crafter",
				coordinates: { x: 0n, y: 0n },
				cargomass: 0n,
				cargo: [],
				capacity: 10_000_000n,
				energy: 10_000_000n,
				generator: { capacity: 10_000_000n, recharge: 1n },
				crafter_lanes: [{ speed: 500, drain: 1 }],
				gatherer_lanes: [],
				builder_lanes: [],
				loader_lanes: [],
				is_idle: true,
				lanes: [],
				// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
			} as any,
			recipe: { output_item_id: 10003, inputs: [{ item_id: 101, quantity: 10 }] },
		});
		expect(est.duration_s).toBe(21);
	});
});

describe("estimateCraft — incoming cargo availability", () => {
	const INPUT_ITEM = 301;
	const OUTPUT_ITEM = 10003;
	const STATS = 214202522n;
	const NEEDED = 32;

	function craftSnap(overrides: Record<string, unknown> = {}) {
		return {
			type: "ship",
			id: 5n,
			owner: "agent.gm",
			entity_name: "Test Crafter",
			coordinates: { x: 0n, y: 0n },
			cargomass: 0n,
			cargo: [],
			capacity: 10_000_000n,
			energy: 10_000_000n,
			generator: { capacity: 10_000_000n, recharge: 1n },
			crafter_lanes: [{ speed: 100, drain: 1 }],
			gatherer_lanes: [],
			builder_lanes: [],
			loader_lanes: [],
			is_idle: true,
			lanes: [],
			...overrides,
			// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
		} as any;
	}

	const RECIPE = {
		output_item_id: OUTPUT_ITEM,
		inputs: [{ item_id: INPUT_ITEM, quantity: NEEDED }],
	};

	const inputs = [{ itemId: INPUT_ITEM, stackId: STATS, quantity: NEEDED, modules: [] }];

	test("shortfall with no incoming coverage stays infeasible", async () => {
		const est = await estimateCraft({
			entityId: 5n,
			recipeId: OUTPUT_ITEM,
			quantity: 1,
			inputs,
			snapshot: craftSnap(),
			recipe: RECIPE,
		});
		expect(est.feasibility.ok).toBe(false);
		expect(est.feasibility.issues.some((i) => i.code === "insufficient_cargo")).toBe(true);
	});

	test("incoming hold covering the shortfall makes the plan feasible and waits", async () => {
		const until = new Date(Date.now() + 5 * 60_000);
		const incoming: IncomingSource[] = [
			{
				holdId: "1",
				until,
				items: [
					ServerTypes.cargo_item.from({
						item_id: INPUT_ITEM,
						stats: STATS,
						modules: [],
						quantity: NEEDED,
					}),
				],
			},
		];
		const est = await estimateCraft({
			entityId: 5n,
			recipeId: OUTPUT_ITEM,
			quantity: 1,
			inputs,
			snapshot: craftSnap(),
			recipe: RECIPE,
			incoming,
		});
		expect(est.feasibility.ok).toBe(true);
		expect(est.craft?.waitsForIncoming).toBeDefined();
		expect(est.craft?.waitsForIncoming?.readyIn_s).toBeGreaterThan(250);
		expect(est.craft?.waitsForIncoming?.readyIn_s).toBeLessThan(320);
		expect(renderEstimate(est)).toContain("Waits for incoming cargo");
	});
});

describe("buildIncomingSources", () => {
	const RECEIVER = 5n;

	function makeHold(id: number, kind: number, counterpartId: number) {
		return ServerTypes.hold.from({
			id,
			kind,
			counterpart: { entity_type: "ship", entity_id: counterpartId },
			until: new Date(Date.now() + 60_000),
			incoming_mass: 0,
		});
	}

	function makeCounterpart(taskSpecs: { holdId: number; itemId: number; quantity: number }[]) {
		return {
			lanes: [
				ServerTypes.lane.from({
					lane_key: 0,
					schedule: {
						started: new Date(),
						tasks: taskSpecs.map((spec) => ({
							type: TaskType.UNLOAD,
							duration: 60,
							cancelable: 1,
							cargo: [
								{ item_id: spec.itemId, stats: 0, modules: [], quantity: spec.quantity },
							],
							couplings: [
								{
									counterpart: { entity_type: "ship", entity_id: RECEIVER },
									hold: spec.holdId,
									kind: HoldKind.PUSH,
								},
							],
						})),
					},
				}),
			],
		} as unknown as ServerTypes.entity_info;
	}

	test("fetches each distinct counterpart once and resolves every hold's manifest", async () => {
		const counterpart = makeCounterpart([
			{ holdId: 1, itemId: 301, quantity: 10 },
			{ holdId: 2, itemId: 302, quantity: 20 },
		]);
		const fetched: string[] = [];
		const sources = await buildIncomingSources(
			RECEIVER,
			[makeHold(1, HoldKind.PUSH, 9), makeHold(2, HoldKind.GATHER, 9)],
			async (id) => {
				fetched.push(id);
				return counterpart;
			},
		);
		expect(fetched).toEqual(["9"]);
		expect(sources.map((s) => s.holdId)).toEqual(["1", "2"]);
		expect(sources[0].items[0].item_id.toNumber()).toBe(301);
		expect(sources[1].items[0].item_id.toNumber()).toBe(302);
	});

	test("skips non-incoming holds without fetching their counterpart", async () => {
		const fetched: string[] = [];
		const sources = await buildIncomingSources(RECEIVER, [makeHold(3, HoldKind.PULL, 7)], async (id) => {
			fetched.push(id);
			return makeCounterpart([]);
		});
		expect(fetched).toEqual([]);
		expect(sources).toEqual([]);
	});

	test("skips holds whose counterpart has no matching coupling", async () => {
		const counterpart = makeCounterpart([{ holdId: 99, itemId: 301, quantity: 10 }]);
		const sources = await buildIncomingSources(
			RECEIVER,
			[makeHold(1, HoldKind.PUSH, 9)],
			async () => counterpart,
		);
		expect(sources).toEqual([]);
	});
});

describe("estimateGroupTravel — contract haul penalty and departure mass", () => {
	const NOW = new Date("2026-06-19T00:00:00.000Z");
	const TARGET = { x: 10, y: 0 };

	function startedAt(offsetS: number): string {
		return new Date(NOW.getTime() + offsetS * 1000).toISOString().slice(0, 23);
	}

	function shipSnap(overrides: Record<string, unknown> = {}) {
		return {
			type: "ship",
			id: 1n,
			owner: "agent.gm",
			entity_name: "Hauler",
			coordinates: { x: 0n, y: 0n },
			cargomass: 0n,
			cargo: [],
			capacity: 10_000_000n,
			energy: 1_000_000n,
			hullmass: 70_000n,
			engines: { thrust: 50_000n, drain: 1n },
			generator: { capacity: 1_000_000n, recharge: 1_000n },
			hauler: { capacity: 1n, efficiency: 5_000n, drain: 0n },
			gatherer_lanes: [],
			crafter_lanes: [],
			builder_lanes: [],
			loader_lanes: [],
			is_idle: true,
			lanes: [],
			holds: [],
			...overrides,
			// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
		} as any;
	}

	function containerSnap(overrides: Record<string, unknown> = {}) {
		return {
			type: "container",
			id: 2n,
			owner: "agent.gm",
			entity_name: "Box",
			coordinates: { x: 0n, y: 0n },
			cargomass: 0n,
			cargo: [],
			capacity: 10_000_000n,
			hullmass: 30_000n,
			gatherer_lanes: [],
			crafter_lanes: [],
			builder_lanes: [],
			loader_lanes: [],
			is_idle: true,
			lanes: [],
			holds: [],
			...overrides,
			// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
		} as any;
	}

	function group(snapshots: unknown[], recharge = false) {
		return estimateGroupTravel({
			entities: snapshots.map((_, i) => ({ entityId: BigInt(i + 1) })),
			target: TARGET,
			recharge,
			// biome-ignore lint/suspicious/noExplicitAny: stub snapshots
			snapshots: snapshots as any,
			hasSystemAtDestination: true,
			now: NOW,
		});
	}

	test("a destination without a system points at the lead ship's nearby command", async () => {
		const est = await estimateGroupTravel({
			entities: [{ entityId: 6n }],
			target: TARGET,
			// biome-ignore lint/suspicious/noExplicitAny: stub snapshots
			snapshots: [shipSnap({ id: 6n })] as any,
			hasSystemAtDestination: false,
			now: NOW,
		});
		const issue = est.feasibility.issues.find((i) => i.code === "no_system_at_destination");
		expect(issue?.message).toContain("`shiploadcli ship 6 nearby`");
	});

	test("one ship towing one container pays the haul penalty: 128s, not the bare-thrust 120s", async () => {
		const est = await group([shipSnap(), containerSnap()]);
		expect(est.duration_s).toBe(128);
		const bare = calc_travel_flighttime(
			distanceBetweenPoints(0, 0, TARGET.x, TARGET.y),
			calc_acceleration(50_000, 100_000),
		).toNumber();
		expect(bare).toBe(120);
	});

	test("a beam on a towed member adds nothing: same duration as an equal-mass member without one", async () => {
		const beam = { capacity: 4n, efficiency: 9_000n, drain: 0n };
		const withBeam = await group([shipSnap(), containerSnap({ hauler: beam })]);
		const plain = await group([shipSnap(), containerSnap()]);
		expect(withBeam.duration_s).toBe(plain.duration_s);
		expect(withBeam.feasibility.ok).toBe(true);
	});

	test("a tug without a beam cannot tow, even when the towed member carries one", async () => {
		const beam = { capacity: 4n, efficiency: 9_000n, drain: 0n };
		const est = await group([shipSnap({ hauler: undefined }), containerSnap({ hauler: beam })]);
		expect(est.feasibility.issues.map((i) => i.code)).toContain("insufficient_haul_capacity");
	});

	test("an in-flight load queued behind the departure still counts: duration equals the loaded-hold duration", async () => {
		const load = ServerTypes.lane.from({
			lane_key: 3,
			schedule: {
				started: startedAt(0),
				tasks: [
					{
						type: TaskType.LOAD,
						duration: 600,
						cancelable: 0,
						cargo: [{ item_id: 101, quantity: 5000, stats: 0, modules: [] }],
						couplings: [],
					},
				],
			},
		});
		const queued = await group([shipSnap({ lanes: [load] }), containerSnap()]);
		const loaded = await group([
			shipSnap({ cargomass: BigInt(getItem(101).mass * 5000) }),
			containerSnap(),
		]);
		const empty = await group([shipSnap(), containerSnap()]);
		expect(queued.duration_s).toBe(loaded.duration_s);
		expect(queued.duration_s).toBeGreaterThan(empty.duration_s);
	});

	test("recharge time reads the energy left after the queue: a finished recharge makes it zero", async () => {
		const finishedRecharge = ServerTypes.lane.from({
			lane_key: 255,
			schedule: {
				started: startedAt(-600),
				tasks: [{ type: TaskType.RECHARGE, duration: 5, cancelable: 0, cargo: [], couplings: [] }],
			},
		});
		const drained = shipSnap({ energy: 0n, lanes: [finishedRecharge] });
		const est = await group([drained, containerSnap()], true);
		const plain = await group([shipSnap({ energy: 0n }), containerSnap()], true);
		expect(plain.duration_s - est.duration_s).toBe(1_000);
	});
});

describe("estimateTravel — contract departure mass and projected recharge", () => {
	const NOW = new Date("2026-06-19T00:00:00.000Z");

	function snap(overrides: Record<string, unknown> = {}) {
		return {
			type: "ship",
			id: 1n,
			owner: "agent.gm",
			entity_name: "Solo",
			coordinates: { x: 0n, y: 0n },
			cargomass: 0n,
			cargo: [],
			capacity: 10_000_000n,
			energy: 0n,
			hullmass: 100_000n,
			engines: { thrust: 50_000n, drain: 1n },
			generator: { capacity: 1_000_000n, recharge: 1_000n },
			gatherer_lanes: [],
			crafter_lanes: [],
			builder_lanes: [],
			loader_lanes: [],
			is_idle: true,
			lanes: [],
			holds: [],
			...overrides,
			// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
		} as any;
	}

	test("recharge duration uses the energy projected after queued tasks", async () => {
		const finishedRecharge = ServerTypes.lane.from({
			lane_key: 255,
			schedule: {
				started: new Date(Date.now() - 600_000).toISOString().slice(0, 23),
				tasks: [{ type: TaskType.RECHARGE, duration: 5, cancelable: 0, cargo: [], couplings: [] }],
			},
		});
		const projected = await estimateTravel({
			entityId: 1n,
			target: { x: 10, y: 0 },
			recharge: true,
			snapshot: snap({ lanes: [finishedRecharge] }),
			hasSystemAtDestination: true,
		});
		const stored = await estimateTravel({
			entityId: 1n,
			target: { x: 10, y: 0 },
			recharge: true,
			snapshot: snap(),
			hasSystemAtDestination: true,
		});
		expect(projected.travel?.rechargeDuration_s).toBe(0);
		expect(stored.travel?.rechargeDuration_s).toBe(1_000);
	});

	test("flight is priced on end-of-queue cargo when it exceeds what is aboard at departure", async () => {
		const load = ServerTypes.lane.from({
			lane_key: 3,
			schedule: {
				started: new Date().toISOString().slice(0, 23),
				tasks: [
					{
						type: TaskType.LOAD,
						duration: 600,
						cancelable: 0,
						cargo: [{ item_id: 101, quantity: 5000, stats: 0, modules: [] }],
						couplings: [],
					},
				],
			},
		});
		const run = (s: unknown) =>
			// biome-ignore lint/suspicious/noExplicitAny: stub snapshots
			estimateTravel({ entityId: 1n, target: { x: 10, y: 0 }, snapshot: s as any, hasSystemAtDestination: true });
		const queued = await run(snap({ energy: 1_000_000n, lanes: [load] }));
		const loaded = await run(
			snap({ energy: 1_000_000n, cargomass: BigInt(getItem(101).mass * 5000) }),
		);
		const empty = await run(snap({ energy: 1_000_000n }));
		expect(queued.travel?.flightDuration_s).toBe(loaded.travel?.flightDuration_s);
		expect(queued.travel?.flightDuration_s).toBeGreaterThan(empty.travel?.flightDuration_s ?? 0);
	});

	test("travel departs after a queued unload, so the flight is priced on the emptied hold", async () => {
		const unload = ServerTypes.lane.from({
			lane_key: 3,
			schedule: {
				started: new Date().toISOString().slice(0, 23),
				tasks: [
					{
						type: TaskType.UNLOAD,
						duration: 600,
						cancelable: 0,
						cargo: [{ item_id: 101, quantity: 5000, stats: 0, modules: [] }],
						couplings: [],
					},
				],
			},
		});
		const run = (s: unknown) =>
			// biome-ignore lint/suspicious/noExplicitAny: stub snapshots
			estimateTravel({ entityId: 1n, target: { x: 10, y: 0 }, snapshot: s as any, hasSystemAtDestination: true });
		const loadedMass = BigInt(getItem(101).mass * 5000);
		const queued = await run(snap({ energy: 1_000_000n, cargomass: loadedMass, lanes: [unload] }));
		const empty = await run(snap({ energy: 1_000_000n }));
		expect(queued.travel?.flightDuration_s).toBe(empty.travel?.flightDuration_s);
	});
});

describe("estimateCraft — lane choice", () => {
	const CRAFTER_MODULE = 10104;

	function crafterModule() {
		return ServerTypes.module_entry.from({
			type: 6,
			installed: { item_id: CRAFTER_MODULE, stats: 0 },
		});
	}

	test("uses the first free crafter lane, as the contract does", async () => {
		const busyLane = ServerTypes.lane.from({
			lane_key: 1,
			schedule: {
				started: new Date().toISOString().slice(0, 23),
				tasks: [{ type: TaskType.CRAFT, duration: 600, cancelable: 0, cargo: [], couplings: [] }],
			},
		});
		const est = await estimateCraft({
			entityId: 5n,
			recipeId: 10003,
			quantity: 1,
			inputs: [{ itemId: 101, stackId: 0n, quantity: 10, modules: [] }],
			snapshot: {
				type: "ship",
				id: 5n,
				owner: "agent.gm",
				entity_name: "Two Crafters",
				coordinates: { x: 0n, y: 0n },
				cargomass: 0n,
				cargo: [],
				capacity: 10_000_000n,
				energy: 10_000_000n,
				generator: { capacity: 10_000_000n, recharge: 1n },
				modules: [crafterModule(), crafterModule()],
				crafter_lanes: [
					{ slot_index: 0, speed: 100, drain: 1 },
					{ slot_index: 1, speed: 500, drain: 1 },
				],
				gatherer_lanes: [],
				builder_lanes: [],
				loader_lanes: [],
				is_idle: false,
				lanes: [busyLane],
				// biome-ignore lint/suspicious/noExplicitAny: stub for EntitySnapshot
			} as any,
			recipe: { output_item_id: 10003, inputs: [{ item_id: 101, quantity: 10 }] },
		});
		expect(est.duration_s).toBe(21);
	});
});
