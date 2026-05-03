import { describe, expect, test } from "bun:test";
import type { EventRecord } from "../../src/lib/indexer";
import {
	formatItemRef,
	formatRecipeOutputRef,
	summarizeEvent,
} from "../../src/lib/event-format";

function evt(partial: Partial<EventRecord>): EventRecord {
	return {
		block_num: 1,
		block_time: "2026-04-28T00:00:00Z",
		seq: 1,
		type: "",
		type_code: 0,
		owner: "",
		entity_id: 0,
		data: {},
		...partial,
	};
}

describe("summarizeEvent", () => {
	test("player_joined", () => {
		expect(summarizeEvent(evt({ type: "player_joined", data: { account: "alice" } })))
			.toBe("joined the game");
	});

	test("travel with coords", () => {
		expect(
			summarizeEvent(
				evt({ type: "travel", data: { entity_type: "ship", id: 3, x: 5, y: 7 } }),
			),
		).toBe("travel → (5, 7)");
	});

	test("recharge", () => {
		expect(summarizeEvent(evt({ type: "recharge" }))).toBe("recharged");
	});

	test("transfer with quantity and item", () => {
		const result = summarizeEvent(
			evt({
				type: "transfer",
				data: {
					source_id: 3,
					dest_type: "warehouse",
					dest_id: 12,
					item_id: 101,
					quantity: 5,
				},
			}),
		);
		expect(result).toMatch(/^transfer 5× /);
		expect(result).toMatch(/→ warehouse #12$/);
	});

	test("resolve", () => {
		expect(summarizeEvent(evt({ type: "resolve" }))).toBe("resolved all tasks");
	});

	test("cancel", () => {
		expect(summarizeEvent(evt({ type: "cancel" }))).toBe("cancelled tasks");
	});

	test("entity_created", () => {
		expect(
			summarizeEvent(
				evt({
					type: "entity_created",
					data: { entity_type: "ship", id: 7, owner: "alice" },
				}),
			),
		).toBe("created ship");
	});

	test("entity_module_added", () => {
		expect(
			summarizeEvent(
				evt({
					type: "entity_module_added",
					data: { entity_type: "ship", entity_id: 3, item_id: 200 },
				}),
			),
		).toBe("added item #200");
	});

	test("entity_module_removed", () => {
		expect(
			summarizeEvent(
				evt({
					type: "entity_module_removed",
					data: { entity_type: "ship", entity_id: 3, item_id: 200 },
				}),
			),
		).toBe("removed item #200");
	});

	test("gather_started", () => {
		expect(
			summarizeEvent(
				evt({
					type: "gather_started",
					data: { source: { entity_type: "ship", entity_id: 3 } },
				}),
			),
		).toBe("gather started · depth ? · ? stacks");
	});

	test("craft_started", () => {
		expect(
			summarizeEvent(
				evt({
					type: "craft_started",
					data: { entity_type: "ship", id: 3, recipe_id: 42 },
				}),
			),
		).toBe("craft started: ?× recipe #42");
	});

	test("entity_deployed", () => {
		expect(
			summarizeEvent(
				evt({ type: "entity_deployed", data: { entity_type: "ship", id: 3 } }),
			),
		).toBe("deployed");
	});

	test("warp_started", () => {
		expect(
			summarizeEvent(
				evt({ type: "warp_started", data: { entity_type: "ship", id: 3, x: 100, y: 200 } }),
			),
		).toBe("warp → (100, 200)");
	});

	test("entity_wrapped", () => {
		expect(
			summarizeEvent(
				evt({
					type: "entity_wrapped",
					data: { entity_type: "ship", entity_id: 3, owner: "alice" },
				}),
			),
		).toBe("wrapped");
	});

	test("group_travel_started", () => {
		expect(
			summarizeEvent(
				evt({ type: "group_travel_started", data: { x: 100, y: 200 } }),
			),
		).toBe("group travel → (100, 200)");
	});

	test("init / commit / enable rendered as chain admin", () => {
		expect(summarizeEvent(evt({ type: "init" }))).toBe("chain admin: init");
		expect(summarizeEvent(evt({ type: "commit" }))).toBe("chain admin: commit");
		expect(summarizeEvent(evt({ type: "enable" }))).toBe("chain admin: enable");
	});

	test("unknown type falls back to type name", () => {
		expect(summarizeEvent(evt({ type: "future_thing" }))).toBe("future_thing");
	});

	test("missing data fields render placeholders, do not throw", () => {
		expect(summarizeEvent(evt({ type: "travel", data: {} }))).toBe("travel → (legacy)");
		expect(summarizeEvent(evt({ type: "transfer", data: {} }))).toBe(
			"transfer ?× item #0 → ? #0",
		);
	});

	test("travel with legacy data.destination payload renders (legacy)", () => {
		expect(
			summarizeEvent(
				evt({ type: "travel", data: { destination: { x: 10, y: 20 } } }),
			),
		).toBe("travel → (legacy)");
	});

	test("travel with string-numeric coords renders normally", () => {
		expect(
			summarizeEvent(evt({ type: "travel", data: { x: "5", y: "7" } })),
		).toBe("travel → (5, 7)");
	});

	test("travel with non-numeric coord string renders (legacy)", () => {
		expect(
			summarizeEvent(evt({ type: "travel", data: { x: "abc", y: 5 } })),
		).toBe("travel → (legacy)");
	});

	test("travel with null coord renders (legacy)", () => {
		expect(
			summarizeEvent(evt({ type: "travel", data: { x: null, y: 5 } })),
		).toBe("travel → (legacy)");
	});

	test("warp_started uses the same legacy fallback", () => {
		expect(
			summarizeEvent(evt({ type: "warp_started", data: { destination: { x: 1, y: 2 } } })),
		).toBe("warp → (legacy)");
	});

	test("group_travel_started uses the same legacy fallback", () => {
		expect(
			summarizeEvent(evt({ type: "group_travel_started", data: {} })),
		).toBe("group travel → (legacy)");
	});

	test("travel with recharge: true renders [+ recharge] suffix", () => {
		expect(
			summarizeEvent(
				evt({ type: "travel", data: { entity_type: "ship", id: 1, x: 5, y: 7, recharge: true } }),
			),
		).toBe("travel → (5, 7) [+ recharge]");
	});

	test("travel without recharge does not render suffix", () => {
		expect(
			summarizeEvent(
				evt({ type: "travel", data: { entity_type: "ship", id: 1, x: 5, y: 7, recharge: false } }),
			),
		).toBe("travel → (5, 7)");
	});

	test("transfer renders quantity, item name+tier, and dest as '<type> #<id>'", () => {
		const result = summarizeEvent(
			evt({
				type: "transfer",
				data: {
					source_id: 1,
					source_type: "ship",
					dest_id: 4,
					dest_type: "ship",
					item_id: 101,
					quantity: 31,
				},
			}),
		);
		expect(result).toMatch(/^transfer 31× /);
		expect(result).toMatch(/Ore \(T1\)/);
		expect(result).toMatch(/→ ship #4$/);
	});

	test("craft_started renders quantity and recipe output name+tier", () => {
		const result = summarizeEvent(
			evt({
				type: "craft_started",
				data: { entity_type: "ship", id: 1, recipe_id: 10002, quantity: 1, inputs: [] },
			}),
		);
		expect(result).toMatch(/^craft started: 1× /);
		expect(result).toMatch(/\(T\d+\)$/);
		expect(result).not.toMatch(/recipe #10002/);
	});

	test("craft_started falls back to 'recipe #<id>' when recipe unknown", () => {
		const result = summarizeEvent(
			evt({
				type: "craft_started",
				data: { entity_type: "ship", id: 1, recipe_id: 999999, quantity: 2, inputs: [] },
			}),
		);
		expect(result).toBe("craft started: 2× recipe #999999");
	});

	test("gather_started renders depth and stacks", () => {
		expect(
			summarizeEvent(
				evt({
					type: "gather_started",
					data: {
						source: { entity_type: "ship", entity_id: 1 },
						destination: { entity_type: "ship", entity_id: 1 },
						quantity: 4,
						stratum: 843,
					},
				}),
			),
		).toBe("gather started · depth 843 · 4 stacks");
	});

	test("gather_started with cross-entity destination appends → <type> #<id>", () => {
		const result = summarizeEvent(
			evt({
				type: "gather_started",
				data: {
					source: { entity_type: "ship", entity_id: 1 },
					destination: { entity_type: "warehouse", entity_id: 4 },
					quantity: 2,
					stratum: 600,
				},
			}),
		);
		expect(result).toBe("gather started · depth 600 · 2 stacks → warehouse #4");
	});

	test("resolve renders count when present", () => {
		expect(
			summarizeEvent(
				evt({ type: "resolve", data: { entity_type: "ship", id: 1, count: 4 } }),
			),
		).toBe("resolved 4 tasks");
	});

	test("resolve renders 'all' when count is null", () => {
		expect(
			summarizeEvent(
				evt({ type: "resolve", data: { entity_type: "ship", id: 1, count: null } }),
			),
		).toBe("resolved all tasks");
	});

	test("entity_module_added renders item name and tier", () => {
		// Item 101 = T1 Ore (used as a placeholder; real chain would use a module item id).
		const result = summarizeEvent(
			evt({
				type: "entity_module_added",
				data: { entity_type: "ship", entity_id: 1, item_id: 101 },
			}),
		);
		expect(result).toMatch(/^added /);
		expect(result).toMatch(/\(T1\)$/);
	});

	test("entity_module_removed renders item name and tier", () => {
		const result = summarizeEvent(
			evt({
				type: "entity_module_removed",
				data: { entity_type: "ship", entity_id: 1, item_id: 101 },
			}),
		);
		expect(result).toMatch(/^removed /);
		expect(result).toMatch(/\(T1\)$/);
	});
});

describe("formatItemRef", () => {
	test("renders name and tier for a known catalog item", () => {
		// Item 101 is the T1 Ore. Tier comes from items.json.
		const result = formatItemRef(101);
		expect(result).toMatch(/Ore/);
		expect(result).toMatch(/\(T1\)/);
	});

	test("falls back to 'item #<id>' for unknown id", () => {
		expect(formatItemRef(999999)).toBe("item #999999");
	});
});

describe("formatRecipeOutputRef", () => {
	test("renders the recipe's output item name and tier when known", () => {
		// Recipe id 10002 has a known output. Assert the shape rather than the
		// specific name (which depends on catalog data).
		const result = formatRecipeOutputRef(10002);
		expect(result).toMatch(/\(T\d+\)/);
		expect(result).not.toBe("recipe #10002");
	});

	test("falls back to 'recipe #<id>' for unknown id", () => {
		expect(formatRecipeOutputRef(999999)).toBe("recipe #999999");
	});
});
