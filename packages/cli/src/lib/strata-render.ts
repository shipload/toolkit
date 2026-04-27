import { encodeStats, type LocationStratum, type LocationType } from "@shipload/sdk";
import Table from "cli-table3";
import { formatItem, formatStats } from "./format";

export interface StrataRenderOpts {
	coords: { x: bigint; y: bigint };
	locationType: LocationType;
	locationTypeLabel: string;
	size: number;
	strata: LocationStratum[];
	reach?: { depth: number };
	showAll?: boolean;
	top?: number;
	sort?: "available" | "index";
}

interface PreparedRow {
	stratum: LocationStratum;
	reachable: boolean;
}

function prepareRows(opts: StrataRenderOpts): PreparedRow[] {
	const reach = opts.reach;
	const annotated: PreparedRow[] = opts.strata.map((s) => ({
		stratum: s,
		reachable: reach ? s.index <= reach.depth : true,
	}));

	const filtered = reach && !opts.showAll ? annotated.filter((r) => r.reachable) : annotated;

	const sort = opts.sort ?? "available";
	if (sort === "available") {
		filtered.sort((a, b) => b.stratum.reserve - a.stratum.reserve);
	} else {
		filtered.sort((a, b) => a.stratum.index - b.stratum.index);
	}

	if (opts.top != null && opts.top > 0) return filtered.slice(0, opts.top);
	return filtered;
}

function formatPercent(reserve: number, max: number): string {
	if (max === 0) return "—";
	const pct = Math.round((reserve / max) * 100);
	return `${pct}%`;
}

function reachLabel(opts: StrataRenderOpts, reachableCount: number): string {
	if (!opts.reach) return "";
	return `${reachableCount} reachable of ${opts.strata.length} · gatherer depth ${opts.reach.depth}`;
}

export function renderStrataTable(opts: StrataRenderOpts): string {
	const header = `Location (${opts.coords.x}, ${opts.coords.y}) — ${opts.locationTypeLabel}, ${opts.size} strata`;

	if (opts.strata.length === 0) {
		return [header, "  (no non-empty strata)"].join("\n");
	}

	const rows = prepareRows(opts);
	const reachableTotal = opts.strata.filter(
		(s) => !opts.reach || s.index <= opts.reach.depth,
	).length;

	if (rows.length === 0) {
		const lines = [header];
		if (opts.reach) {
			lines.push("  (no reachable strata)");
			lines.push(`  ${reachLabel(opts, reachableTotal)}`);
		} else {
			lines.push("  (none to display)");
		}
		return lines.join("\n");
	}

	const showReachCol = !!opts.reach && !!opts.showAll;
	const head: string[] = ["Idx", "Item", "Avail", "Initial", "%", "Rich", "Stats"];
	if (showReachCol) head.push("Reach");

	const table = new Table({
		head,
		chars: {
			top: "",
			"top-mid": "",
			"top-left": "",
			"top-right": "",
			bottom: "",
			"bottom-mid": "",
			"bottom-left": "",
			"bottom-right": "",
			left: "  ",
			"left-mid": "",
			mid: "",
			"mid-mid": "",
			right: "",
			"right-mid": "",
			middle: "  ",
		},
		style: {
			head: [],
			border: [],
			"padding-left": 0,
			"padding-right": 0,
		},
	});

	for (const r of rows) {
		const s = r.stratum;
		const cells: string[] = [
			String(s.index),
			formatItem(s.itemId),
			String(s.reserve),
			String(s.reserveMax),
			formatPercent(s.reserve, s.reserveMax),
			String(s.richness),
			s.stats
				? formatStats(encodeStats([s.stats.stat1, s.stats.stat2, s.stats.stat3]), s.itemId)
				: "",
		];
		if (showReachCol) cells.push(r.reachable ? "✓" : "OOD");
		table.push(cells);
	}

	const tableStr = table
		.toString()
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n");

	const lines = [header, tableStr];

	const totalEligible = opts.reach && !opts.showAll ? reachableTotal : opts.strata.length;
	if (rows.length < totalEligible) {
		const hints: string[] = [];
		if (opts.top != null && opts.top > 0) hints.push("--top 0 for all");
		if (opts.reach && !opts.showAll && reachableTotal < opts.strata.length) {
			hints.push("--all to include OOD");
		}
		const hintStr = hints.length ? ` — ${hints.join(", ")}` : "";
		lines.push(`  (showing ${rows.length} of ${totalEligible})${hintStr}`);
	}
	if (opts.reach) {
		lines.push(`  ${reachLabel(opts, reachableTotal)}`);
	}

	return lines.join("\n");
}

export function renderStrata(opts: StrataRenderOpts, asJson: boolean): string {
	if (asJson) return JSON.stringify(strataToJsonShape(opts), null, 2);
	return renderStrataTable(opts);
}

export function strataToJsonShape(opts: StrataRenderOpts): unknown {
	const rows = prepareRows(opts);
	const reachableTotal = opts.strata.filter(
		(s) => !opts.reach || s.index <= opts.reach.depth,
	).length;
	return {
		coords: { x: Number(opts.coords.x), y: Number(opts.coords.y) },
		location_type: opts.locationType,
		location_type_label: opts.locationTypeLabel,
		size: opts.size,
		strata: rows.map((r) => ({
			index: r.stratum.index,
			item_id: r.stratum.itemId,
			reserve: r.stratum.reserve,
			reserve_max: r.stratum.reserveMax,
			richness: r.stratum.richness,
			seed: r.stratum.seed.toString(),
			stats: r.stratum.stats,
			reachable: opts.reach ? r.reachable : undefined,
		})),
		reach: opts.reach ?? undefined,
		truncated:
			opts.top != null && opts.top > 0
				? rows.length < (opts.reach && !opts.showAll ? reachableTotal : opts.strata.length)
				: false,
	};
}
