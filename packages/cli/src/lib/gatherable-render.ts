import { encodeStats, formatMass, type LocationStratum, type LocationType } from "@shipload/sdk";
import Table from "cli-table3";
import { formatDuration, formatItem, formatStats } from "./format";
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

function header(opts: GatherableRenderOpts): string[] {
	const trimmedName = opts.entityName?.trim() ?? "";
	const namePart = trimmedName ? ` "${trimmedName}"` : "";
	const projectedTag = opts.projected ? " (projected)" : "";
	const locationTag = `[${opts.locationTypeLabel}, ${opts.size} strata]`;
	const title = `${opts.entityType} ${opts.entityId}${namePart} — gatherable at (${opts.coords.x}, ${opts.coords.y})${projectedTag}   ${locationTag}`;

	const c = opts.caps;
	const gatherer = `yield ${c.yield} · depth ${c.depth} · speed ${c.speed} · ${c.drain} energy/s`;

	const energyBudget = `${opts.budget.energy}/${opts.energyCapacity}${opts.projected ? " (projected)" : ""}`;
	const cargoBudget = `${formatMass(opts.budget.cargoFreeKg)} / ${formatMass(opts.cargoCapacityKg)} free${opts.projected ? " (projected)" : ""}`;

	return [
		title,
		`  Gatherer:  ${gatherer}`,
		`  Energy:    ${energyBudget}       Cargo:    ${cargoBudget}`,
		`  Quantity:  ${opts.quantity}`,
	];
}

function formatBound(bound: MaxQuantityBound): string {
	if (!bound) return "";
	return ` (${bound})`;
}

export function renderGatherableTable(opts: GatherableRenderOpts): string {
	const headerLines = header(opts);

	if (opts.totalStrata === 0) {
		return [...headerLines, "  (no non-empty strata)"].join("\n");
	}
	if (opts.rows.length === 0) {
		const lines = [...headerLines];
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
				? formatStats(encodeStats([s.stats.stat1, s.stats.stat2, s.stats.stat3]), s.itemId)
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

	const lines = [...headerLines, tableStr];

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
