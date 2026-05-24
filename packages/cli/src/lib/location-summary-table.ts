import { encodeStats } from "@shipload/sdk";
import Table from "cli-table3";
import { formatCoordinatePair, formatDuration, formatItem, jsonStringify } from "./format";
import { formatItemStats } from "./item-stats";
import { type LocationSummary, locationSummaryToJson } from "./location-summary";

export type LocationColumn =
	| "coords"
	| "type"
	| "subtype"
	| "size"
	| "distance"
	| "energy"
	| "time"
	| "resource"
	| "depth"
	| "reserve"
	| "stats"
	| "reach";

export interface LocationSummaryTableOptions {
	columns: LocationColumn[];
	indent?: string;
	expand?: boolean;
	maxEnergy?: number;
}

const COLUMN_HEADERS: Record<LocationColumn, string> = {
	coords: "Location",
	type: "Type",
	subtype: "Subtype",
	size: "Strata",
	distance: "Dist",
	energy: "Energy",
	time: "Time",
	resource: "Resource",
	depth: "Depth",
	reserve: "Reserve",
	stats: "Stats",
	reach: "Reachable",
};

const RIGHT_ALIGNED: Set<LocationColumn> = new Set([
	"size",
	"distance",
	"energy",
	"time",
	"depth",
	"reserve",
	"reach",
]);

function formatStats(itemId: number, stats: { stat1: number; stat2: number; stat3: number }): string {
	if (stats.stat1 === 0 && stats.stat2 === 0 && stats.stat3 === 0) return "";
	return formatItemStats(itemId, encodeStats([stats.stat1, stats.stat2, stats.stat3]));
}

function formatEnergy(cost: number, max?: number): string {
	if (max && max > 0) return `${cost}/${max}`;
	return String(cost);
}

function formatReachCell(s: LocationSummary): string {
	if (s.size === 0) return "—";
	return `${s.reachableNonEmpty}/${s.totalNonEmpty}`;
}

function summaryRow(
	s: LocationSummary,
	columns: LocationColumn[],
	opts: LocationSummaryTableOptions,
	resourceIdx: number | null,
): string[] {
	const lead = resourceIdx === null ? s.resources[0] : s.resources[resourceIdx];
	const showLocCells = resourceIdx === null || resourceIdx === 0;
	const row: string[] = [];
	for (const col of columns) {
		switch (col) {
			case "coords":
				row.push(showLocCells ? formatCoordinatePair(s.coords) : "");
				break;
			case "type":
				row.push(showLocCells ? s.typeLabel : "");
				break;
			case "subtype":
				row.push(showLocCells ? (s.subtypeLabel ?? "") : "");
				break;
			case "size":
				row.push(showLocCells ? (s.size > 0 ? String(s.size) : "—") : "");
				break;
			case "distance":
				row.push(showLocCells ? (s.distance !== undefined ? String(s.distance) : "") : "");
				break;
			case "energy":
				row.push(
					showLocCells
						? s.energyCost !== undefined
							? formatEnergy(s.energyCost, opts.maxEnergy)
							: ""
						: "",
				);
				break;
			case "time":
				row.push(
					showLocCells ? (s.flightTimeS !== undefined ? formatDuration(s.flightTimeS) : "") : "",
				);
				break;
			case "resource":
				row.push(lead ? formatItem(lead.itemId) : showLocCells ? "—" : "");
				break;
			case "depth":
				row.push(lead ? String(lead.index) : "");
				break;
			case "reserve":
				row.push(lead ? String(lead.reserve) : "");
				break;
			case "stats":
				row.push(lead ? formatStats(lead.itemId, lead.stats) : "");
				break;
			case "reach":
				row.push(showLocCells ? formatReachCell(s) : "");
				break;
		}
	}
	if (resourceIdx !== null && resourceIdx > 0 && lead && !lead.reachable) {
		const reachIdx = columns.indexOf("reach");
		if (reachIdx >= 0) row[reachIdx] = "OOD";
	}
	return row;
}

export function formatLocationSummaryTable(
	summaries: LocationSummary[],
	opts: LocationSummaryTableOptions,
): string {
	if (summaries.length === 0) return "";
	const indent = opts.indent ?? "  ";
	const columns = opts.columns;

	const colAligns = columns.map((c) => (RIGHT_ALIGNED.has(c) ? "right" : "left")) as (
		| "left"
		| "right"
	)[];

	const table = new Table({
		head: columns.map((c) => COLUMN_HEADERS[c]),
		colAligns,
		chars: {
			top: "",
			"top-mid": "",
			"top-left": "",
			"top-right": "",
			bottom: "",
			"bottom-mid": "",
			"bottom-left": "",
			"bottom-right": "",
			left: indent,
			"left-mid": "",
			mid: "",
			"mid-mid": "",
			right: "",
			"right-mid": "",
			middle: "  ",
		},
		style: { head: [], border: [], "padding-left": 0, "padding-right": 0 },
	});

	for (const s of summaries) {
		if (!opts.expand || s.resources.length === 0) {
			table.push(summaryRow(s, columns, opts, null));
			continue;
		}
		for (let i = 0; i < s.resources.length; i++) {
			table.push(summaryRow(s, columns, opts, i));
		}
	}

	return table
		.toString()
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n");
}

export function summariesToJson(summaries: LocationSummary[]): unknown {
	return summaries.map(locationSummaryToJson);
}
