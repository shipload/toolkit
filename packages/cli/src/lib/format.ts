import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveStratum,
	displayName,
	formatMass,
	getLocationType,
	LocationType,
	resolveItem,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";
import Table from "cli-table3";
import type { ServerTypes } from "@shipload/sdk";
import { shallowestPerItem } from "./reach";

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

export interface NearbyOpts {
	gameSeed?: Checksum256Type;
	epochSeed?: Checksum256Type;
	reach?: { depth: number };
	showAll?: boolean;
}

export function formatNearby(nearby:ServerTypes.nearby_info, opts: NearbyOpts = {}): string {
	const { gameSeed, epochSeed, reach, showAll } = opts;
	const lines = [
		`Current: ${formatCoords(nearby.current.coordinates)} | Energy: ${nearby.current.energy}/${nearby.max_energy}`,
		`Projected: ${formatCoords(nearby.projected.coordinates)} | Energy: ${nearby.projected.energy}/${nearby.max_energy}`,
		`Can Travel: ${nearby.can_travel ? "Yes" : "No"}`,
		"",
		`Nearby (${nearby.systems.length}):`,
	];
	const sorted = [...nearby.systems].sort((a, b) => Number(a.distance) - Number(b.distance));

	for (const sys of sorted) {
		const dest = formatCoords(sys.location.coords);
		const coord = { x: Number(sys.location.coords.x), y: Number(sys.location.coords.y) };
		const locType = gameSeed ? getLocationType(gameSeed, coord) : undefined;
		const locTag =
			locType !== undefined ? ` [${LOCATION_TYPE_NAMES[locType] ?? "Unknown"}]` : "";
		const cellHead = `  ${dest}${locTag} | ${sys.energy_cost} energy, ${sys.flight_time}s`;

		if (!reach || !gameSeed || !epochSeed) {
			lines.push(cellHead);
			continue;
		}

		const maxDepth = showAll ? undefined : reach.depth;
		const leads = shallowestPerItem(gameSeed, epochSeed, coord, maxDepth);

		if (!showAll) {
			const reachable = leads.filter((l) => l.index <= reach.depth);
			if (reachable.length === 0) {
				lines.push(`${cellHead} | none reachable`);
			} else {
				const top = reachable[0];
				lines.push(
					`${cellHead} | ${formatItem(top.itemId)} [${top.index}] reserve ${top.reserve} (${reachable.length} reachable)`,
				);
			}
		} else {
			lines.push(cellHead);
			if (leads.length === 0) {
				lines.push("    (no resources present)");
			} else {
				for (const l of leads) {
					const unreachable = l.index > reach.depth;
					const suffix = unreachable ? "  OOD" : "";
					lines.push(
						`    ${formatItem(l.itemId).padEnd(28)} [${l.index}] reserve ${l.reserve}${suffix}`,
					);
				}
			}
		}
	}

	if (reach) {
		lines.push("");
		lines.push(`Reach scope: gatherer depth ${reach.depth}`);
		if (showAll) lines.push("OOD = out of depth");
	}
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

function bigintReplacer(_key: string, value: unknown): unknown {
	return typeof value === "bigint" ? value.toString() : value;
}

export function formatOutput<T>(
	data: T,
	opts: { json?: boolean },
	pretty: (d: T) => string,
): string {
	return opts.json ? JSON.stringify(data, bigintReplacer, 2) : pretty(data);
}
