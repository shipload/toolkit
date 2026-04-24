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
	expect(out).toContain("10001");
	expect(out).toContain("Inputs");
	expect(out).toContain("15");
	expect(out).toContain("Stat slots");
});
