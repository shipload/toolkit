import {
	decodeStats,
	deriveLocationSize,
	deriveLocationStatic,
	deriveStratum,
	displayName,
	formatMass,
	getItem,
	getLocationType,
	getModuleCapabilityType,
	getStatDefinitions,
	LocationType,
	type ProjectableSnapshot,
	type ProjectedEntity,
	projectFromCurrentState,
	type ResourceCategory,
	resolveItem,
	resolveItemCategory,
	schedule,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";
import Table from "cli-table3";
import type { ServerTypes } from "@shipload/sdk";
import { formatCargoTable } from "./cargo-table";
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

export function formatLiveEnergy({
	storedEnergy,
	capacity,
	recharge,
	drainPerSec = 0,
	activeTaskStartedAt,
	now = new Date(),
}: {
	storedEnergy: number;
	capacity: number;
	recharge: number;
	drainPerSec?: number;
	activeTaskStartedAt?: Date;
	now?: Date;
}): string {
	if (!activeTaskStartedAt) {
		return `${storedEnergy}/${capacity} (recharge: ${recharge}/s)`;
	}
	const elapsed_s = (now.getTime() - activeTaskStartedAt.getTime()) / 1000;
	const projected = projectEnergy(storedEnergy, capacity, recharge, drainPerSec, elapsed_s);
	return `${storedEnergy} → ${projected}/${capacity} (live, recharge: ${recharge}/s)`;
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

export function formatStats(
	packed: bigint | number | string | { toString(): string },
	itemIdOrCategory?: number | ResourceCategory,
): string {
	const s = typeof packed === "bigint" ? packed : BigInt(String(packed));
	if (s === 0n) return "";
	const values = decodeStats(s, 6);
	while (values.length > 3 && values[values.length - 1] === 0) values.pop();

	let category: ResourceCategory | undefined;
	if (typeof itemIdOrCategory === "string") {
		category = itemIdOrCategory as ResourceCategory;
	} else if (typeof itemIdOrCategory === "number") {
		category = resolveItemCategory(itemIdOrCategory);
	}
	if (category) {
		const defs = getStatDefinitions(category);
		return values
			.map((v, i) => (defs[i] ? `${defs[i].abbreviation} ${v}` : String(v)))
			.join(" / ");
	}
	return values.join("/");
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

function resolvedModuleNames(modules:ServerTypes.entity_info["modules"]): Map<number, string> {
	const map = new Map<number, string>();
	for (const m of modules ?? []) {
		if (!m.installed) continue;
		const itemId = Number(m.installed.item_id);
		try {
			const capType = getModuleCapabilityType(itemId);
			map.set(capType, displayName(resolveItem(itemId)));
		} catch {}
	}
	return map;
}

export function formatEntity(entity:ServerTypes.entity_info): string {
	const trimmedName = entity.entity_name?.trim() ?? "";
	const namePart = trimmedName ? ` "${trimmedName}"` : "";
	const header = `${entity.type} ${entity.id}${namePart} owned by ${entity.owner}`;
	const sections: string[] = [];

	const statusRows: [string, string][] = [];
	const statusStr = entity.is_idle ? "idle" : "busy";
	statusRows.push(["Status:", `${statusStr}  ·  ${formatCoords(entity.coordinates)}`]);

	if (!entity.is_idle && entity.current_task) {
		const remaining = formatDuration(Number(entity.current_task_remaining));
		statusRows.push([
			"Task:",
			`${formatTaskShort(entity.current_task)}  ·  ${remaining} remaining`,
		]);
	}

	sections.push([header, kvTable(statusRows)].join("\n"));

	const specsRows: [string, string][] = [];
	if (entity.hullmass) {
		specsRows.push(["Hull:", formatMass(Number(entity.hullmass))]);
	}
	if (entity.generator) {
		const elapsedMs = entity.is_idle
			? undefined
			: Number(entity.current_task_elapsed ?? 0) * 1000;
		const activeTaskStartedAt =
			elapsedMs !== undefined ? new Date(Date.now() - elapsedMs) : undefined;
		specsRows.push([
			"Energy:",
			formatLiveEnergy({
				storedEnergy: Number(entity.energy ?? 0),
				capacity: Number(entity.generator.capacity),
				recharge: Number(entity.generator.recharge),
				activeTaskStartedAt,
			}),
		]);
	}
	const isShip = String(entity.type) === "ship";
	specsRows.push(...buildModuleRows(entity, isShip));
	if (specsRows.length > 0) sections.push(kvTable(specsRows));

	const cargo = entity.cargo ?? [];
	if (entity.capacity != null) {
		const cargoHeader = `  Cargo: ${formatCargoUsage(Number(entity.cargomass ?? 0), Number(entity.capacity))}`;
		const cargoBlock =
			cargo.length > 0
				? [cargoHeader, formatCargoTable(cargo, { indent: "  " })].join("\n")
				: cargoHeader;
		sections.push(cargoBlock);
	} else if (cargo.length > 0) {
		sections.push(formatCargoTable(cargo, { indent: "  " }));
	}

	if ((entity.pending_tasks?.length ?? 0) > 0) {
		sections.push(
			kvTable([["Pending:", entity.pending_tasks.map(formatTaskShort).join(", ")]]),
		);
	}

	const whenDone = formatWhenDone(entity);
	if (whenDone) sections.push(whenDone);

	const entityType = String(entity.type);
	const entityId = BigInt(entity.id.toString());
	const scheduleTasks = entity.schedule?.tasks.length ?? 0;
	if (entity.is_idle && scheduleTasks > 0) {
		sections.push(formatResolveHint(entityType, entityId, scheduleTasks));
	}

	return sections.join("\n\n");
}

function buildModuleRows(entity:ServerTypes.entity_info, isShip: boolean): [string, string][] {
	const modNames = resolvedModuleNames(entity.modules);
	const rows: [string, string][] = [];
	const notInstalled = "— (not installed)";

	if (entity.engines) {
		rows.push([
			`${modNames.get(1) ?? "Engine"}:`,
			`thrust ${entity.engines.thrust} · ${entity.engines.drain} energy/step`,
		]);
	}
	if (entity.generator) {
		rows.push([
			`${modNames.get(2) ?? "Generator"}:`,
			`capacity ${entity.generator.capacity} · recharge ${entity.generator.recharge}/s`,
		]);
	}
	if (entity.gatherer) {
		rows.push([
			`${modNames.get(3) ?? "Gatherer"}:`,
			`depth ${entity.gatherer.depth} · yield ${entity.gatherer.yield} · speed ${entity.gatherer.speed} · ${entity.gatherer.drain} energy/s`,
		]);
	} else if (isShip) {
		rows.push(["Gatherer:", notInstalled]);
	}
	if (entity.hauler) {
		rows.push([
			`${modNames.get(9) ?? "Hauler"}:`,
			`capacity ${entity.hauler.capacity} · efficiency ${entity.hauler.efficiency} · ${entity.hauler.drain} energy/load`,
		]);
	} else if (isShip) {
		rows.push(["Hauler:", notInstalled]);
	}
	if (entity.crafter) {
		rows.push([
			`${modNames.get(6) ?? "Crafter"}:`,
			`speed ${entity.crafter.speed} · ${entity.crafter.drain} energy/craft`,
		]);
	} else if (isShip) {
		rows.push(["Crafter:", notInstalled]);
	}
	if (entity.warp) {
		rows.push([`${modNames.get(5) ?? "Warp"}:`, `range ${entity.warp.range}`]);
	} else if (isShip) {
		rows.push(["Warp:", notInstalled]);
	}
	if (entity.loaders) {
		rows.push([
			`${modNames.get(4) ?? "Loader"}:`,
			`${entity.loaders.quantity}× · ${formatMass(Number(entity.loaders.mass))} each · thrust ${entity.loaders.thrust}`,
		]);
	}
	return rows;
}

function formatWhenDone(entity:ServerTypes.entity_info): string | null {
	if (!entity.schedule || entity.schedule.tasks.length === 0) return null;
	let projection: ProjectedEntity;
	try {
		projection = projectFromCurrentState(entity as unknown as ProjectableSnapshot);
	} catch {
		return null;
	}

	const currentX = Number(entity.coordinates.x.toString());
	const currentY = Number(entity.coordinates.y.toString());
	const projX = Number(projection.location.x.toString());
	const projY = Number(projection.location.y.toString());
	const positionChanged = projX !== currentX || projY !== currentY;

	const currentEnergy = Number(entity.energy ?? 0);
	const projEnergy = Number(projection.energy.toString());
	const energyChanged = projEnergy !== currentEnergy;

	const currentCargoMass = Number(entity.cargomass ?? 0);
	const projCargoMass = Number(projection.cargoMass.toString());
	const cargoChanged = projCargoMass !== currentCargoMass;

	if (!positionChanged && !energyChanged && !cargoChanged) return null;

	const remaining = schedule.scheduleRemaining(
		entity as unknown as ProjectableSnapshot,
		new Date(),
	);
	const header = remaining > 0 ? `When done (${formatDuration(remaining)}):` : "When done:";

	const rows: [string, string][] = [];
	if (positionChanged) rows.push(["Position:", `(${projX}, ${projY})`]);
	if (energyChanged && entity.generator) {
		rows.push(["Energy:", `${projEnergy}/${entity.generator.capacity}`]);
	} else if (energyChanged) {
		rows.push(["Energy:", String(projEnergy)]);
	}
	if (cargoChanged && entity.capacity != null) {
		rows.push([
			"Cargo:",
			`${formatMass(projCargoMass)} / ${formatMass(Number(entity.capacity))}`,
		]);
	} else if (cargoChanged) {
		rows.push(["Cargo:", formatMass(projCargoMass)]);
	}
	return [`  ${header}`, kvTable(rows, { indent: "    " })].join("\n");
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
