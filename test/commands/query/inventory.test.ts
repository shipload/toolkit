import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/inventory";

test("inventory renders entity type, id, and cargo items", () => {
	const out = render("warehouse", 9n, [
		{ item_id: 5, quantity: 100, stats: 0n, modules: [] } as any,
	]);
	expect(out).toContain("warehouse");
	expect(out).toContain("9");
	expect(out).toContain("100");
});

test("inventory renders empty cargo", () => {
	const out = render("ship", 42n, []);
	expect(out).toContain("ship 42");
	expect(out.toLowerCase()).toContain("empty");
});
