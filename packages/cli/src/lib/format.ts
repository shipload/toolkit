import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveStratum,
	displayName,
	formatMass,
	LocationType,
	PRECISION,
	resolveItem,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";
import Table from "cli-table3";
import type { ServerTypes } from "@shipload/sdk";
import { buildLocationSummary, type LocationSummary } from "./location-summary";
import {
	formatLocationSummaryTable,
	type LocationColumn,
	summariesToJson,
} from "./location-summary-table";

export function kvTable(rows: [string, string][], opts: { indent?: string } = {}): string {
	const indent = opts.indent ?? "  ";
	const table = new Table({
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
	for (const row of rows) table.push(row);
	return table
		.toString()
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n");
}

const LOCATION_TYPE_NAMES: Record<LocationType, string> = {
	[LocationType.EMPTY]: "Empty",
	[LocationType.PLANET]: "Planet",
	[LocationType.ASTEROID]: "Asteroid",
	[LocationType.NEBULA]: "Nebula",
	[LocationType.ICE_FIELD]: "Ice Field",
};

const TASK_TYPES = [
	"Idle",
	"Travel",
	"Recharge",
	"Load",
	"Unload",
	"Gather",
	"Warp",
	"Craft",
	"Deploy",
	"Wrap",
	"Unwrap",
	"Undeploy",
	"WrapEntity",
	"Demolish",
];

export function formatTaskType(type: number): string {
	return TASK_TYPES[type] ?? `Unknown(${type})`;
}

function itemDisplayName(itemId: number): string | null {
	try {
		return displayName(resolveItem(itemId));
	} catch {
		return null;
	}
}

export function formatTaskShort(t:ServerTypes.task): string {
	const label = formatTaskType(Number(t.type));
	const parts: string[] = [label];
	if (t.coordinates) parts.push(`to ${formatCoords(t.coordinates)}`);
	if (t.entitytarget) {
		parts.push(`→ ${String(t.entitytarget.entity_type)} ${String(t.entitytarget.entity_id)}`);
	}
	const cargo = t.cargo ?? [];
	if (cargo.length === 1) {
		const c = cargo[0];
		parts.push(
			`× ${Number(c.quantity)} ${itemDisplayName(Number(c.item_id)) ?? `Item ${Number(c.item_id)}`}`,
		);
	} else if (cargo.length > 1) {
		parts.push(`× ${cargo.length} item types`);
	}
	return parts.join(" ");
}

export function formatEnergy(storedEnergy: number, capacity: number, recharge: number): string {
	return `${storedEnergy} / ${capacity}  (recharge ${recharge}/s)`;
}

export function projectEnergy(
	storedEnergy: number,
	capacity: number,
	recharge: number,
	drainPerSec: number,
	elapsed_s: number,
): number {
	return Math.max(
		0,
		Math.min(capacity, Math.round(storedEnergy + (recharge - drainPerSec) * elapsed_s)),
	);
}

export function formatTimeUTC(d: Date): string {
	return `${d.toISOString().slice(11, 19)} UTC`;
}

export function formatDateTimeUTC(d: Date): string {
	return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

export function formatCargoUsage(used: number, capacity?: number): string {
	return capacity != null ? `${formatMass(used)} / ${formatMass(capacity)}` : formatMass(used);
}

export function formatCoords(coords:ServerTypes.coordinates): string {
	return `(${coords.x}, ${coords.y})`;
}

export function reltime(d: Date, now: Date): string {
	const diffMs = d.getTime() - now.getTime();
	const abs = Math.abs(diffMs);
	const secs = Math.floor(abs / 1000);
	const mins = Math.floor(secs / 60);
	const hours = Math.floor(mins / 60);
	let label: string;
	if (hours >= 1) label = `${hours}h ${mins % 60}m`;
	else if (mins >= 1) label = `${mins}m ${secs % 60}s`;
	else label = `${secs}s`;
	return diffMs >= 0 ? `${label} left` : `${label} ago`;
}

export function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`;
	const h = Math.floor(m / 60);
	const rem = m % 60;
	return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function formatItem(itemId: number): string {
	const name = itemDisplayName(itemId);
	return name ? `${name} (id:${itemId})` : `Item ${itemId}`;
}

export function formatInstallHint(
	entityType: string,
	entityId: number | bigint,
	slotIndex: number | string,
	slotName: string,
): string {
	return `(empty ${slotName} slot — install with: shiploadcli ${entityType} ${entityId} addmodule ${slotIndex} <module-item-id>)`;
}

export function formatResolveHint(
	entityType: string,
	entityId: number | bigint,
	completedCount: number,
): string {
	return `${completedCount} completed task(s) need resolve — run: shiploadcli ${entityType} ${entityId} resolve`;
}

export function formatReserve(reserve: number, reserveMax: number): string {
	if (reserveMax === 0) return "0";
	if (reserve === reserveMax) return `${reserveMax}`;
	const pct = Math.round((reserve / reserveMax) * 100);
	return `${reserve}/${reserveMax} (${pct}%)`;
}

export function formatEntityRef(ref: { entityType: string; entityId: number | bigint }): string {
	return `${ref.entityType}:${ref.entityId}`;
}

export function formatPlayer(player:ServerTypes.player_info): string {
	const lines = [
		`${player.company_name || "No Company"} (${player.owner})`,
		`Ships: ${player.ship_count} | Warehouses: ${player.warehouse_count} | Containers: ${player.container_count}`,
	];
	if (!player.is_player) {
		lines.unshift("[Not in game]");
	}
	return lines.join("\n");
}

export function formatLocation(
	location:ServerTypes.location_info,
	gameSeed?: Checksum256Type,
	epochSeed?: Checksum256Type,
	reach?: { depth: number; showAll: boolean },
): string {
	const coords = formatCoords(location.coords);
	const lines = [`Location ${coords} | ${location.is_system ? "System" : "Empty Space"}`];

	if (gameSeed && epochSeed && location.is_system) {
		const coord = { x: Number(location.coords.x), y: Number(location.coords.y) };
		const loc = deriveLocationStatic(gameSeed, coord);
		const locationType = loc.type.toNumber() as LocationType;
		const subtype = loc.subtype.toNumber();
		const size = deriveLocationSize(loc);

		lines.push(`Type: ${LOCATION_TYPE_NAMES[locationType] ?? "Unknown"}`);
		if (size > 0) lines.push(`Size: ${size} strata`);

		if (size > 0) {
			const all: { index: number; itemId: number; reserve: number }[] = [];
			for (let i = 0; i < size; i++) {
				const s = deriveStratum(epochSeed, coord, i, locationType, subtype, size);
				if (s.reserve === 0) continue;
				all.push({ index: i, itemId: s.itemId, reserve: s.reserve });
			}
			all.sort((a, b) => b.reserve - a.reserve);

			if (!reach) {
				const top = all.slice(0, 3);
				if (top.length > 0) {
					lines.push("Top strata:");
					for (const l of top) {
						lines.push(`  [${l.index}] ${formatItem(l.itemId)} — reserve ${l.reserve}`);
					}
					lines.push(
						`(run "shiploadcli stratum ${coord.x} ${coord.y} <index>" for detail)`,
					);
				}
			} else {
				const reachable = all.filter((l) => l.index <= reach.depth);
				const topReach = reachable.slice(0, 3);
				if (topReach.length === 0) {
					lines.push("(no reachable strata)");
				} else {
					lines.push(`Top reachable (${reachable.length}):`);
					for (const l of topReach) {
						lines.push(`  [${l.index}] ${formatItem(l.itemId)} — reserve ${l.reserve}`);
					}
				}
				if (reach.showAll) {
					const topAll = all.slice(0, 3);
					if (topAll.length > 0) {
						lines.push(`Top overall (${topAll.length}):`);
						for (const l of topAll) {
							lines.push(
								`  [${l.index}] ${formatItem(l.itemId)} — reserve ${l.reserve}`,
							);
						}
					}
				}
			}
		} else if (reach) {
			lines.push("(no reachable strata)");
		}
	}

	return lines.join("\n");
}

export type NearbySort = "distance" | "energy" | "time" | "reserve";

export interface NearbyOpts {
	gameSeed?: Checksum256Type;
	epochSeed?: Checksum256Type;
	reach?: { depth: number };
	expand?: boolean;
	includeOOD?: boolean;
	sort?: NearbySort;
	top?: number;
	json?: boolean;
}

const NEARBY_COLUMNS: LocationColumn[] = [
	"coords",
	"type",
	"subtype",
	"size",
	"distance",
	"energy",
	"time",
	"resource",
	"depth",
	"reserve",
	"stats",
	"reach",
];

function compareSummaries(a: LocationSummary, b: LocationSummary, sort: NearbySort): number {
	switch (sort) {
		case "energy":
			return (a.energyCost ?? 0) - (b.energyCost ?? 0);
		case "time":
			return (a.flightTimeS ?? 0) - (b.flightTimeS ?? 0);
		case "reserve": {
			const ar = a.resources[0]?.reserve ?? 0;
			const br = b.resources[0]?.reserve ?? 0;
			return br - ar;
		}
		default:
			return (a.distance ?? 0) - (b.distance ?? 0);
	}
}

export function formatNearby(nearby:ServerTypes.nearby_info, opts: NearbyOpts = {}): string {
	const { gameSeed, epochSeed, reach, expand, includeOOD, sort = "distance", top } = opts;

	const summaries: LocationSummary[] = nearby.systems.map((sys) => {
		const coord = { x: Number(sys.location.coords.x), y: Number(sys.location.coords.y) };
		const distance = Number(sys.distance) / PRECISION;
		const travel = {
			distance: Math.round(distance * 10) / 10,
			energyCost: Number(sys.energy_cost),
			flightTimeS: Number(sys.flight_time),
		};
		if (!gameSeed) {
			return {
				coords: coord,
				type: LocationType.EMPTY,
				typeLabel: "?",
				size: 0,
				totalNonEmpty: 0,
				reachableNonEmpty: 0,
				resources: [],
				...travel,
			};
		}
		return buildLocationSummary(coord, { gameSeed, epochSeed, reach, includeOOD }, travel);
	});

	summaries.sort((a, b) => compareSummaries(a, b, sort));
	const limited = top && top > 0 ? summaries.slice(0, top) : summaries;

	if (opts.json) {
		return jsonStringify({
			current: {
				coords: { x: Number(nearby.current.coordinates.x), y: Number(nearby.current.coordinates.y) },
				energy: Number(nearby.current.energy),
			},
			projected: {
				coords: {
					x: Number(nearby.projected.coordinates.x),
					y: Number(nearby.projected.coordinates.y),
				},
				energy: Number(nearby.projected.energy),
			},
			max_energy: Number(nearby.max_energy),
			can_travel: nearby.can_travel,
			total: summaries.length,
			shown: limited.length,
			sort,
			reach,
			systems: summariesToJson(limited),
		});
	}

	const maxEnergy = Number(nearby.max_energy);
	const lines = [
		`Current:   ${formatCoords(nearby.current.coordinates)}  energy ${nearby.current.energy}/${maxEnergy}`,
		`Projected: ${formatCoords(nearby.projected.coordinates)}  energy ${nearby.projected.energy}/${maxEnergy}`,
		`Can Travel: ${nearby.can_travel ? "Yes" : "No"}`,
		"",
		`Nearby (${limited.length}${limited.length < summaries.length ? ` of ${summaries.length}` : ""}, sorted by ${sort}):`,
	];

	if (limited.length > 0) {
		lines.push(
			formatLocationSummaryTable(limited, {
				columns: NEARBY_COLUMNS,
				expand: Boolean(expand),
				maxEnergy,
			}),
		);
	}

	if (reach) {
		lines.push("");
		lines.push(
			includeOOD
				? `Reachable: non-empty strata at depth ≤ gatherer (${reach.depth}) / total non-empty strata. Includes out-of-depth (OOD) strata.`
				: `Reachable: non-empty strata at depth ≤ gatherer (${reach.depth}) / total non-empty strata.`,
		);
	}
	if (expand) lines.push("Expanded: one row per reachable resource per location.");
	return lines.join("\n");
}

function formatTime(t: { toMilliseconds(): number }): string {
	return new Date(t.toMilliseconds()).toLocaleTimeString();
}

export function formatResolveResults(results:ServerTypes.resolve_results): string {
	if (Number(results.resolved_count) === 0) return "No tasks resolved";
	const lines = [
		`Resolved ${results.resolved_count} task(s) for ${results.entity_type} ${results.entity_id}`,
	];
	if (results.new_schedule_started) {
		lines.push(`New schedule started: ${formatTime(results.new_schedule_started)}`);
	}
	return lines.join("\n");
}

export function formatCancelResults(results:ServerTypes.cancel_results): string {
	if (Number(results.cancelled_count) === 0) return "No tasks cancelled";
	const lines = [
		`Cancelled ${results.cancelled_count} task(s) for ${results.entity_type} ${results.entity_id}`,
	];
	if (results.schedule_started) {
		lines.push(`Schedule started: ${formatTime(results.schedule_started)}`);
	}
	return lines.join("\n");
}

function safeJsonReplacer(key: string, value: unknown): unknown {
	if (typeof value === "bigint") return value.toString();
	if (key === "stats" && typeof value === "number") return String(value);
	return value;
}

export function jsonStringify(data: unknown): string {
	return JSON.stringify(data, safeJsonReplacer, 2);
}

export function formatOutput<T>(
	data: T,
	opts: { json?: boolean },
	pretty: (d: T) => string,
): string {
	return opts.json ? jsonStringify(data) : pretty(data);
}
