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
	type Projectable,
	projectEntity,
	type ResourceCategory,
	resolveItem,
	schedule,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";
import type { Types } from "../contracts/server";
import { shallowestPerItem } from "./reach";

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

export function formatEnergy(storedEnergy: number, capacity: number, recharge: number): string {
	return `${storedEnergy} / ${capacity}  (recharge ${recharge}/s)`;
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
	const elapsed = (now.getTime() - activeTaskStartedAt.getTime()) / 1000;
	const projected = Math.max(
		0,
		Math.min(capacity, Math.round(storedEnergy + (recharge - drainPerSec) * elapsed)),
	);
	return `${storedEnergy} → ${projected}/${capacity} (live, recharge: ${recharge}/s)`;
}

export function formatCoords(coords: Types.coordinates): string {
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
	try {
		return `${displayName(resolveItem(itemId))} (id:${itemId})`;
	} catch {
		return `Item ${itemId}`;
	}
}

function resourceCategoryFor(itemId: number): ResourceCategory | null {
	try {
		return (getItem(itemId).category ?? null) as ResourceCategory | null;
	} catch {
		return null;
	}
}

export function resolveItemCategory(itemId: number): ResourceCategory | null {
	return resourceCategoryFor(itemId);
}

const CATEGORY_BY_INT: Record<number, ResourceCategory> = {
	0: "ore",
	1: "gas",
	2: "regolith",
	3: "biomass",
	4: "crystal",
};

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
	ore: "Ore",
	crystal: "Crystal",
	gas: "Gas",
	regolith: "Regolith",
	biomass: "Biomass",
};

export function formatCategory(categoryInt: number): string {
	const cat = CATEGORY_BY_INT[categoryInt];
	if (!cat) return `category ${categoryInt}`;
	return CATEGORY_LABEL[cat];
}

export function categoryLabelFromName(cat: ResourceCategory): string {
	return CATEGORY_LABEL[cat];
}

export function formatTier(tier: number): string {
	return `T${tier}`;
}

export function formatInstallHint(
	entityType: string,
	entityId: number | bigint,
	slotIndex: number | string,
	slotName: string,
): string {
	return `(empty ${slotName} slot — install with: player addmodule ${entityType} ${entityId} ${slotIndex} <module-item-id>)`;
}

export function formatResolveHint(
	entityType: string,
	entityId: number | bigint,
	completedCount: number,
): string {
	return `${completedCount} completed task(s) need resolve — run: player resolve ${entityType} ${entityId}`;
}

const TYPE_LABEL: Record<number, string> = {
	0: "Resource",
	1: "Component",
	2: "Module",
	3: "Entity",
};

export function typeLabel(itemType: number): string {
	return TYPE_LABEL[itemType] ?? `type ${itemType}`;
}

export function formatStats(
	packed: bigint | number | string | { toString(): string },
	itemIdOrCategory?: number | ResourceCategory,
): string {
	const s = typeof packed === "bigint" ? packed : BigInt(String(packed));
	if (s === 0n) return "";
	const values = decodeStats(s, 6);
	while (values.length > 3 && values[values.length - 1] === 0) values.pop();

	let category: ResourceCategory | null = null;
	if (typeof itemIdOrCategory === "string") {
		category = itemIdOrCategory as ResourceCategory;
	} else if (typeof itemIdOrCategory === "number") {
		category = resourceCategoryFor(itemIdOrCategory);
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

function formatCargoItem(c: Types.cargo_item): string {
	const itemId = Number(c.item_id);
	const name = displayName(resolveItem(itemId));
	const qty = Number(c.quantity);

	let massStr = "";
	try {
		massStr = `    ${formatMass(getItem(itemId).mass * qty)}`;
	} catch {}

	const statsStr = formatStats(c.stats, itemId);
	const statsDisplay = statsStr ? `    ${statsStr}` : "";
	const statsRaw = `    stats=${c.stats}`;

	return `${qty} × ${name}${statsDisplay}${massStr}${statsRaw}`;
}

export function formatCargo(cargo: Types.cargo_item[]): string {
	if (cargo.length === 0) return "";
	return cargo.map(formatCargoItem).join("\n");
}

export function formatPlayer(player: Types.player_info): string {
	const lines = [
		`${player.company_name || "No Company"} (${player.owner})`,
		`Ships: ${player.ship_count} | Warehouses: ${player.warehouse_count} | Containers: ${player.container_count}`,
	];
	if (!player.is_player) {
		lines.unshift("[Not in game]");
	}
	return lines.join("\n");
}

function resolvedModuleNames(modules: Types.entity_info["modules"]): Map<number, string> {
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

export function formatEntity(entity: Types.entity_info): string {
	const trimmedName = entity.entity_name?.trim() ?? "";
	const namePart = trimmedName ? ` "${trimmedName}"` : "";
	const lines = [`${entity.type} ${entity.id}${namePart} owned by ${entity.owner}`];

	const statusStr = entity.is_idle ? "idle" : "busy";
	lines.push(`  Status:    ${statusStr}  ·  ${formatCoords(entity.coordinates)}`);

	if (!entity.is_idle && entity.current_task) {
		const t = entity.current_task;
		let taskLine = `  Task:      ${formatTaskType(Number(t.type))}`;
		if (t.coordinates) taskLine += ` to ${formatCoords(t.coordinates)}`;
		taskLine += `  ·  ${formatDuration(Number(entity.current_task_remaining))} remaining`;
		lines.push(taskLine);
	}

	if (entity.generator) {
		const elapsedMs = entity.is_idle
			? undefined
			: Number(entity.current_task_elapsed ?? 0) * 1000;
		const activeTaskStartedAt =
			elapsedMs !== undefined ? new Date(Date.now() - elapsedMs) : undefined;
		lines.push(
			`  Energy: ${formatLiveEnergy({ storedEnergy: Number(entity.energy ?? 0), capacity: Number(entity.generator.capacity), recharge: Number(entity.generator.recharge), activeTaskStartedAt })}`,
		);
	}

	if (entity.hullmass) {
		lines.push(`  Hull:      ${formatMass(Number(entity.hullmass))}`);
	}

	if (entity.capacity != null) {
		const usedStr = formatMass(Number(entity.cargomass ?? 0));
		const capStr = formatMass(Number(entity.capacity));
		lines.push(`  Cargo:     ${usedStr} / ${capStr}`);
		for (const c of entity.cargo ?? []) {
			lines.push(`             ${formatCargoItem(c)}`);
		}
	}

	const isShip = String(entity.type) === "ship";

	if (
		isShip ||
		entity.engines ||
		entity.generator ||
		entity.gatherer ||
		entity.hauler ||
		entity.crafter ||
		entity.warp ||
		entity.loaders
	) {
		lines.push("");
		const modNames = resolvedModuleNames(entity.modules);

		if (entity.engines) {
			const label = modNames.get(1) ?? "Engine";
			lines.push(
				`  ${label.padEnd(11)}thrust ${entity.engines.thrust} · ${entity.engines.drain} energy/step`,
			);
		}
		if (entity.generator) {
			const label = modNames.get(2) ?? "Generator";
			lines.push(
				`  ${label.padEnd(11)}capacity ${entity.generator.capacity} · recharge ${entity.generator.recharge}/s`,
			);
		}
		if (entity.gatherer) {
			const label = modNames.get(3) ?? "Gatherer";
			lines.push(
				`  ${label}: depth ${entity.gatherer.depth}, yield ${entity.gatherer.yield}, drain ${entity.gatherer.drain}, speed ${entity.gatherer.speed}`,
			);
		} else if (isShip) {
			lines.push(`  Gatherer: — (not installed)`);
		}
		if (entity.hauler) {
			const label = modNames.get(9) ?? "Hauler";
			lines.push(
				`  ${label.padEnd(11)}capacity ${entity.hauler.capacity} · efficiency ${entity.hauler.efficiency} · ${entity.hauler.drain} energy/load`,
			);
		} else if (isShip) {
			lines.push(`  Hauler:   — (not installed)`);
		}
		if (entity.crafter) {
			const label = modNames.get(6) ?? "Crafter";
			lines.push(
				`  ${label.padEnd(11)}speed ${entity.crafter.speed} · ${entity.crafter.drain} energy/craft`,
			);
		} else if (isShip) {
			lines.push(`  Crafter:  — (not installed)`);
		}
		if (entity.warp) {
			const label = modNames.get(5) ?? "Warp";
			lines.push(`  ${label}: range ${entity.warp.range}`);
		} else if (isShip) {
			lines.push(`  Warp:     — (not installed)`);
		}
		if (entity.loaders) {
			const label = modNames.get(4) ?? "Loader";
			lines.push(
				`  ${label.padEnd(11)}${entity.loaders.quantity}× · ${formatMass(Number(entity.loaders.mass))} each · thrust ${entity.loaders.thrust}`,
			);
		}
	}

	if ((entity.pending_tasks?.length ?? 0) > 0) {
		const pending = entity.pending_tasks
			.map((t) => {
				const type = formatTaskType(Number(t.type));
				if (t.coordinates) return `${type} to ${formatCoords(t.coordinates)}`;
				return type;
			})
			.join(", ");
		lines.push(`\n  Pending:   ${pending}`);
	}

	const entityType = String(entity.type);
	const entityId = BigInt(entity.id.toString());
	const scheduleTasks = entity.schedule?.tasks.length ?? 0;

	const whenDone = formatWhenDone(entity);
	if (whenDone) lines.push(whenDone);

	if (entity.is_idle && scheduleTasks > 0) {
		lines.push(formatResolveHint(entityType, entityId, scheduleTasks));
	}

	return lines.join("\n");
}

function formatWhenDone(entity: Types.entity_info): string | null {
	if (!entity.schedule || entity.schedule.tasks.length === 0) return null;
	const projection = projectEntity(entity as unknown as Projectable);

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

	const remaining = schedule.scheduleRemaining(entity as unknown as Projectable, new Date());
	const header = remaining > 0 ? `When done (${formatDuration(remaining)}):` : "When done:";

	const out = [`\n  ${header}`];
	if (positionChanged) out.push(`    Position:  (${projX}, ${projY})`);
	if (energyChanged && entity.generator) {
		out.push(`    Energy:    ${projEnergy}/${entity.generator.capacity}`);
	} else if (energyChanged) {
		out.push(`    Energy:    ${projEnergy}`);
	}
	if (cargoChanged && entity.capacity != null) {
		out.push(
			`    Cargo:     ${formatMass(projCargoMass)} / ${formatMass(Number(entity.capacity))}`,
		);
	} else if (cargoChanged) {
		out.push(`    Cargo:     ${formatMass(projCargoMass)}`);
	}
	return out.join("\n");
}

export function formatLocation(
	location: Types.location_info,
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
					lines.push(`(run "player stratum ${coord.x} ${coord.y} <index>" for detail)`);
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

export function formatNearby(nearby: Types.nearby_info, opts: NearbyOpts = {}): string {
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

export function formatResolveResults(results: Types.resolve_results): string {
	if (Number(results.resolved_count) === 0) return "No tasks resolved";
	const lines = [
		`Resolved ${results.resolved_count} task(s) for ${results.entity_type} ${results.entity_id}`,
	];
	if (results.new_schedule_started) {
		lines.push(`New schedule started: ${formatTime(results.new_schedule_started)}`);
	}
	return lines.join("\n");
}

export function formatCancelResults(results: Types.cancel_results): string {
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
