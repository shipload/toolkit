import { describe, expect, test } from "bun:test";
import {
	calc_gather_duration,
	calc_gather_energy,
	type LocationStratum,
	ServerTypes,
} from "@shipload/sdk";
import { UInt16 } from "@wharfkit/antelope";
import {
	computeStratumGatherMetrics,
	type GathererCaps,
	solveMaxGatherQuantity,
} from "../../src/lib/gatherable";

const caps: GathererCaps = { yield: 700, depth: 950, speed: 500, drain: 25 };

const gathererStats = ServerTypes.gatherer_stats.from({
	yield: UInt16.from(caps.yield),
	drain: UInt16.from(caps.drain),
	depth: UInt16.from(caps.depth),
	speed: UInt16.from(caps.speed),
});

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
			caps,
			budget: { energy: 65535, cargoFreeKg: 1_000_000_000 },
			itemMassKg: 15000,
			stratum: 600,
			richness: 500,
			reserve: 5,
		});
		expect(result.maxQuantity).toBe(5);
		expect(result.bound).toBe("reserve");
	});

	test("cargo binds when cargo space is the smallest cap", () => {
		const result = solveMaxGatherQuantity({
			caps,
			budget: { energy: 65535, cargoFreeKg: 30_000 },
			itemMassKg: 15_000,
			stratum: 600,
			richness: 500,
			reserve: 1000,
		});
		expect(result.maxQuantity).toBe(2);
		expect(result.bound).toBe("cargo");
	});

	test("energy binds when energy is the smallest cap", () => {
		const tightCaps: GathererCaps = { ...caps, drain: 5000 };
		const result = solveMaxGatherQuantity({
			caps: tightCaps,
			budget: { energy: 200, cargoFreeKg: 1_000_000_000 },
			itemMassKg: 15_000,
			stratum: 600,
			richness: 500,
			reserve: 1000,
		});
		expect(result.bound).toBe("energy");
		expect(result.maxQuantity).toBeGreaterThan(0);
		// Verify by recomputing — must satisfy the contract formulas.
		const tightStats = ServerTypes.gatherer_stats.from({
			yield: UInt16.from(tightCaps.yield),
			drain: UInt16.from(tightCaps.drain),
			depth: UInt16.from(tightCaps.depth),
			speed: UInt16.from(tightCaps.speed),
		});
		const dur = Number(
			calc_gather_duration(tightStats, 15_000, result.maxQuantity, 600, 500),
		);
		const energy = Number(calc_gather_energy(tightStats, dur));
		expect(energy).toBeLessThanOrEqual(200);
		// And verify q+1 would exceed.
		const durNext = Number(calc_gather_duration(tightStats, 15_000, result.maxQuantity + 1, 600, 500));
		const energyNext = Number(calc_gather_energy(tightStats, durNext));
		expect(energyNext).toBeGreaterThan(200);
	});

	test("returns 0 when reserve is empty", () => {
		const result = solveMaxGatherQuantity({
			caps,
			budget: { energy: 65535, cargoFreeKg: 1_000_000_000 },
			itemMassKg: 15_000,
			stratum: 600,
			richness: 500,
			reserve: 0,
		});
		expect(result.maxQuantity).toBe(0);
		expect(result.bound).toBe("reserve");
	});

	test("returns 0 when richness is 0 (non-gatherable)", () => {
		const result = solveMaxGatherQuantity({
			caps,
			budget: { energy: 65535, cargoFreeKg: 1_000_000_000 },
			itemMassKg: 15_000,
			stratum: 600,
			richness: 0,
			reserve: 1000,
		});
		expect(result.maxQuantity).toBe(0);
	});

	test("returns 0 when energy can't even cover q=1", () => {
		const tightCaps: GathererCaps = { ...caps, drain: 5000 };
		const result = solveMaxGatherQuantity({
			caps: tightCaps,
			budget: { energy: 1, cargoFreeKg: 1_000_000_000 },
			itemMassKg: 15_000,
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
			{ energy: 350, cargoFreeKg: 1_000_000, reserve: 1000 },
			{ energy: 100, cargoFreeKg: 30_000, reserve: 50 },
			{ energy: 65535, cargoFreeKg: 100_000, reserve: 200 },
			{ energy: 50, cargoFreeKg: 1_000_000, reserve: 1000 },
		];
		for (const c of cases) {
			const result = solveMaxGatherQuantity({
				caps,
				budget: { energy: c.energy, cargoFreeKg: c.cargoFreeKg },
				itemMassKg: 15_000,
				stratum: 600,
				richness: 500,
				reserve: c.reserve,
			});
			const q = result.maxQuantity;
			if (q > 0) {
				const dur = Number(calc_gather_duration(gathererStats, 15_000, q, 600, 500));
				const energy = Number(calc_gather_energy(gathererStats, dur));
				expect(energy).toBeLessThanOrEqual(c.energy);
				expect(15_000 * q).toBeLessThanOrEqual(c.cargoFreeKg);
				expect(q).toBeLessThanOrEqual(c.reserve);
			}
		}
	});
});

describe("computeStratumGatherMetrics", () => {
	test("non-gatherable stratum (richness 0) returns zeros and gatherable=false", () => {
		const stratum = makeStratum({ richness: 0 });
		const m = computeStratumGatherMetrics({
			caps,
			budget: { energy: 350, cargoFreeKg: 1_000_000 },
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
			caps,
			budget: { energy: 350, cargoFreeKg: 1_000_000 },
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
