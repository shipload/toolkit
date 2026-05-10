import { describe, expect, test } from "bun:test";
import { Checksum256 } from "@wharfkit/antelope";
import type { ServerTypes } from "@shipload/sdk";
import { formatCargoTable } from "../../src/lib/cargo-table";
import {
	formatDateTimeUTC,
	formatInstallHint,
	formatLocation,
	formatOutput,
	formatReserve,
	formatResolveHint,
	formatTaskShort,
} from "../../src/lib/format";

describe("formatLocation with reach", () => {
	const gameSeed = Checksum256.from(
		"0000000000000000000000000000000000000000000000000000000000000000",
	);
	const epochSeed = Checksum256.from(
		"1111111111111111111111111111111111111111111111111111111111111111",
	);

	// biome-ignore lint/suspicious/noExplicitAny: stub for location_info
	const loc: any = { coords: { x: 0n, y: 0n }, is_system: true };

	test("without reach, output shape is unchanged (no reach tokens)", () => {
		const out = formatLocation(loc, gameSeed, epochSeed);
		expect(out).toContain("Location (0, 0)");
		expect(out).not.toContain("Top reachable");
		expect(out).not.toContain("Top overall");
	});

	test("with reach, swaps Top strata for Top reachable (or shows no-reachable message)", () => {
		const out = formatLocation(loc, gameSeed, epochSeed, { depth: 100, showAll: false });
		expect(out).not.toContain("Top strata:");
		expect(out).toMatch(/Top reachable|no reachable strata/);
	});

	test("with reach + showAll, always includes Top overall block if any strata exist", () => {
		const out = formatLocation(loc, gameSeed, epochSeed, { depth: 100, showAll: true });
		expect(out).toMatch(/Top reachable|no reachable strata/);
		expect(out.includes("Top overall") || out.includes("no reachable strata")).toBe(true);
	});
});

describe("formatOutput", () => {
	test("returns pretty output when json is falsy", () => {
		const out = formatOutput({ a: 1 }, { json: false }, (d) => `pretty: ${d.a}`);
		expect(out).toBe("pretty: 1");
	});
	test("returns JSON string when json is true", () => {
		const out = formatOutput({ a: 1, big: 9n }, { json: true }, () => "unused");
		expect(JSON.parse(out)).toEqual({ a: 1, big: "9" });
	});
	test("JSON output round-trips deeply-nested BigInts", () => {
		const data = { level: { list: [1n, 2n, { inner: 3n }] } };
		const out = formatOutput(data, { json: true }, () => "unused");
		expect(JSON.parse(out)).toEqual({ level: { list: ["1", "2", { inner: "3" }] } });
	});
	test("coerces small numeric `stats` field to string for safe consumption", () => {
		const data = { cargo: [{ item_id: 201, quantity: 1, stats: 239829 }] };
		const out = formatOutput(data, { json: true }, () => "unused");
		const parsed = JSON.parse(out);
		expect(parsed.cargo[0].stats).toBe("239829");
		expect(typeof parsed.cargo[0].stats).toBe("string");
	});
	test("leaves large numeric `stats` (already string from wharfkit) as string", () => {
		const data = { cargo: [{ item_id: 201, quantity: 1, stats: "251479207179" }] };
		const out = formatOutput(data, { json: true }, () => "unused");
		const parsed = JSON.parse(out);
		expect(parsed.cargo[0].stats).toBe("251479207179");
	});
	test("does not coerce object-shaped `stats` (e.g. stratum stats)", () => {
		const data = { stats: { stat1: 1, stat2: 2, stat3: 3 } };
		const out = formatOutput(data, { json: true }, () => "unused");
		expect(JSON.parse(out)).toEqual({ stats: { stat1: 1, stat2: 2, stat3: 3 } });
	});
});

describe("formatInstallHint", () => {
	test("emits install command referencing entity and slot", () => {
		const hint = formatInstallHint("ship", 1n, 2, "Crafter");
		expect(hint).toContain("ship 1 addmodule 2");
		expect(hint).toContain("Crafter");
	});
});

describe("formatResolveHint", () => {
	test("emits resolve command + count", () => {
		const h = formatResolveHint("ship", 1n, 3);
		expect(h).toContain("shiploadcli ship 1 resolve");
		expect(h).toContain("3 completed");
	});
});

describe("formatReserve", () => {
	test("returns single value when reserve equals reserve_max", () => {
		expect(formatReserve(820, 820)).toBe("820");
	});
	test("returns remaining/max with percentage when depleted", () => {
		expect(formatReserve(56, 820)).toBe("56/820 (7%)");
	});
	test("fully depleted shows 0/max (0%)", () => {
		expect(formatReserve(0, 820)).toBe("0/820 (0%)");
	});
	test("handles reserve_max of 0 gracefully", () => {
		expect(formatReserve(0, 0)).toBe("0");
	});
});

describe("formatCargoTable stack column", () => {
	test("includes the raw stack identifier for each row", () => {
		const cargo = [{ item_id: 201, quantity: 45, stats: 251479207179n, modules: [] } as any];
		const out = formatCargoTable(cargo);
		expect(out).toContain("251479207179");
	});
	test("renders 0 stack so the discriminator is always visible", () => {
		const cargo = [{ item_id: 10200, quantity: 1, stats: 0n, modules: [] } as any];
		const out = formatCargoTable(cargo);
		expect(out).toMatch(/\b0\b/);
	});
});

function task(partial: Partial<ServerTypes.task>): ServerTypes.task {
	return {
		type: 0 as never,
		duration: 0n as never,
		cancelable: 0 as never,
		coordinates: undefined,
		cargo: [],
		entitytarget: undefined,
		entitygroup: undefined,
		energy_cost: undefined,
		...partial,
	} as ServerTypes.task;
}

describe("formatTaskShort", () => {
	test("Idle", () => {
		expect(formatTaskShort(task({ type: 0 as never }))).toBe("Idle");
	});

	test("Travel includes destination coords", () => {
		expect(
			formatTaskShort(
				task({ type: 1 as never, coordinates: { x: -64n, y: -10n } as never }),
			),
		).toBe("Travel to (-64, -10)");
	});

	test("Recharge", () => {
		expect(formatTaskShort(task({ type: 2 as never }))).toBe("Recharge");
	});

	test("Load reads as 'Receive <items> from <target>'", () => {
		const t = task({
			type: 3 as never,
			cargo: [{ item_id: 101 as never, quantity: 5 as never, stats: 0n as never }] as never,
			entitytarget: { entity_type: "warehouse" as never, entity_id: 6n as never } as never,
		});
		expect(formatTaskShort(t)).toBe("Receive 5 Crude Ore from warehouse 6");
	});

	test("Unload reads as 'Send <items> to <target>'", () => {
		const t = task({
			type: 4 as never,
			cargo: [{ item_id: 10001 as never, quantity: 7 as never, stats: 0n as never }] as never,
			entitytarget: { entity_type: "warehouse" as never, entity_id: 6n as never } as never,
		});
		expect(formatTaskShort(t)).toBe("Send 7 Hull Plates to warehouse 6");
	});

	test("Load works with non-warehouse targets (ship-to-ship transfer)", () => {
		const t = task({
			type: 3 as never,
			cargo: [{ item_id: 101 as never, quantity: 3 as never, stats: 0n as never }] as never,
			entitytarget: { entity_type: "ship" as never, entity_id: 12n as never } as never,
		});
		expect(formatTaskShort(t)).toBe("Receive 3 Crude Ore from ship 12");
	});

	test("Gather lists items without target phrasing", () => {
		const t = task({
			type: 5 as never,
			cargo: [{ item_id: 101 as never, quantity: 40 as never, stats: 0n as never }] as never,
		});
		expect(formatTaskShort(t)).toBe("Gather 40 Crude Ore");
	});

	test("Warp includes destination coords", () => {
		expect(
			formatTaskShort(
				task({ type: 6 as never, coordinates: { x: 100n, y: 200n } as never }),
			),
		).toBe("Warp to (100, 200)");
	});

	test("Craft shows output item name (last cargo entry), not inputs", () => {
		const t = task({
			type: 7 as never,
			cargo: [
				{ item_id: 101 as never, quantity: 6 as never, stats: 0n as never },
				{ item_id: 201 as never, quantity: 2 as never, stats: 0n as never },
				{ item_id: 10001 as never, quantity: 1 as never, stats: 0n as never },
			] as never,
		});
		expect(formatTaskShort(t)).toBe("Craft 1 Hull Plates");
	});

	test("Craft includes the output quantity", () => {
		const t = task({
			type: 7 as never,
			cargo: [
				{ item_id: 101 as never, quantity: 30 as never, stats: 0n as never },
				{ item_id: 10001 as never, quantity: 5 as never, stats: 0n as never },
			] as never,
		});
		expect(formatTaskShort(t)).toBe("Craft 5 Hull Plates");
	});

	test("Craft with empty cargo is bare 'Craft' (defensive)", () => {
		expect(formatTaskShort(task({ type: 7 as never }))).toBe("Craft");
	});

	test("Deploy uses first cargo entry as the deployed item", () => {
		const t = task({
			type: 8 as never,
			cargo: [{ item_id: 10103 as never, quantity: 1 as never, stats: 0n as never }] as never,
		});
		expect(formatTaskShort(t)).toBe("Deploy Loader");
	});

	test("Wrap / Unwrap / Undeploy list cargo", () => {
		const wrap = task({
			type: 9 as never,
			cargo: [{ item_id: 101 as never, quantity: 5 as never, stats: 0n as never }] as never,
		});
		expect(formatTaskShort(wrap)).toBe("Wrap 5 Crude Ore");

		const unwrap = task({
			type: 10 as never,
			cargo: [{ item_id: 101 as never, quantity: 5 as never, stats: 0n as never }] as never,
		});
		expect(formatTaskShort(unwrap)).toBe("Unwrap 5 Crude Ore");

		const undeploy = task({
			type: 11 as never,
			cargo: [{ item_id: 10103 as never, quantity: 1 as never, stats: 0n as never }] as never,
		});
		expect(formatTaskShort(undeploy)).toBe("Undeploy 1 Loader");
	});

	test("WrapEntity / Demolish are bare verbs", () => {
		expect(formatTaskShort(task({ type: 12 as never }))).toBe("Wrap entity");
		expect(formatTaskShort(task({ type: 13 as never }))).toBe("Demolish");
	});
});

describe("formatDateTimeUTC", () => {
	test("formats ISO date and time with UTC suffix", () => {
		const d = new Date("2026-04-28T17:32:19Z");
		expect(formatDateTimeUTC(d)).toBe("2026-04-28 17:32:19 UTC");
	});

	test("zero-pads single-digit month, day, hour, minute, second", () => {
		const d = new Date("2026-01-05T03:07:09Z");
		expect(formatDateTimeUTC(d)).toBe("2026-01-05 03:07:09 UTC");
	});

	test("handles end-of-year boundary", () => {
		const d = new Date("2026-12-31T23:59:59Z");
		expect(formatDateTimeUTC(d)).toBe("2026-12-31 23:59:59 UTC");
	});
});
