import { describe, expect, test } from "bun:test";
import { MultiHigh } from "./multi-high";

describe("MultiHigh", () => {
	test("dedupes and sorts user threshold against defaults", () => {
		const m = new MultiHigh(900);
		const tiers = m.snapshot().tiers.map((t) => t.threshold);
		expect(tiers).toEqual([800, 900, 950]);
	});

	test("user threshold not in defaults is appended and sorted", () => {
		const m = new MultiHigh(850);
		const tiers = m.snapshot().tiers.map((t) => t.threshold);
		expect(tiers).toEqual([800, 850, 900, 950]);
	});

	test("counts atLeastN per tier", () => {
		const m = new MultiHigh(900);
		m.ingest({ stat1: 950, stat2: 920, stat3: 910 });
		m.ingest({ stat1: 850, stat2: 820, stat3: 100 });
		m.ingest({ stat1: 10, stat2: 20, stat3: 30 });

		const t800 = m.snapshot().tiers.find((t) => t.threshold === 800)!;
		expect(t800.atLeast1).toBe(2);
		expect(t800.atLeast2).toBe(2);
		expect(t800.atLeast3).toBe(1);

		const t950 = m.snapshot().tiers.find((t) => t.threshold === 950)!;
		expect(t950.atLeast1).toBe(1);
		expect(t950.atLeast2).toBe(0);
		expect(t950.atLeast3).toBe(0);

		expect(m.snapshot().totalStrata).toBe(3);
	});
});
