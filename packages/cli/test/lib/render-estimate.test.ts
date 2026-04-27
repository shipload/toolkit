import { describe, expect, test } from "bun:test";
import { renderEstimate } from "../../src/lib/render-estimate";

describe("renderEstimate — with_recharge tag", () => {
	test("default Estimate: prefix when with_recharge is false/omitted", () => {
		const out = renderEstimate({
			duration_s: 60,
			energy_cost: 100,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
		});
		expect(out.startsWith("Estimate:")).toBe(true);
	});
	test("(with recharge) tag when with_recharge is true", () => {
		const out = renderEstimate({
			duration_s: 240,
			energy_cost: 100,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
			with_recharge: true,
		});
		expect(out.startsWith("Estimate (with recharge):")).toBe(true);
	});
});

describe("renderEstimate — craft block", () => {
	test("renders single-slot single-stack craft", () => {
		const out = renderEstimate({
			duration_s: 5,
			energy_cost: 100,
			cargo_delta: { 301: -32, 10003: 1 },
			feasibility: { ok: true, issues: [] },
			craft: {
				outputItemId: 10003,
				outputQty: 1,
				slots: [
					{
						itemId: 301,
						requiredQty: 32,
						contributions: [{ stackId: 214202522n, qty: 32 }],
					},
				],
			},
		});
		expect(out).toContain("Inputs");
		expect(out).toContain("301");
		expect(out).toContain("214202522");
		expect(out).toContain("32");
	});
	test("renders multi-stack contribution arithmetic", () => {
		const out = renderEstimate({
			duration_s: 12,
			energy_cost: 200,
			cargo_delta: { 301: -160, 10003: 5 },
			feasibility: { ok: true, issues: [] },
			craft: {
				outputItemId: 10003,
				outputQty: 5,
				slots: [
					{
						itemId: 301,
						requiredQty: 160,
						contributions: [
							{ stackId: 1000n, qty: 11 },
							{ stackId: 2000n, qty: 149 },
						],
					},
				],
			},
		});
		expect(out).toContain("160");
		expect(out).toContain("11");
		expect(out).toContain("149");
		expect(out).toContain("1000");
		expect(out).toContain("2000");
	});
});
