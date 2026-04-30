import {
	displayName,
	formatMass,
	getModuleCapabilityType,
	type ProjectableSnapshot,
	type ProjectedEntity,
	projectFromCurrentState,
	resolveItem,
	schedule,
	type ServerTypes,
} from "@shipload/sdk";
import { formatCargoTable } from "./cargo-table";
import {
	formatCoords,
	formatDuration,
	formatResolveHint,
	formatTaskShort,
	kvTable,
	projectEnergy,
} from "./format";

export interface HeaderContext {
	projected?: Partial<ProjectedEntity>;
	projectionLabel?: "live" | "projected" | "when done";
	now?: Date;
}

function entityIdentityLine(entity: ServerTypes.entity_info): string {
	const trimmedName = entity.entity_name?.trim() ?? "";
	const namePart = trimmedName ? ` "${trimmedName}"` : "";
	return `${entity.type} ${entity.id}${namePart} owned by ${entity.owner}`;
}

function entityStatusRows(
	entity: ServerTypes.entity_info,
	_ctx: HeaderContext = {},
): [string, string][] {
	const rows: [string, string][] = [];
	const statusStr = entity.is_idle ? "idle" : "busy";
	rows.push(["Status:", `${statusStr}  ·  ${formatCoords(entity.coordinates)}`]);
	if (!entity.is_idle && entity.current_task) {
		const remaining = formatDuration(Number(entity.current_task_remaining));
		rows.push([
			"Task:",
			`${formatTaskShort(entity.current_task)}  ·  ${remaining} remaining`,
		]);
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

	if (!entity.is_idle && entity.current_task_elapsed != null) {
		const elapsed_s = Number(entity.current_task_elapsed);
		if (elapsed_s > 0) {
			const proj = projectEnergy(stored, capacity, recharge, 0, elapsed_s);
			if (proj !== stored) {
				return `${stored} → ${proj}/${capacity} (live, recharge: ${recharge}/s)`;
			}
		}
	}

	return `${stored}/${capacity} (recharge: ${recharge}/s)`;
}

function resolvedModuleNames(
	modules: ServerTypes.entity_info["modules"],
): Map<number, string> {
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

function buildModuleRows(
	entity: ServerTypes.entity_info,
	isShip: boolean,
): [string, string][] {
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
	const isShip = String(entity.type) === "ship";
	rows.push(...buildModuleRows(entity, isShip));
	return rows;
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

function whenDoneBlock(entity: ServerTypes.entity_info): string | null {
	if (!entity.schedule || entity.schedule.tasks.length === 0) return null;
	const snap = entity as unknown as ProjectableSnapshot;
	let projection: ProjectedEntity;
	try {
		projection = projectFromCurrentState(snap);
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

	const remaining = schedule.scheduleRemaining(snap, new Date());
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
			`${formatMass(projCargoMass)} / ${formatMass(Number(entity.capacity))}`,
		]);
	} else if (cargoChanged) {
		rows.push(["Cargo:", formatMass(projCargoMass)]);
	}
	return [`  ${header}`, kvTable(rows, { indent: "    " })].join("\n");
}

function entityScheduleSection(
	entity: ServerTypes.entity_info,
	ctx: HeaderContext = {},
): string | null {
	const sections: string[] = [];

	if ((entity.pending_tasks?.length ?? 0) > 0) {
		sections.push(
			kvTable([["Pending:", entity.pending_tasks.map(formatTaskShort).join(", ")]]),
		);
	}

	const callerHasWhenDone =
		ctx.projectionLabel === "when done" && ctx.projected != null;
	if (!callerHasWhenDone) {
		const block = whenDoneBlock(entity);
		if (block) sections.push(block);
	}

	const entityType = String(entity.type);
	const entityId = BigInt(entity.id.toString());
	const scheduleTasks = entity.schedule?.tasks.length ?? 0;
	if (entity.is_idle && scheduleTasks > 0) {
		sections.push(formatResolveHint(entityType, entityId, scheduleTasks));
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

	const cargoSection = entityCargoSection(entity, ctx);
	if (cargoSection) sections.push(cargoSection);

	const scheduleSection = entityScheduleSection(entity, ctx);
	if (scheduleSection) sections.push(scheduleSection);

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

export interface GatherHeaderOpts {
	entityType: string;
	entityId: bigint;
	entityName?: string;
	coords: { x: bigint; y: bigint };
	caps: { yield: number; depth: number; speed: number; drain: number };
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
	const gatherer = `yield ${c.yield} · depth ${c.depth} · speed ${c.speed} · ${c.drain} energy/s`;
	const energyBudget = `${opts.energy}/${opts.energyCapacity}${projSuffix}`;
	const cargoBudget = `${formatMass(opts.cargoFreeKg)} / ${formatMass(opts.cargoCapacityKg)} free${projSuffix}`;

	return [
		title,
		`  Gatherer:  ${gatherer}`,
		`  Energy:    ${energyBudget}       Cargo:    ${cargoBudget}`,
		`  Quantity:  ${opts.quantity}`,
	].join("\n");
}
