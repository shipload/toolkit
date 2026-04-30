import { encodeStats, type LocationStratum, type LocationType } from "@shipload/sdk";
import Table from "cli-table3";
import { renderEntityForGather } from "./entity-header";
import { formatDuration, formatItem } from "./format";
import { formatItemStats } from "./item-stats";
import type {
	GatherBudget,
	GathererCaps,
	MaxQuantityBound,
	StratumGatherMetrics,
} from "./gatherable";

export interface GatherableRow {
	stratum: LocationStratum;
	reachable: boolean;
	metrics: StratumGatherMetrics;
}

export interface GatherableRenderOpts {
	entityType: string;
	entityId: bigint;
	entityName?: string;
	coords: { x: bigint; y: bigint };
	projected: boolean;
	locationType: LocationType;
	locationTypeLabel: string;
	size: number;
	caps: GathererCaps;
	budget: GatherBudget;
	energyCapacity: number;
	cargoCapacityKg: number;
	quantity: number;
	rows: GatherableRow[];
	totalStrata: number;
	reachableTotal: number;
	showAll: boolean;
	top?: number;
}

function header(opts: GatherableRenderOpts): string {
	return renderEntityForGather({
		entityType: opts.entityType,
		entityId: opts.entityId,
		entityName: opts.entityName,
		coords: opts.coords,
		caps: opts.caps,
		energy: opts.budget.energy,
		energyCapacity: opts.energyCapacity,
		cargoFreeKg: opts.budget.cargoFreeKg,
		cargoCapacityKg: opts.cargoCapacityKg,
		quantity: opts.quantity,
		locationContext: `${opts.locationTypeLabel}, ${opts.size} strata`,
		projected: opts.projected,
	});
}

function formatBound(bound: MaxQuantityBound): string {
	if (!bound) return "";
	return ` (${bound})`;
}

export function renderGatherableTable(opts: GatherableRenderOpts): string {
	const headerStr = header(opts);

	if (opts.totalStrata === 0) {
		return [headerStr, "  (no non-empty strata)"].join("\n");
	}
	if (opts.rows.length === 0) {
		const lines = [headerStr];
		lines.push(opts.reachableTotal === 0 ? "  (no reachable strata)" : "  (none to display)");
		lines.push(
			`  ${opts.reachableTotal} reachable of ${opts.totalStrata} · gatherer depth ${opts.caps.depth}`,
		);
		return lines.join("\n");
	}

	const showReachCol = opts.showAll && opts.reachableTotal < opts.totalStrata;
	const head = ["Idx", "Item", "Avail", "Rich", "Stats", "Time", "Energy", "Max"];
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

	for (const r of opts.rows) {
		const s = r.stratum;
		const m = r.metrics;
		const cells: string[] = [
			String(s.index),
			formatItem(s.itemId),
			String(s.reserve),
			String(s.richness),
			s.stats
				? formatItemStats(s.itemId, encodeStats([s.stats.stat1, s.stats.stat2, s.stats.stat3]))
				: "",
			r.reachable && m.gatherable ? formatDuration(m.timeS) : "—",
			r.reachable && m.gatherable ? String(m.energyCost) : "—",
			r.reachable && m.gatherable ? `${m.maxQuantity}${formatBound(m.maxQuantityBound)}` : "—",
		];
		if (showReachCol) cells.push(r.reachable ? "✓" : "OOD");
		table.push(cells);
	}

	const tableStr = table
		.toString()
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n");

	const lines = [headerStr, tableStr];

	const totalEligible = opts.showAll ? opts.totalStrata : opts.reachableTotal;
	if (opts.rows.length < totalEligible) {
		const hints: string[] = [];
		if (opts.top != null && opts.top > 0) hints.push("--top 0 for all");
		if (!opts.showAll && opts.reachableTotal < opts.totalStrata) hints.push("--all to include OOD");
		const hintStr = hints.length ? ` — ${hints.join(", ")}` : "";
		lines.push(`  (showing ${opts.rows.length} of ${totalEligible})${hintStr}`);
	}
	lines.push(
		`  ${opts.reachableTotal} reachable of ${opts.totalStrata} · gatherer depth ${opts.caps.depth}`,
	);

	return lines.join("\n");
}

export function gatherableToJsonShape(opts: GatherableRenderOpts): unknown {
	return {
		entity: {
			type: opts.entityType,
			id: Number(opts.entityId),
			name: opts.entityName,
		},
		projected: opts.projected,
		coords: { x: Number(opts.coords.x), y: Number(opts.coords.y) },
		location_type: opts.locationType,
		location_type_label: opts.locationTypeLabel,
		size: opts.size,
		entity_capability: {
			gatherer: opts.caps,
			energy: opts.budget.energy,
			energy_capacity: opts.energyCapacity,
			cargo_free_kg: opts.budget.cargoFreeKg,
			cargo_capacity_kg: opts.cargoCapacityKg,
		},
		quantity: opts.quantity,
		strata: opts.rows.map((r) => ({
			index: r.stratum.index,
			item_id: r.stratum.itemId,
			item_mass_kg: r.metrics.itemMassKg,
			reserve: r.stratum.reserve,
			reserve_max: r.stratum.reserveMax,
			richness: r.stratum.richness,
			seed: r.stratum.seed.toString(),
			stats: r.stratum.stats,
			reachable: r.reachable,
			gather: {
				time_s: r.metrics.timeS,
				energy_cost: r.metrics.energyCost,
				max_quantity: r.metrics.maxQuantity,
				max_quantity_bound: r.metrics.maxQuantityBound,
			},
		})),
		reach: { depth: opts.caps.depth },
		reachable_total: opts.reachableTotal,
		total_strata: opts.totalStrata,
		truncated: opts.top != null && opts.top > 0 && opts.rows.length < (opts.showAll ? opts.totalStrata : opts.reachableTotal),
	};
}
