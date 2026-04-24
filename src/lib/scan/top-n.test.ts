import { describe, expect, test } from "bun:test";
import { TopN } from "./top-n";
import type { LeaderboardEntry } from "./types";

function entry(
	x: number,
	y: number,
	stats: { stat1: number; stat2: number; stat3: number },
): LeaderboardEntry {
	return {
		coord: { x, y },
		locType: 1 as any,
		subtype: 0,
		itemId: 100,
		itemName: "Test",
		stratum: 0,
		richness: 500,
		reserve: 100,
		stats,
	};
}

describe("TopN", () => {
	test("keeps only N best by max(stats), sum tiebreak", () => {
		const top = new TopN(2);
		top.ingest(entry(1, 0, { stat1: 900, stat2: 100, stat3: 100 }));
		top.ingest(entry(2, 0, { stat1: 950, stat2: 100, stat3: 100 }));
		top.ingest(entry(3, 0, { stat1: 910, stat2: 500, stat3: 100 }));
		top.ingest(entry(4, 0, { stat1: 50, stat2: 50, stat3: 50 }));
		const result = top.snapshot();
		expect(result).toHaveLength(2);
		expect(result[0].coord.x).toBe(2);
		expect(result[1].coord.x).toBe(3);
	});

	test("tiebreak uses sum when max is equal", () => {
		const top = new TopN(2);
		top.ingest(entry(1, 0, { stat1: 900, stat2: 100, stat3: 100 }));
		top.ingest(entry(2, 0, { stat1: 900, stat2: 500, stat3: 500 }));
		const result = top.snapshot();
		expect(result[0].coord.x).toBe(2);
		expect(result[1].coord.x).toBe(1);
	});

	test("handles fewer ingests than N", () => {
		const top = new TopN(5);
		top.ingest(entry(1, 0, { stat1: 500, stat2: 500, stat3: 500 }));
		expect(top.snapshot()).toHaveLength(1);
	});
});
