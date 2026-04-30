import { describe, expect, test } from "bun:test";
import { encodeStats } from "@shipload/sdk";
import { formatItemStats } from "../../src/lib/item-stats";

describe("formatItemStats", () => {
	test("returns empty string for zero stats", () => {
		expect(formatItemStats(101, 0n)).toBe("");
	});

	test("labels ore stats with ore abbreviations", () => {
		const packed = encodeStats([500, 400, 300]);
		expect(formatItemStats(101, packed)).toBe("STR 500 / TOL 400 / DEN 300");
	});

	test("labels biomass stats with biomass abbreviations", () => {
		const packed = encodeStats([276, 198, 234]);
		expect(formatItemStats(501, packed)).toBe("PLA 276 / INS 198 / SAT 234");
	});

	test("pads stat values to 3 chars for column alignment", () => {
		const packed = encodeStats([30, 233, 94]);
		expect(formatItemStats(101, packed)).toBe("STR  30 / TOL 233 / DEN  94");
	});
});
