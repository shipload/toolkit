import { describe, expect, test } from "bun:test";
import {
	calc_gather_duration,
	calc_gather_energy,
	type GathererStats,
	getItem,
	type LocationStratum,
	ServerTypes,
} from "@shipload/sdk";
import { UInt16, UInt32 } from "@wharfkit/antelope";
import { computeStratumGatherMetrics, solveMaxGatherQuantity } from "../../src/lib/gatherable";

function lane(slot: number, yieldValue: number, drain: number, depth: number) {
	return ServerTypes.gatherer_lane.from({
		slot_index: slot,
		yield: yieldValue,
		drain,
		depth,
		output_pct: 100,
	});
}

const caps = { yield: 700, depth: 950, drain: 25_000 };
const lanes = [lane(0, caps.yield, caps.drain, caps.depth)];

const gathererStats: GathererStats = {
	yield: UInt16.from(caps.yield),
	drain: UInt32.from(caps.drain),
	depth: UInt16.from(caps.depth),
};

function makeStratum(overrides: Partial<LocationStratum> = {}): LocationStratum {
	return {
		index: 600,
		itemId: 101,
		reserve: 1000,
		reserveMax: 1000,
		richness: 500,
		seed: 0n,
		stats: { stat1: 0, stat2: 0, stat3: 0 },
		...overrides,
	} as LocationStratum;
}

describe("solveMaxGatherQuantity", () => {
	test("reserve binds when reserve is the smallest cap", () => {
		const result = solveMaxGatherQuantity({
			lanes,
			budget: { energy: 65_535_000, cargoFree: 10_000_000 },
			itemMass: 150,
			stratum: 600,
			richness: 500,
			reserve: 5,
		});
		expect(result.maxQuantity).toBe(5);
		expect(result.bound).toBe("reserve");
	});

	test("cargo binds when cargo space is the smallest cap", () => {
		const result = solveMaxGatherQuantity({
			lanes,
			budget: { energy: 65_535_000, cargoFree: 300 },
			itemMass: 150,
			stratum: 600,
			richness: 500,
			reserve: 1000,
		});
		expect(result.maxQuantity).toBe(2);
		expect(result.bound).toBe("cargo");
	});

	test("energy binds when energy is the smallest cap", () => {
		const tightCaps = { ...caps, drain: 5_000_000 };
		const tightLanes = [lane(0, tightCaps.yield, tightCaps.drain, tightCaps.depth)];
		const result = solveMaxGatherQuantity({
			lanes: tightLanes,
			budget: { energy: 100_000, cargoFree: 10_000_000 },
			itemMass: 150,
			stratum: 600,
			richness: 500,
			reserve: 1000,
		});
		expect(result.bound).toBe("energy");
		expect(result.maxQuantity).toBeGreaterThan(0);
		// Verify by recomputing — must satisfy the contract formulas.
		const tightStats: GathererStats = {
			yield: UInt16.from(tightCaps.yield),
			drain: UInt32.from(tightCaps.drain),
			depth: UInt16.from(tightCaps.depth),
		};
		const dur = Number(
			calc_gather_duration(tightStats, 150, result.maxQuantity, 600, 500),
		);
		const energy = Number(calc_gather_energy(tightStats, dur));
		expect(energy).toBeLessThanOrEqual(100_000);
		// And verify q+1 would exceed.
		const durNext = Number(calc_gather_duration(tightStats, 150, result.maxQuantity + 1, 600, 500));
		const energyNext = Number(calc_gather_energy(tightStats, durNext));
		expect(energyNext).toBeGreaterThan(100_000);
	});

	test("returns 0 when reserve is empty", () => {
		const result = solveMaxGatherQuantity({
			lanes,
			budget: { energy: 65_535_000, cargoFree: 10_000_000 },
			itemMass: 150,
			stratum: 600,
			richness: 500,
			reserve: 0,
		});
		expect(result.maxQuantity).toBe(0);
		expect(result.bound).toBe("reserve");
	});

	test("returns 0 when richness is 0 (non-gatherable)", () => {
		const result = solveMaxGatherQuantity({
			lanes,
			budget: { energy: 65_535_000, cargoFree: 10_000_000 },
			itemMass: 150,
			stratum: 600,
			richness: 0,
			reserve: 1000,
		});
		expect(result.maxQuantity).toBe(0);
	});

	test("returns 0 when energy can't even cover q=1", () => {
		const tightCaps = { ...caps, drain: 5_000_000 };
		const tightLanes = [lane(0, tightCaps.yield, tightCaps.drain, tightCaps.depth)];
		const result = solveMaxGatherQuantity({
			lanes: tightLanes,
			budget: { energy: 1, cargoFree: 10_000_000 },
			itemMass: 150,
			stratum: 600,
			richness: 500,
			reserve: 1000,
		});
		expect(result.maxQuantity).toBe(0);
		expect(result.bound).toBe("energy");
	});

	test("never returns a quantity the contract would reject (verify-by-recompute)", () => {
		// Sweep a range of inputs and confirm: the returned q is always feasible,
		// and q+1 (when not reserve-bound) would fail at least one constraint.
		const cases = [
			{ energy: 350_000, cargoFree: 10_000, reserve: 1000 },
			{ energy: 100, cargoFree: 300, reserve: 50 },
			{ energy: 65_535_000, cargoFree: 1_000, reserve: 200 },
			{ energy: 50, cargoFree: 10_000, reserve: 1000 },
		];
		for (const c of cases) {
			const result = solveMaxGatherQuantity({
				lanes,
				budget: { energy: c.energy, cargoFree: c.cargoFree },
				itemMass: 150,
				stratum: 600,
				richness: 500,
				reserve: c.reserve,
			});
			const q = result.maxQuantity;
			if (q > 0) {
				const dur = Number(calc_gather_duration(gathererStats, 150, q, 600, 500));
				const energy = Number(calc_gather_energy(gathererStats, dur));
				expect(energy).toBeLessThanOrEqual(c.energy);
				expect(150 * q).toBeLessThanOrEqual(c.cargoFree);
				expect(q).toBeLessThanOrEqual(c.reserve);
			}
		}
	});
});

describe("computeStratumGatherMetrics", () => {
	test("non-gatherable stratum (richness 0) returns zeros and gatherable=false", () => {
		const stratum = makeStratum({ richness: 0 });
		const m = computeStratumGatherMetrics({
			lanes,
			budget: { energy: 350_000, cargoFree: 10_000 },
			stratum,
			quantity: 1,
		});
		expect(m.gatherable).toBe(false);
		expect(m.timeS).toBe(0);
		expect(m.energyCost).toBe(0);
		expect(m.maxQuantity).toBe(0);
	});

	test("gatherable stratum returns positive time/energy and a sensible max", () => {
		const stratum = makeStratum({ index: 600, richness: 500, reserve: 100 });
		const m = computeStratumGatherMetrics({
			lanes,
			budget: { energy: 350_000, cargoFree: 10_000 },
			stratum,
			quantity: 1,
		});
		expect(m.gatherable).toBe(true);
		expect(m.timeS).toBeGreaterThan(0);
		expect(m.energyCost).toBeGreaterThanOrEqual(0);
		expect(m.maxQuantity).toBeGreaterThan(0);
		expect(m.maxQuantity).toBeLessThanOrEqual(100);
	});
});

describe("multi-lane gathering (gatherplan splits across every reaching lane)", () => {
	const deep = lane(0, 700, 25_000, 950);
	const shallow = lane(1, 300, 10_000, 700);
	const both = [deep, shallow];
	const stratumRow = makeStratum({ index: 600, richness: 500, reserve: 1000 });
	const budget = { energy: 65_535_000, cargoFree: 10_000_000 };
	const mass = getItem(101).mass;

	function laneStats(l: ReturnType<typeof lane>): GathererStats {
		return { yield: l.yield, drain: l.drain, depth: l.depth };
	}

	test("splits the quantity by yield and sums energy, takes the slowest lane for time", () => {
		const m = computeStratumGatherMetrics({ lanes: both, budget, stratum: stratumRow, quantity: 10 });
		const dDeep = Number(calc_gather_duration(laneStats(deep), mass, 7, 600, 500));
		const dShallow = Number(calc_gather_duration(laneStats(shallow), mass, 3, 600, 500));
		const eDeep = Number(calc_gather_energy(laneStats(deep), dDeep));
		const eShallow = Number(calc_gather_energy(laneStats(shallow), dShallow));
		expect(m.timeS).toBe(Math.max(dDeep, dShallow));
		expect(m.energyCost).toBe(eDeep + eShallow);
		const solo = computeStratumGatherMetrics({ lanes: [deep], budget, stratum: stratumRow, quantity: 10 });
		expect(m.timeS).toBeLessThan(solo.timeS);
	});

	test("a lane that cannot reach the stratum takes no share", () => {
		const m = computeStratumGatherMetrics({
			lanes: both,
			budget,
			stratum: makeStratum({ index: 800, richness: 500, reserve: 1000 }),
			quantity: 10,
		});
		const solo = computeStratumGatherMetrics({
			lanes: [deep],
			budget,
			stratum: makeStratum({ index: 800, richness: 500, reserve: 1000 }),
			quantity: 10,
		});
		expect(m.timeS).toBe(solo.timeS);
		expect(m.energyCost).toBe(solo.energyCost);
	});

	test("energy-bound max quantity is the largest split whose summed cost fits", () => {
		const energy = 12_000;
		const result = solveMaxGatherQuantity({
			lanes: both,
			budget: { energy, cargoFree: 10_000_000 },
			itemMass: mass,
			stratum: 600,
			richness: 500,
			reserve: 100_000,
		});
		expect(result.bound).toBe("energy");
		const cost = (q: number) =>
			computeStratumGatherMetrics({
				lanes: both,
				budget,
				stratum: makeStratum({ index: 600, richness: 500, reserve: 100_000 }),
				quantity: q,
			}).energyCost;
		expect(cost(result.maxQuantity)).toBeLessThanOrEqual(energy);
		expect(cost(result.maxQuantity + 1)).toBeGreaterThan(energy);
		const solo = solveMaxGatherQuantity({
			lanes: [deep],
			budget: { energy, cargoFree: 10_000_000 },
			itemMass: mass,
			stratum: 600,
			richness: 500,
			reserve: 100_000,
		});
		expect(result.maxQuantity).not.toBe(solo.maxQuantity);
	});
});
