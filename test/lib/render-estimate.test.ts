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
