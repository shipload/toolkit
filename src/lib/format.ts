import {
	decodeStats,
	deriveLocationSize,
	deriveLocationStatic,
	deriveStratum,
	displayName,
	getItem,
	getLocationType,
	getStatDefinitions,
	LocationType,
	type ResourceCategory,
	resolveItem,
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

export interface LiveEnergyArgs {
	storedEnergy: number;
	capacity: number;
	recharge: number;
	drainPerSec?: number;
	activeTaskStartedAt?: Date;
	now?: Date;
}

export function formatLiveEnergy(args: LiveEnergyArgs): string {
	if (!args.activeTaskStartedAt) {
		return `${args.storedEnergy}/${args.capacity} (recharge: ${args.recharge}/s)`;
	}
	const elapsedMs = (args.now ?? new Date()).getTime() - args.activeTaskStartedAt.getTime();
	const elapsed = Math.max(0, elapsedMs / 1000);
	const drain = (args.drainPerSec ?? 0) * elapsed;
	const regen = args.recharge * elapsed;
	const projected = Math.min(args.capacity, Math.max(0, args.storedEnergy + regen - drain));
	return `${args.storedEnergy} → ${Math.round(projected)}/${args.capacity} (live, recharge: ${args.recharge}/s)`;
}

const TASK_TYPE_RECHARGE = 2;

function deriveDrainPerSec(task: Types.task): number {
	const type = Number(task.type);
	const duration = Number(task.duration);
	if (duration <= 0) return 0;
	if (type === TASK_TYPE_RECHARGE) return 0;
	const costRaw = task.energy_cost;
	if (!costRaw) return 0;
	const cost = Number(costRaw);
	if (cost <= 0) return 0;
	return cost / duration;
}

export function formatCoords(coords: Types.coordinates): string {
	return `(${coords.x}, ${coords.y})`;
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

export function formatTier(tierIndex: number): string {
	return `T${tierIndex + 1}`;
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

export function formatCargo(cargo: Types.cargo_item[]): string {
	if (cargo.length === 0) return "empty";
	return cargo
		.map((c) => {
			const itemId = Number(c.item_id);
			const base = `${c.quantity} ${formatItem(itemId)}`;
			const stats = formatStats(c.stats, itemId);
			const decoded = stats ? ` [${stats}]` : "";
			const statsUint = BigInt(c.stats.toString());
			return `${base}${decoded} stats=${statsUint}`;
		})
		.join(" + ");
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

export function formatEntity(entity: Types.entity_info): string {
	const trimmedName = entity.entity_name?.trim() ?? "";
	const nameStr = trimmedName ? ` "${trimmedName}"` : "";
	const lines = [
		`${entity.type} ${entity.id}${nameStr} owned by ${entity.owner}`,
		`Location: ${formatCoords(entity.coordinates)} | Status: ${entity.is_idle ? "Idle" : "Busy"}`,
	];

	if (!entity.is_idle && entity.current_task) {
		const t = entity.current_task;
		let status = `  ${formatTaskType(Number(t.type))}`;
		if (t.coordinates) status += ` to ${formatCoords(t.coordinates)}`;
		status += ` | ${entity.current_task_remaining}s remaining`;
		lines.push(status);
	}

	if (entity.generator) {
		const storedEnergy = Number(entity.energy ?? 0);
		const capacity = Number(entity.generator.capacity);
		const recharge = Number(entity.generator.recharge);
		let activeTaskStartedAt: Date | undefined;
		let drainPerSec: number | undefined;
		if (!entity.is_idle && entity.current_task) {
			const elapsedSec = Number(entity.current_task_elapsed ?? 0);
			activeTaskStartedAt = new Date(Date.now() - elapsedSec * 1000);
			drainPerSec = deriveDrainPerSec(entity.current_task);
		}
		lines.push(
			`Energy: ${formatLiveEnergy({
				storedEnergy,
				capacity,
				recharge,
				drainPerSec,
				activeTaskStartedAt,
			})}`,
		);
	}

	if (entity.engines) {
		lines.push(
			`Cargo: ${formatCargo(entity.cargo)} | Mass: ${entity.cargomass}/${entity.capacity ?? 0}`,
		);
		lines.push(`Engines: thrust ${entity.engines.thrust}, drain ${entity.engines.drain}`);
	} else if (entity.capacity) {
		lines.push(
			`Cargo: ${formatCargo(entity.cargo)} | Mass: ${entity.cargomass}/${entity.capacity}`,
		);
	}

	if (entity.loaders) {
		lines.push(
			`Loaders: ${entity.loaders.quantity}x (mass: ${entity.loaders.mass}, thrust: ${entity.loaders.thrust})`,
		);
	}

	const notInstalled = "— (not installed)";
	const entityType = String(entity.type);
	const entityId = BigInt(entity.id.toString());
	const addable = entityType === "ship";
	const installHint = (slotName: string) =>
		addable ? ` ${formatInstallHint(entityType, entityId, "<slot-index>", slotName)}` : "";

	lines.push(
		entity.gatherer
			? `Gatherer: depth ${entity.gatherer.depth}, yield ${entity.gatherer.yield}, drain ${entity.gatherer.drain}, speed ${entity.gatherer.speed}`
			: `Gatherer: ${notInstalled}${installHint("Gatherer")}`,
	);
	lines.push(
		entity.hauler
			? `Hauler:   capacity ${entity.hauler.capacity}, efficiency ${entity.hauler.efficiency}, drain ${entity.hauler.drain}`
			: `Hauler:   ${notInstalled}${installHint("Hauler")}`,
	);
	lines.push(
		entity.warp
			? `Warp:     range ${entity.warp.range}`
			: `Warp:     ${notInstalled}${installHint("Warp")}`,
	);
	lines.push(
		entity.crafter
			? `Crafter:  speed ${entity.crafter.speed}, drain ${entity.crafter.drain}`
			: `Crafter:  ${notInstalled}${installHint("Crafter")}`,
	);

	if (entity.pending_tasks.length > 0) {
		const pending = entity.pending_tasks
			.map((t) => {
				const type = formatTaskType(Number(t.type));
				if (t.coordinates) return `${type} to ${formatCoords(t.coordinates)}`;
				return type;
			})
			.join(", ");
		lines.push(`Pending: ${pending}`);
	}

	const scheduleTasks = entity.schedule?.tasks.length ?? 0;
	if (entity.is_idle && scheduleTasks > 0) {
		lines.push(formatResolveHint(entityType, entityId, scheduleTasks));
	}

	return lines.join("\n");
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

export function formatTaskResults(results: Types.task_results): string {
	if (results.entities.length === 0) return "No tasks scheduled";
	return results.entities
		.map((e) => {
			const started = formatTime(e.schedule_started);
			return `${e.entity_type} ${e.entity_id}: ${e.task_count} task(s) scheduled (started ${started})`;
		})
		.join("\n");
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
