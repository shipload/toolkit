import { describe, expect, test } from "bun:test";
import type { EventRecord } from "../../src/lib/indexer";
import { summarizeEvent } from "../../src/lib/event-format";

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
		expect(
			summarizeEvent(
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
			),
		).toBe("transfer → warehouse 12 (item 101 ×5)");
	});

	test("resolve", () => {
		expect(summarizeEvent(evt({ type: "resolve" }))).toBe("resolved tasks");
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
		).toBe("created ship 7");
	});

	test("entity_module_added", () => {
		expect(
			summarizeEvent(
				evt({
					type: "entity_module_added",
					data: { entity_type: "ship", entity_id: 3, item_id: 200 },
				}),
			),
		).toBe("added module 200");
	});

	test("entity_module_removed", () => {
		expect(
			summarizeEvent(
				evt({
					type: "entity_module_removed",
					data: { entity_type: "ship", entity_id: 3, item_id: 200 },
				}),
			),
		).toBe("removed module 200");
	});

	test("gather_started", () => {
		expect(
			summarizeEvent(
				evt({
					type: "gather_started",
					data: { source: { entity_type: "ship", entity_id: 3 } },
				}),
			),
		).toBe("gather started");
	});

	test("craft_started", () => {
		expect(
			summarizeEvent(
				evt({
					type: "craft_started",
					data: { entity_type: "ship", id: 3, recipe_id: 42 },
				}),
			),
		).toBe("craft started (recipe 42)");
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
		).toBe("wrapped ship 3");
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
		expect(summarizeEvent(evt({ type: "travel", data: {} }))).toBe("travel → (?, ?)");
		expect(summarizeEvent(evt({ type: "transfer", data: {} }))).toBe(
			"transfer → ? ? (item ? ×?)",
		);
	});
});
