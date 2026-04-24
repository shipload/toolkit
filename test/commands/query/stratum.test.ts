import { expect, test } from "bun:test";
import { renderDetail, renderList } from "../../../src/commands/query/stratum";

test("stratum detail renders item, reserve, richness", () => {
	const out = renderDetail(
		{ item_id: 101, reserve: 1000, seed: "abc", richness: 50 } as any,
		null,
		0,
	);
	expect(out).toContain("1000");
	expect(out).toContain("101");
});

test("stratum list renders header and per-row non-empty strata", () => {
	const out = renderList({
		x: 10n,
		y: 20n,
		locationTypeLabel: "Asteroid",
		size: 64,
		rows: [
			{ index: 3, itemId: 101, reserve: 12000, richness: 64, stats: 0n },
			{ index: 17, itemId: 201, reserve: 8400, richness: 72, stats: 0n },
		],
	});
	expect(out).toContain("(10, 20)");
	expect(out).toContain("Asteroid");
	expect(out).toContain("64 strata");
	expect(out).toContain("[  3]");
	expect(out).toContain("12000");
});

test("stratum list is empty when no non-empty strata", () => {
	const out = renderList({
		x: 0n,
		y: 0n,
		locationTypeLabel: "Empty",
		size: 0,
		rows: [],
	});
	expect(out.toLowerCase()).toContain("no non-empty strata");
});

const reachRows = [
	{ index: 42, itemId: 101, reserve: 15, richness: 400, stats: 0n },
	{ index: 624, itemId: 501, reserve: 16, richness: 410, stats: 0n },
	{ index: 705, itemId: 501, reserve: 45, richness: 541, stats: 0n },
];

test("renderList with reach hides out-of-depth rows by default", () => {
	const out = renderList(
		{ x: 0n, y: 0n, locationTypeLabel: "Planet", size: 3618, rows: reachRows },
		{ depth: 100, showAll: false },
	);
	expect(out).toContain("[ 42]");
	expect(out).not.toContain("[624]");
	expect(out).not.toContain("[705]");
	expect(out).toContain("1 reachable of 3 · gatherer depth 100");
});

test("renderList with reach + showAll marks unreachable rows with OOD and includes legend", () => {
	const out = renderList(
		{ x: 0n, y: 0n, locationTypeLabel: "Planet", size: 3618, rows: reachRows },
		{ depth: 100, showAll: true },
	);
	expect(out).toContain("[ 42]");
	expect(out).toContain("[624]");
	expect(out).toContain("[705]");
	expect(out).toMatch(/\[624\].* OOD/);
	expect(out).toMatch(/\[705\].* OOD/);
	expect(out).not.toMatch(/\[ 42\].* OOD/);
	expect(out).toContain("1 reachable of 3 · gatherer depth 100");
	expect(out).toContain("OOD = out of depth");
});

test("renderList without reach parameter is unchanged", () => {
	const out = renderList({
		x: 0n,
		y: 0n,
		locationTypeLabel: "Planet",
		size: 3618,
		rows: reachRows,
	});
	expect(out).toContain("[ 42]");
	expect(out).toContain("[624]");
	expect(out).toContain("[705]");
	expect(out).not.toContain("OOD");
	expect(out).not.toContain("reachable");
});
