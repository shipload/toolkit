import { getLocationTypeName, LocationType, RESERVE_TIERS } from "@shipload/sdk";
import type { Checksum256 } from "@wharfkit/antelope";
import { formatDuration } from "./progress";
import type { HistogramSnapshot, LeaderboardEntry, MultiHighSnapshot } from "./types";

function tierLabel(reserve: number): string {
	if (reserve === 0) return "-";
	if (reserve <= RESERVE_TIERS.small.max) return "small";
	if (reserve >= RESERVE_TIERS.medium.min && reserve <= RESERVE_TIERS.medium.max) return "medium";
	if (reserve >= RESERVE_TIERS.large.min && reserve <= RESERVE_TIERS.large.max) return "large";
	if (reserve >= RESERVE_TIERS.massive.min && reserve <= RESERVE_TIERS.massive.max)
		return "massive";
	if (reserve >= RESERVE_TIERS.motherlode.min) return "motherlode";
	return "?";
}

export interface ReportHeader {
	gameSeed: Checksum256;
	epochSeed: Checksum256;
	radius: number;
	cellsTotal: number;
	cellsScanned: number;
	runtimeSeconds: number;
	locationCounts: { planets: number; asteroids: number; nebulas: number };
	strata: number;
	threshold: number;
}

function shortSeed(seed: Checksum256): string {
	return `${String(seed).slice(0, 8)}…`;
}

function pct(n: number, total: number): string {
	if (total === 0) return "0%";
	const v = (n / total) * 100;
	if (v === 0) return "0%";
	if (v < 0.001) return "<0.001%";
	return `${v.toFixed(v < 1 ? 3 : 2)}%`;
}

function bar(n: number, max: number, width = 40): string {
	if (max === 0) return "";
	const filled = Math.round((n / max) * width);
	return "█".repeat(filled) + "░".repeat(width - filled);
}

export function renderHeader(h: ReportHeader): string {
	const totalLocs =
		h.locationCounts.planets + h.locationCounts.asteroids + h.locationCounts.nebulas;
	return [
		"Resource Scan Report",
		`  game seed:  ${shortSeed(h.gameSeed)}`,
		`  epoch seed: ${shortSeed(h.epochSeed)}`,
		`  radius:     ${h.radius}  (scanned ${h.cellsScanned} / ${h.cellsTotal} cells)`,
		`  runtime:    ${formatDuration(h.runtimeSeconds)}`,
		`  locations:  ${totalLocs} non-empty`,
		`              planets   ${h.locationCounts.planets}`,
		`              asteroids ${h.locationCounts.asteroids}`,
		`              nebulas   ${h.locationCounts.nebulas}`,
		`  strata:     ${h.strata} with reserve > 0`,
		`  threshold:  ${h.threshold}`,
	].join("\n");
}

function renderStatColumn(label: string, buckets: number[], totalForPct: number): string {
	const max = Math.max(...buckets, 1);
	const lines = [`${label}`];
	for (let i = 9; i >= 0; i--) {
		const lo = i * 100;
		const hi = i === 9 ? 999 : lo + 99;
		const count = buckets[i];
		const range = `${String(lo).padStart(3)}-${String(hi).padStart(3)}`;
		lines.push(
			`  ${range}  ${String(count).padStart(7)}  ${pct(count, totalForPct).padStart(7)}  ${bar(count, max, 24)}`,
		);
	}
	return lines.join("\n");
}

export function renderHistogram(hist: HistogramSnapshot): string {
	const perStatTotal = hist.totalSamples;
	const combinedTotal = hist.totalSamples * 3;
	return [
		"Stat histogram",
		"",
		renderStatColumn("stat1", hist.stat1, perStatTotal),
		"",
		renderStatColumn("stat2", hist.stat2, perStatTotal),
		"",
		renderStatColumn("stat3", hist.stat3, perStatTotal),
		"",
		renderStatColumn("combined", hist.combined, combinedTotal),
	].join("\n");
}

export function renderMultiHigh(mh: MultiHighSnapshot): string {
	const header =
		"  tier" +
		"    ≥1 high".padStart(16) +
		"    ≥2 high".padStart(16) +
		"    ≥3 high".padStart(16);
	const rows = mh.tiers.map((t) => {
		const cell = (n: number) =>
			`${String(n).padStart(7)} (${pct(n, mh.totalStrata)})`.padStart(16);
		return `  ${String(t.threshold).padStart(4)}${cell(t.atLeast1)}${cell(t.atLeast2)}${cell(t.atLeast3)}`;
	});
	return ["Multi-high rarity", "", header, ...rows].join("\n");
}

export function renderLeaderboard(
	entries: LeaderboardEntry[],
	threshold: number,
	markDepth?: number,
): string {
	if (entries.length === 0) return "Top leaderboard\n\n  (no strata scanned)";
	const headers = [
		"#",
		"coord",
		"location",
		"index",
		"resource",
		"rich",
		"reserve",
		"tier",
		"stat1",
		"stat2",
		"stat3",
	];
	if (markDepth !== undefined) headers.push("");
	const rows = entries.map((e, i) => {
		const subtypeLabel = e.locType === LocationType.PLANET ? ` (sub ${e.subtype})` : "";
		const locLabel = `${getLocationTypeName(e.locType)}${subtypeLabel}`;
		const stat = (v: number) => (v >= threshold ? `*${v}*` : `${v}`);
		const base = [
			String(i + 1),
			`(${e.coord.x}, ${e.coord.y})`,
			locLabel,
			String(e.stratum),
			e.itemName,
			String(e.richness),
			String(e.reserve),
			tierLabel(e.reserve),
			stat(e.stats.stat1),
			stat(e.stats.stat2),
			stat(e.stats.stat3),
		];
		if (markDepth !== undefined) base.push(e.stratum > markDepth ? "OOD" : "");
		return base;
	});
	const all = [headers, ...rows];
	const widths = headers.map((_, col) => Math.max(...all.map((r) => r[col].length)));
	const fmt = (row: string[]) => row.map((cell, col) => cell.padEnd(widths[col])).join("  ");
	const lines = [
		"Top leaderboard",
		"",
		`  ${fmt(headers)}`,
		...all.slice(1).map((r) => `  ${fmt(r)}`),
	];
	if (markDepth !== undefined) lines.push("", "OOD = out of depth");
	return lines.join("\n");
}
