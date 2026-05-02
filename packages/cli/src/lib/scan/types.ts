import type { LocationType } from "@shipload/sdk";

export interface StatTriple {
	stat1: number;
	stat2: number;
	stat3: number;
}

export interface LeaderboardEntry {
	coord: { x: number; y: number };
	locType: LocationType;
	subtype: number;
	itemId: number;
	itemName: string;
	stratum: number;
	richness: number;
	reserve: number;
	stats: StatTriple;
}

export interface HistogramSnapshot {
	stat1: number[];
	stat2: number[];
	stat3: number[];
	combined: number[];
	totalSamples: number;
}

export interface MultiHighSnapshot {
	tiers: Array<{
		threshold: number;
		atLeast1: number;
		atLeast2: number;
		atLeast3: number;
	}>;
	totalStrata: number;
}

export interface WorkerInput {
	gameSeed: string;
	epochSeed: string;
	cells: Array<{ x: number; y: number }>;
	threshold: number;
	topN: number;
}

export interface WorkerProgress {
	type: "progress";
	cellsDone: number;
	locations: number;
	strata: number;
}

export interface WorkerResult {
	type: "result";
	histogram: HistogramSnapshot;
	multiHigh: MultiHighSnapshot;
	leaderboard: LeaderboardEntry[];
	locationCounts: { planets: number; asteroids: number; nebulas: number; iceFields: number };
	strataCount: number;
	cellsScanned: number;
}
