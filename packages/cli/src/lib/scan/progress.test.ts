import { describe, expect, test } from "bun:test";
import { formatDuration, formatProgressLine } from "./progress";

describe("formatDuration", () => {
	test("formats mm:ss", () => {
		expect(formatDuration(0)).toBe("00:00");
		expect(formatDuration(5)).toBe("00:05");
		expect(formatDuration(65)).toBe("01:05");
		expect(formatDuration(3600)).toBe("60:00");
	});
});

describe("formatProgressLine", () => {
	test("formats a progress line with all counters and ETA", () => {
		const line = formatProgressLine({
			cellsDone: 15200,
			cellsTotal: 125000,
			locations: 7403,
			strata: 41211,
			elapsedSeconds: 23,
			etaSeconds: 165,
		});
		expect(line).toBe(
			"[12%] 15200/125000 cells · 7403 locations · 41211 strata · elapsed 00:23 · ETA 02:45",
		);
	});

	test("caps percent at 100", () => {
		const line = formatProgressLine({
			cellsDone: 100,
			cellsTotal: 100,
			locations: 0,
			strata: 0,
			elapsedSeconds: 1,
			etaSeconds: 0,
		});
		expect(line.startsWith("[100%]")).toBe(true);
	});
});
