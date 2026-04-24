import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/items";

test("items renders list with item name resolved via formatItem", () => {
	const out = render([{ id: 501, mass: 15000, tier: 0, type: 0 }] as any, false);
	expect(out).toContain("Crude Biomass");
	expect(out).toContain("mass 15000");
});

test("items --raw emits JSON", () => {
	const out = render([{ id: 501, mass: 10 }] as any, true);
	expect(out).toContain('"id"');
	expect(out).toContain('"mass"');
});
