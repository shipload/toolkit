import {
	computeCrafterDrain,
	computeCrafterSpeed,
	computeEngineDrain,
	computeEngineThrust,
	computeGathererDepth,
	computeGathererDrain,
	computeGathererYield,
	computeGeneratorCap,
	computeGeneratorRech,
	computeHaulerCapacity,
	computeHaulerEfficiency,
	computeLoaderMass,
	computeLoaderThrust,
	computeWarpRange,
	decodeStat,
	displayName,
	formatMass,
	getItem,
	getModuleCapabilityType,
	HoldKind,
	MODULE_ANY,
	MODULE_CRAFTER,
	MODULE_ENGINE,
	MODULE_GATHERER,
	MODULE_GENERATOR,
	MODULE_HAULER,
	MODULE_LAUNCHER,
	MODULE_LOADER,
	MODULE_STORAGE,
	MODULE_WARP,
	NFT,
	type ProjectedEntity,
	resolveItem,
	schedule,
	type ServerTypes,
} from "@shipload/sdk";
import {
	type CargoColumn,
	formatCargoTable,
	safeItemName,
	sortCargoForDisplay,
} from "./cargo-table";
import {
	diffStacks,
	type ProjectedCargoStack,
	projectCargoFromSnapshot,
	snapshotToStacks,
	stackKey,
} from "./cargo-projection";
import {
	formatCoordinatePair,
	formatDuration,
	formatEntityRefShort,
	formatResolveHint,
	formatTaskShort,
	kvTable,
	projectEnergy,
} from "./format";
import { laneLabel } from "./lane-presentation";
import { projectRemainingSnapshotAt } from "./projection";
import { entityInfoToSnapshot } from "./snapshot";

export interface HeaderContext {
	projected?: Partial<ProjectedEntity>;
	projectionLabel?: "live" | "projected" | "when done";
	now?: Date;
	suppressWhenDone?: boolean;
}

function entityIdentityLine(entity: ServerTypes.entity_info): string {
	const trimmedName = entity.entity_name?.trim() ?? "";
	const namePart = trimmedName ? ` "${trimmedName}"` : "";
	return `${entity.type} ${entity.id}${namePart} owned by ${entity.owner}`;
}

function entityStatusRows(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext = {},
): [string, string][] {
	const now = ctx.now ?? new Date();
	const rows: [string, string][] = [];
	const idle = schedule.isEntityIdle(entity, now);
	const statusStr = idle ? "idle" : "busy";
	rows.push(["Status:", `${statusStr}  ·  ${formatCoordinatePair(entity.coordinates)}`]);
	for (const ot of schedule.orderedTasks(entity)) {
		if (!schedule.laneTaskInProgressOf(entity, ot.laneKey, ot.taskIndex, now)) continue;
		const remaining = formatDuration(
			Math.max(
				0,
				Math.floor(
					schedule.laneTaskRemainingOf(entity, ot.laneKey, ot.taskIndex, now),
				),
			),
		);
		const label = `Task (${laneLabel(entity, ot.laneKey)}):`;
		rows.push([label, `${formatTaskShort(ot.task)}  ·  ${remaining} remaining`]);
	}
	return rows;
}

function entityEnergyValue(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext,
): string | null {
	if (!entity.generator) return null;
	const capacity = Number(entity.generator.capacity);
	const recharge = Number(entity.generator.recharge);
	const stored = Number(entity.energy ?? 0);

	const explicitProjection = ctx.projected?.energy;
	if (explicitProjection != null) {
		const proj = Number(explicitProjection.toString());
		if (proj !== stored) {
			const label = ctx.projectionLabel ?? "projected";
			return `${stored} → ${proj}/${capacity} (${label}, recharge: ${recharge}/s)`;
		}
		return `${stored}/${capacity} (recharge: ${recharge}/s)`;
	}

	const now = ctx.now ?? new Date();
	if (!schedule.isEntityIdle(entity, now)) {
		const active = schedule
			.orderedTasks(entity)
			.find((ot) =>
				schedule.laneTaskInProgressOf(entity, ot.laneKey, ot.taskIndex, now),
			);
		const elapsed_s = active
			? schedule.laneTaskElapsedOf(entity, active.laneKey, active.taskIndex, now)
			: 0;
		if (elapsed_s > 0) {
			const proj = projectEnergy(stored, capacity, recharge, 0, elapsed_s);
			if (proj !== stored) {
				return `${stored} → ${proj}/${capacity} (live, recharge: ${recharge}/s)`;
			}
		}
	}

	return `${stored}/${capacity} (recharge: ${recharge}/s)`;
}

function slotTypeLabel(t: number): string {
	switch (t) {
		case MODULE_ANY:
			return "Any";
		case MODULE_ENGINE:
			return "Engine";
		case MODULE_GENERATOR:
			return "Generator";
		case MODULE_GATHERER:
			return "Gatherer";
		case MODULE_LOADER:
			return "Loader";
		case MODULE_WARP:
			return "Warp";
		case MODULE_CRAFTER:
			return "Crafter";
		case MODULE_LAUNCHER:
			return "Launcher";
		case MODULE_STORAGE:
			return "Storage";
		case MODULE_HAULER:
			return "Hauler";
		default:
			return `?${t}`;
	}
}

function moduleNameWithTier(itemId: number): string {
	try {
		return displayName(resolveItem(itemId));
	} catch {
		return `item ${itemId}`;
	}
}

function formatModuleStatLine(itemId: number, stats: bigint): string {
	const capType = getModuleCapabilityType(itemId);
	switch (capType) {
		case MODULE_ENGINE: {
			const vol = decodeStat(stats, 0);
			const thm = decodeStat(stats, 1);
			return `thrust ${computeEngineThrust(vol)} · ${computeEngineDrain(thm)} energy/step`;
		}
		case MODULE_GENERATOR: {
			const com = decodeStat(stats, 0);
			const fin = decodeStat(stats, 1);
			return `capacity ${computeGeneratorCap(com)} · recharge ${computeGeneratorRech(fin)}/s`;
		}
		case MODULE_GATHERER: {
			const str = decodeStat(stats, 0);
			const tol = decodeStat(stats, 1);
			const con = decodeStat(stats, 2);
			const tier = getItem(itemId).tier;
			const drainPerMin = (computeGathererDrain(con) / 10000) * 60;
			return `depth ${computeGathererDepth(tol, tier)} · yield ${computeGathererYield(str)} · ${drainPerMin.toFixed(1)} energy/min`;
		}
		case MODULE_LOADER: {
			const ins = decodeStat(stats, 0);
			const pla = decodeStat(stats, 1);
			return `${formatMass(computeLoaderMass(ins))} each · thrust ${computeLoaderThrust(pla)}`;
		}
		case MODULE_CRAFTER: {
			const rea = decodeStat(stats, 0);
			const fin = decodeStat(stats, 1);
			const speed = computeCrafterSpeed(rea);
			const drainPerMin = ((computeCrafterDrain(fin) * speed) / 150000) * 60;
			return `speed ${speed} · ${drainPerMin.toFixed(1)} energy/min`;
		}
		case MODULE_HAULER: {
			const res = decodeStat(stats, 0);
			const pla = decodeStat(stats, 1);
			const con = decodeStat(stats, 2);
			const tier = getItem(itemId).tier;
			const drain = NFT.computeHaulerDrain(con, tier) / 1000;
			return `capacity ${computeHaulerCapacity(res, tier)} · efficiency ${computeHaulerEfficiency(pla)} · ${drain.toFixed(1)} energy/tile`;
		}
		case MODULE_WARP: {
			const res = decodeStat(stats, 0);
			return `range ${computeWarpRange(res)}`;
		}
		case MODULE_STORAGE: {
			const str = decodeStat(stats, 0);
			const den = decodeStat(stats, 1);
			const hrd = decodeStat(stats, 2);
			const coh = decodeStat(stats, 3);
			const tier = getItem(itemId).tier;
			const capacity = NFT.computeCargoBayCapacity(str, den, hrd);
			const drain = NFT.computeCargoBayDrain(coh, tier) / 1000;
			return `${formatMass(capacity)} capacity · ${drain.toFixed(1)} energy/tile`;
		}
		default:
			return "";
	}
}

function buildModuleRows(
	entity: ServerTypes.entity_info,
): [string, string][] {
	const slots = entity.modules ?? [];
	if (slots.length === 0) return [];
	return slots.map((m, idx): [string, string] => {
		const slotType = Number(m.type);
		const label = `#${idx} (${slotTypeLabel(slotType)}):`;
		if (!m.installed) return [label, "(empty)"];
		const itemId = Number(m.installed.item_id);
		const stats = BigInt(m.installed.stats.toString());
		const name = moduleNameWithTier(itemId);
		const statLine = formatModuleStatLine(itemId, stats);
		const value = statLine ? `${name} — ${statLine}` : name;
		return [label, value];
	});
}

function entitySpecsRows(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext = {},
): [string, string][] {
	const rows: [string, string][] = [];
	if (entity.hullmass) {
		rows.push(["Hull:", formatMass(Number(entity.hullmass))]);
	}
	const energyValue = entityEnergyValue(entity, ctx);
	if (energyValue) rows.push(["Energy:", energyValue]);
	return rows;
}

function entityModulesSection(entity: ServerTypes.entity_info): string | null {
	const rows = buildModuleRows(entity);
	if (rows.length === 0) return null;
	return ["  Modules:", kvTable(rows, { indent: "    " })].join("\n");
}

function entityCargoSection(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext = {},
): string | null {
	const cargo = entity.cargo ?? [];
	const currentMass = Number(entity.cargomass ?? 0);
	const projectedMass = ctx.projected?.cargoMass;

	if (entity.capacity != null) {
		const cap = Number(entity.capacity);
		const projMass =
			projectedMass != null ? Number(projectedMass.toString()) : null;
		const budget =
			projMass != null && projMass !== currentMass
				? `${formatMass(currentMass)} → ${formatMass(projMass)} / ${formatMass(cap)} (${ctx.projectionLabel ?? "projected"})`
				: `${formatMass(currentMass)} / ${formatMass(cap)}`;
		const cargoHeader = `  Cargo: ${budget}`;
		return cargo.length > 0
			? [cargoHeader, formatCargoTable(cargo, { indent: "  " })].join("\n")
			: cargoHeader;
	}
	if (cargo.length > 0) return formatCargoTable(cargo, { indent: "  " });
	return null;
}

function whenDoneBlock(entity: ServerTypes.entity_info, now: Date): string | null {
	if (!schedule.hasSchedule(entity)) return null;
	let projection: ProjectedEntity;
	try {
		projection = projectRemainingSnapshotAt(entity, now);
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

	const remaining = schedule.scheduleRemaining(entity, now);
	const header =
		remaining > 0 ? `When done (${formatDuration(remaining)}):` : "When done:";

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
			`${formatMass(currentCargoMass)} → ${formatMass(projCargoMass)} / ${formatMass(Number(entity.capacity))}`,
		]);
	} else if (cargoChanged) {
		rows.push(["Cargo:", `${formatMass(currentCargoMass)} → ${formatMass(projCargoMass)}`]);
	}

	const parts = [`  ${header}`, kvTable(rows, { indent: "    " })];

	if (cargoChanged) {
		const cargoSnap = entityInfoToSnapshot(entity);
		const current = snapshotToStacks(cargoSnap);
		const projected = projectCargoFromSnapshot(cargoSnap, now);
		const deltas = diffStacks(current, projected);
		const stackLines = formatStackDeltaLines(current, projected, deltas);
		if (stackLines.length > 0) parts.push(stackLines.join("\n"));
	}

	return parts.join("\n");
}

function formatStackDeltaLines(
	current: readonly ProjectedCargoStack[],
	projected: readonly ProjectedCargoStack[],
	deltas: ReturnType<typeof diffStacks>,
): string[] {
	const indent = "      ";
	type Entry = {
		item_id: bigint;
		stats: bigint;
		isNew: boolean;
		text: string;
	};
	const entries: Entry[] = [];
	for (const [key, delta] of deltas) {
		const projEntry = projected.find(
			(p) => stackKey(p.item_id, p.stats, p.modules) === key,
		);
		const curEntry = current.find(
			(c) => stackKey(c.item_id, c.stats, c.modules) === key,
		);
		const ref = projEntry ?? curEntry;
		if (!ref) continue;
		const itemId = ref.item_id;
		const stats = ref.stats;
		const name = safeItemName(Number(itemId));
		const stackLabel = `${name} stack ${stats.toString()}`;
		let prefix: string;
		let body: string;
		if (delta.kind === "new") {
			prefix = "+";
			body = `(new) +${(projEntry?.quantity ?? delta.quantity).toString()}`;
		} else if (delta.kind === "add") {
			prefix = "+";
			const cur = curEntry?.quantity ?? 0n;
			const proj = projEntry?.quantity ?? 0n;
			body = `${cur.toString()} → ${proj.toString()}`;
		} else {
			prefix = "-";
			const cur = curEntry?.quantity ?? 0n;
			const proj = projEntry?.quantity ?? 0n;
			body = `${cur.toString()} → ${proj.toString()}`;
		}
		entries.push({
			item_id: itemId,
			stats,
			isNew: delta.kind === "new",
			text: `${indent}${prefix} ${stackLabel}:  ${body}`,
		});
	}
	entries.sort((a, b) => {
		if (a.item_id !== b.item_id) return a.item_id < b.item_id ? -1 : 1;
		if (a.stats !== b.stats) return a.stats < b.stats ? -1 : 1;
		if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
		return 0;
	});
	return entries.map((e) => e.text);
}

function describeHoldKind(kind: number): { label: string; preposition: string } {
	switch (kind) {
		case HoldKind.PUSH:
			return { label: "Incoming transfer", preposition: "from" };
		case HoldKind.PULL:
			return { label: "Outgoing transfer", preposition: "to" };
		case HoldKind.GATHER:
			return { label: "Gather incoming", preposition: "from" };
		case HoldKind.BUILD:
			return { label: "Under construction", preposition: "by" };
		default:
			return { label: "Reserved", preposition: "with" };
	}
}

function entityHoldsSection(entity: ServerTypes.entity_info): string | null {
	const holds = entity.holds ?? [];
	if (holds.length === 0) return null;
	const now = Date.now();
	const rows: [string, string][] = holds.map((h) => {
		const { label, preposition } = describeHoldKind(Number(h.kind));
		const parts = [`${preposition} ${formatEntityRefShort(h.counterpart)}`];
		const mass = Number(h.incoming_mass);
		if (mass > 0) parts.push(formatMass(mass));
		const eta = Math.max(0, Math.round((h.until.toDate().getTime() - now) / 1000));
		if (eta > 0) parts.push(`ETA ${formatDuration(eta)}`);
		return [`${label}:`, parts.join(" · ")];
	});
	const table = kvTable(rows);
	const hasOutgoing = holds.some((h) => Number(h.kind) === HoldKind.PULL);
	if (!hasOutgoing) return table;
	const note =
		"  Outgoing transfer cargo is already debited; it rides in the receiver's incoming task until resolve.";
	return [table, note].join("\n");
}

function entityScheduleSection(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext = {},
): string | null {
	const sections: string[] = [];
	const now = new Date();

	const pending = schedule
		.orderedTasks(entity)
		.filter(
			(ot) =>
				!schedule.laneTaskCompleteOf(entity, ot.laneKey, ot.taskIndex, now) &&
				!schedule.laneTaskInProgressOf(entity, ot.laneKey, ot.taskIndex, now),
		)
		.map((ot) => ot.task);
	if (pending.length > 0) {
		sections.push(kvTable([["Pending:", pending.map(formatTaskShort).join(", ")]]));
	}

	const callerHasWhenDone =
		ctx.projectionLabel === "when done" && ctx.projected != null;
	if (!callerHasWhenDone && !ctx.suppressWhenDone) {
		const block = whenDoneBlock(entity, now);
		if (block) sections.push(block);
	}

	const entityType = String(entity.type);
	const entityId = BigInt(entity.id.toString());
	const completed = schedule.resolveOrder(entity, now).length;
	if (completed > 0) {
		sections.push(formatResolveHint(entityType, entityId, completed));
	}

	return sections.length > 0 ? sections.join("\n\n") : null;
}

export function renderEntityFull(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext = {},
): string {
	const sections: string[] = [];
	sections.push(
		[entityIdentityLine(entity), kvTable(entityStatusRows(entity, ctx))].join("\n"),
	);

	const specs = entitySpecsRows(entity, ctx);
	if (specs.length > 0) sections.push(kvTable(specs));

	const modulesSection = entityModulesSection(entity);
	if (modulesSection) sections.push(modulesSection);

	const cargoSection = entityCargoSection(entity, ctx);
	if (cargoSection) sections.push(cargoSection);

	const scheduleSection = entityScheduleSection(entity, ctx);
	if (scheduleSection) sections.push(scheduleSection);

	const holdsSection = entityHoldsSection(entity);
	if (holdsSection) sections.push(holdsSection);

	return sections.join("\n\n");
}

export function renderEntityHeader(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext = {},
): string {
	return [
		entityIdentityLine(entity),
		kvTable(entityStatusRows(entity, ctx)),
	].join("\n");
}

export interface InventoryViewOptions {
	current?: boolean;
	columns?: CargoColumn[];
}

export interface InventoryViewResult {
	text: string;
	projectionApplied: boolean;
	tasksConsidered: number;
}

const INVENTORY_DEFAULT_COLUMNS: CargoColumn[] = [
	"rowId",
	"item",
	"itemId",
	"stack",
	"qty",
	"each",
	"mass",
	"stats",
];

export function renderInventoryView(
	entity: ServerTypes.entity_info,
	opts: InventoryViewOptions = {},
): InventoryViewResult {
	const header = renderEntityHeader(entity);
	const columns = opts.columns ?? INVENTORY_DEFAULT_COLUMNS;

	const now = new Date();
	const incompleteCount = schedule
		.orderedTasks(entity)
		.filter(
			(ot) => !schedule.laneTaskCompleteOf(entity, ot.laneKey, ot.taskIndex, now),
		).length;
	const shouldProject = opts.current !== true && incompleteCount > 0;
	const tasksConsidered = shouldProject ? incompleteCount : 0;

	let cargoArr: unknown[];
	let deltas: ReturnType<typeof diffStacks> | undefined;
	let projectionApplied = false;

	if (shouldProject) {
		const snap = entityInfoToSnapshot(entity);
		const current = snapshotToStacks(snap);
		const projected = projectCargoFromSnapshot(snap, now);
		const computedDeltas = diffStacks(current, projected);

		const currentById = new Map<string, bigint>();
		for (const c of current) {
			const key = `${c.item_id.toString()}#${c.stats.toString()}`;
			currentById.set(key, c.id);
		}

		const merged: ProjectedCargoStack[] = projected.map((p) => {
			const key = `${p.item_id.toString()}#${p.stats.toString()}`;
			const existingId = currentById.get(key);
			return {
				...p,
				id: existingId ?? p.id,
			};
		});

		cargoArr = merged;
		deltas = computedDeltas;
		projectionApplied = computedDeltas.size > 0;
	} else {
		cargoArr = (entity.cargo ?? []) as unknown[];
	}

	if (cargoArr.length === 0) {
		return {
			text: `${header}\n  (empty)`,
			projectionApplied: false,
			tasksConsidered: 0,
		};
	}

	const sorted = sortCargoForDisplay(cargoArr as Parameters<typeof sortCargoForDisplay>[0]);
	const table = formatCargoTable(sorted, { columns, deltas });
	return {
		text: `${header}\n${table}`,
		projectionApplied,
		tasksConsidered,
	};
}

export interface GatherHeaderOpts {
	entityType: string;
	entityId: bigint;
	entityName?: string;
	coords: { x: bigint; y: bigint };
	caps: { yield: number; depth: number; drain: number };
	energy: number;
	energyCapacity: number;
	cargoFreeKg: number;
	cargoCapacityKg: number;
	quantity: number;
	locationContext: string;
	projected: boolean;
}

export function renderEntityForGather(opts: GatherHeaderOpts): string {
	const trimmedName = opts.entityName?.trim() ?? "";
	const namePart = trimmedName ? ` "${trimmedName}"` : "";
	const projSuffix = opts.projected ? " (projected)" : "";
	const title = `${opts.entityType} ${opts.entityId}${namePart} — gatherable at (${opts.coords.x}, ${opts.coords.y})${projSuffix}   [${opts.locationContext}]`;

	const c = opts.caps;
	const gatherer = `yield ${c.yield} · depth ${c.depth} · ${c.drain} energy/s`;
	const energyBudget = `${opts.energy}/${opts.energyCapacity}${projSuffix}`;
	const cargoBudget = `${formatMass(opts.cargoFreeKg)} / ${formatMass(opts.cargoCapacityKg)} free${projSuffix}`;

	return [
		title,
		`  Gatherer:  ${gatherer}`,
		`  Energy:    ${energyBudget}       Cargo:    ${cargoBudget}`,
		`  Quantity:  ${opts.quantity}`,
	].join("\n");
}
