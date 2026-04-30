import { describe, expect, test } from "bun:test";
import { Checksum256 } from "@wharfkit/antelope";
import { formatCargoTable } from "../../src/lib/cargo-table";
import {
	formatInstallHint,
	formatLocation,
	formatOutput,
	formatReserve,
	formatResolveHint,
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
