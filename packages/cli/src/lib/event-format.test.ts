import { describe, expect, test } from "bun:test";
import { summarizeEvent } from "./event-format";
import type { EventRecord } from "./indexer";

function rec(type: string, data: Record<string, unknown>): EventRecord {
	return {
		block_num: 1,
		block_time: "",
		seq: 1,
		type,
		type_code: 0,
		owner: "",
		entity_id: 0,
		data,
	};
}

describe("summarizeEvent load/unload", () => {
	test("load with one item names quantity and source entity", () => {
		const out = summarizeEvent(
			rec("load", { id: 10, from_id: 20, items: [{ item_id: 1001, quantity: 5 }] }),
		);
		expect(out).toContain("load");
		expect(out).toContain("5×");
		expect(out).toContain("from #20");
	});

	test("load with multiple items summarizes the stack count", () => {
		const out = summarizeEvent(
			rec("load", {
				id: 10,
				from_id: 20,
				items: [
					{ item_id: 1, quantity: 5 },
					{ item_id: 2, quantity: 3 },
				],
			}),
		);
		expect(out).toBe("load 2 stacks from #20");
	});

	test("unload with one item names quantity and destination entity", () => {
		const out = summarizeEvent(
			rec("unload", { id: 11, to_id: 21, items: [{ item_id: 1001, quantity: 5 }] }),
		);
		expect(out).toContain("unload");
		expect(out).toContain("5×");
		expect(out).toContain("→ #21");
	});

	test("unload with multiple items summarizes the stack count", () => {
		const out = summarizeEvent(
			rec("unload", {
				id: 11,
				to_id: 21,
				items: [
					{ item_id: 1, quantity: 5 },
					{ item_id: 2, quantity: 3 },
				],
			}),
		);
		expect(out).toBe("unload 2 stacks → #21");
	});
});

describe("summarizeEvent craft_started cross-craft", () => {
	test("self craft (no target) shows no destination arrow", () => {
		const out = summarizeEvent(rec("craft_started", { id: 10, recipe_id: 1, quantity: 2 }));
		expect(out).toContain("craft started");
		expect(out).not.toContain("→");
	});

	test("self craft (target equal to id) shows no destination arrow", () => {
		const out = summarizeEvent(
			rec("craft_started", { id: 10, recipe_id: 1, quantity: 2, target: 10 }),
		);
		expect(out).not.toContain("→");
	});

	test("cross craft (target differs from id) names the destination entity", () => {
		const out = summarizeEvent(
			rec("craft_started", { id: 10, recipe_id: 1, quantity: 2, target: 21 }),
		);
		expect(out).toContain("→ #21");
	});
});
