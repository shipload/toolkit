import { expect, test } from "bun:test";
import { renderDetail, renderList } from "../../../src/commands/query/recipe";

const sample = {
	output_item_id: 10001,
	output_mass: 400,
	inputs: [{ item_id: 0, category: 0, quantity: 15 }],
	stat_slots: [{ sources: [{ input_index: 0, input_stat_index: 0 }] }],
	blend_weights: [],
	output_item: { id: 10001, mass: 400 },
	input_items: [],
};

test("recipe list shows count and per-row summary", () => {
	const out = renderList([sample, { ...sample, output_item_id: 10002 }] as any);
	expect(out).toContain("Recipes (2)");
	expect(out).toContain("10001");
	expect(out).toContain("10002");
});

test("recipe detail shows output + inputs + stat slots", () => {
	const out = renderDetail(sample as any);
	expect(out).toContain("Output");
	expect(out).toContain("Hull Plates");
	expect(out).toContain("Inputs");
	expect(out).toContain("15");
	expect(out).toContain("Stat slots");
});

test("renderList omits tier label when tier is 0 or absent", () => {
	const r = {
		output_item_id: 10001,
		output_mass: 50000,
		inputs: [{ item_id: 0, category: 0, tier: 0, quantity: 15 }],
		stat_slots: [],
		blend_weights: [],
	};
	const out = renderList([r] as any);
	expect(out).not.toContain("TNaN");
	expect(out).not.toContain("T0");
	expect(out).not.toContain("Tundefined");
});

test("renderList shows tier label when tier is present and nonzero", () => {
	const r = {
		output_item_id: 10100,
		output_mass: 150000,
		inputs: [{ item_id: 10001, category: 0, tier: 0, quantity: 6 }],
		stat_slots: [],
		blend_weights: [],
	};
	const out = renderList([r] as any);
	expect(out).toContain("T1");
});

test("renderList does not repeat id in output item name", () => {
	const r = {
		output_item_id: 10001,
		output_mass: 50000,
		inputs: [{ item_id: 0, category: 0, tier: 0, quantity: 15 }],
		stat_slots: [],
		blend_weights: [],
	};
	const out = renderList([r] as any);
	expect(out).not.toMatch(/\(id:\d+\)/);
});

test("renderDetail does not repeat id in output line", () => {
	const r = {
		output_item_id: 10001,
		output_mass: 50000,
		inputs: [{ item_id: 0, category: 0, tier: 0, quantity: 15 }],
		stat_slots: [],
		blend_weights: [],
	};
	const out = renderDetail(r as any);
	expect(out).not.toMatch(/\(id:\d+\)/);
});

test("renderDetail shows output mass in tonnes not kg", () => {
	const r = {
		output_item_id: 10001,
		output_mass: 50000,
		inputs: [{ item_id: 0, category: 0, tier: 0, quantity: 15 }],
		stat_slots: [],
		blend_weights: [],
	};
	const out = renderDetail(r as any);
	expect(out).toContain("50 t");
	expect(out).not.toContain("50000");
});
