import { describe, expect, test } from "bun:test";
import { Histogram } from "./histogram";

describe("Histogram", () => {
	test("ingests a triple into correct buckets", () => {
		const h = new Histogram();
		h.ingest({ stat1: 5, stat2: 450, stat3: 999 });
		const s = h.snapshot();
		expect(s.stat1[0]).toBe(1);
		expect(s.stat2[4]).toBe(1);
		expect(s.stat3[9]).toBe(1);
		expect(s.combined[0]).toBe(1);
		expect(s.combined[4]).toBe(1);
		expect(s.combined[9]).toBe(1);
		expect(s.totalSamples).toBe(1);
	});

	test("bucket boundaries are [lo, hi)", () => {
		const h = new Histogram();
		h.ingest({ stat1: 0, stat2: 99, stat3: 100 });
		const s = h.snapshot();
		expect(s.stat1[0]).toBe(1);
		expect(s.stat2[0]).toBe(1);
		expect(s.stat3[1]).toBe(1);
	});

	test("clamps rare stat value of 1000 into top bucket", () => {
		const h = new Histogram();
		h.ingest({ stat1: 1000, stat2: 1, stat3: 1 });
		const s = h.snapshot();
		expect(s.stat1[9]).toBe(1);
	});

	test("accumulates multiple ingests", () => {
		const h = new Histogram();
		for (let i = 0; i < 10; i++) h.ingest({ stat1: 250, stat2: 250, stat3: 250 });
		const s = h.snapshot();
		expect(s.stat1[2]).toBe(10);
		expect(s.stat2[2]).toBe(10);
		expect(s.stat3[2]).toBe(10);
		expect(s.totalSamples).toBe(10);
	});
});
