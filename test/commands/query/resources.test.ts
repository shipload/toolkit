import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/resources";

test("resources renders rows with id, category, tier, mass", () => {
	const input = {
		resources: [
			{ id: 101, mass: 30000, category: 0, tier: 0 },
			{ id: 103, mass: 40000, category: 0, tier: 2 },
		],
	};
	const out = render(input as any, false);
	expect(out).toContain("Resources (2)");
	expect(out).toContain("101");
	expect(out).toContain("103");
	expect(out).toContain("Ore");
	expect(out).toContain("T3");
	expect(out).toContain("30000");
});

test("resources --raw emits JSON", () => {
	const out = render({ resources: [] } as any, true);
	expect(JSON.parse(out)).toEqual({ resources: [] });
});
