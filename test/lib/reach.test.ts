import { describe, expect, test } from "bun:test";
import { isReachable, reachLegend } from "../../src/lib/reach";

describe("isReachable", () => {
	test("stratum index equal to or below depth is reachable", () => {
		expect(isReachable(0, 100)).toBe(true);
		expect(isReachable(99, 100)).toBe(true);
		expect(isReachable(100, 100)).toBe(true);
	});
	test("stratum index above depth is not reachable", () => {
		expect(isReachable(101, 100)).toBe(false);
		expect(isReachable(9999, 100)).toBe(false);
	});
});

describe("reachLegend", () => {
	test("summary line shows reachable of total and depth", () => {
		expect(reachLegend(12, 48, 100)).toBe("12 reachable of 48 · gatherer depth 100");
	});
	test("summary line with zero reachable", () => {
		expect(reachLegend(0, 66, 100)).toBe("0 reachable of 66 · gatherer depth 100");
	});
});

import { Checksum256 } from "@wharfkit/antelope";
import { shallowestPerItem } from "../../src/lib/reach";

describe("shallowestPerItem", () => {
	const gameSeed = Checksum256.from(
		"0000000000000000000000000000000000000000000000000000000000000000",
	);
	const epochSeed = Checksum256.from(
		"1111111111111111111111111111111111111111111111111111111111111111",
	);

	test("returns [] for empty-space cells", () => {
		let empty: { x: number; y: number } | null = null;
		for (let r = 0; r < 10 && !empty; r++) {
			for (let dx = -r; dx <= r && !empty; dx++) {
				for (let dy = -r; dy <= r && !empty; dy++) {
					const c = { x: dx, y: dy };
					const res = shallowestPerItem(gameSeed, epochSeed, c);
					if (res.length === 0) empty = c;
				}
			}
		}
		expect(empty).not.toBeNull();
	});

	test("maxDepth prunes iteration (cheap path returns subset of full walk)", () => {
		const full = shallowestPerItem(gameSeed, epochSeed, { x: 0, y: 0 });
		const shallow = shallowestPerItem(gameSeed, epochSeed, { x: 0, y: 0 }, 50);
		expect(shallow.length).toBeLessThanOrEqual(full.length);
		for (const s of shallow) expect(s.index).toBeLessThanOrEqual(50);
	});
});
