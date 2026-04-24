import { describe, expect, test } from "bun:test";
import {
	computeCraftCargoDelta,
	computeFlightDurationSeconds,
	computeGatherCargoDelta,
	type EstimateResult,
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
	test("returns non-negative floor(2*sqrt(d/a)) for representative inputs", () => {
		// 2 * sqrt(10000/100) = 2 * 10 = 20
		expect(computeFlightDurationSeconds(10_000, 100)).toBe(20);
		// 2 * sqrt(40000/1) = 2 * 200 = 400
		expect(computeFlightDurationSeconds(40_000, 1)).toBe(400);
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
			energy_cost: 43,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
		});
		expect(out).toBe("Estimate: duration 47s, energy -43");
	});
	test("formats gather estimate with cargo delta", () => {
		const out = renderEstimate({
			duration_s: 120,
			energy_cost: 30,
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
		expect(out).toContain("2h0m");
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
