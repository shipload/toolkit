/**
 * Action estimators — preview (duration_s, energy_cost, cargo_delta) without submitting.
 *
 * Source of truth: @shipload/sdk helpers mirror the contract formulas and are
 * maintained in lockstep by the SDK package. We call them directly rather than
 * re-mirroring.
 *
 * Contract sources for the underlying formulas (for reference):
 *   - Travel duration : game/contracts/server/src/capabilities/movement.cpp:191 (calc_flighttime)
 *   - Travel energy  : game/contracts/server/src/capabilities/energy.cpp    (calc_entity_energyusage)
 *   - Gather duration: game/contracts/server/src/capabilities/gathering.cpp:7  (calc_gather_duration)
 *   - Gather energy  : game/contracts/server/src/capabilities/gathering.cpp:23 (calc_gather_energy)
 *   - Craft duration : game/contracts/server/src/capabilities/crafting.cpp:6   (calc_craft_duration)
 *   - Craft energy   : game/contracts/server/src/capabilities/crafting.cpp:13  (calc_craft_energy)
 *
 * No readonly endpoint currently exposes an estimate for an arbitrary (x,y) /
 * stratum / recipe without an existing schedule, so we compute locally from the
 * current entity snapshot.
 */

import {
	calc_energyusage,
	calc_gather_duration,
	calc_gather_energy,
	calc_ship_flighttime,
	calc_ship_mass,
	calc_ship_rechargetime,
	distanceBetweenPoints,
	getItem,
	type ProjectableSnapshot,
	projectFromCurrentState,
	ServerTypes,
} from "@shipload/sdk";
import { Int64, UInt16, UInt32, UInt64 } from "@wharfkit/antelope";
import type { EntityTypeName } from "./args";
import type { ResolvedCargoInput } from "./cargo-resolve";
import { server } from "./client";
import {
	checkCargoCapacity,
	checkEnergyAvailable,
	checkEnergyCapacity,
	checkOriginEqualsTarget,
	checkReserve,
	checkTravelDuration,
	collectIssues,
	type FeasibilityIssue,
} from "./feasibility";
import { type EntitySnapshot, getEntitySnapshot } from "./snapshot";

export interface TravelSummary {
	origin: { x: number; y: number };
	originIsProjected: boolean;
	destination: { x: number; y: number };
	distance: number;
	flightDuration_s: number;
	rechargeDuration_s: number;
	startEnergy: number;
	startEnergyIsProjected: boolean;
	endEnergy: number;
	energyCost: number;
}

export interface CraftSummary {
	outputItemId: number;
	outputQty: number;
	slots: {
		itemId: number;
		requiredQty: number;
		contributions: { stackId: bigint; qty: number }[];
	}[];
}

export interface EstimateResult {
	duration_s: number;
	energy_cost: number;
	cargo_delta: Record<number, number>;
	feasibility: { ok: boolean; issues: FeasibilityIssue[] };
	with_recharge?: boolean;
	travel?: TravelSummary;
	craft?: CraftSummary;
}

/**
 * Pure helper — flight seconds for (distance, acceleration).
 * Mirrors contract calc_flighttime (sdkv2/src/travel/travel.ts:138).
 */
export function computeFlightDurationSeconds(
	distance: number | bigint,
	acceleration: number,
): number {
	const d = typeof distance === "bigint" ? Number(distance) : distance;
	if (acceleration <= 0 || d <= 0) return 0;
	return Math.floor(2 * Math.sqrt(d / acceleration));
}

/** Pure helper — gather cargo delta (+qty of item). */
export function computeGatherCargoDelta(itemId: number, quantity: number): Record<number, number> {
	if (itemId <= 0 || quantity <= 0) return {};
	return { [itemId]: quantity };
}

/**
 * Pure helper — craft cargo delta: -inputs + output.
 *
 * The contract holds inputs inside the task until resolve, at which point
 * the inputs are consumed and the output is released. The net effect on the
 * entity's cargo after completion is: output minus inputs.
 */
export function computeCraftCargoDelta(
	inputs: { itemId: number; quantity: number }[],
	outputItemId: number,
	outputQuantity: number,
): Record<number, number> {
	const delta: Record<number, number> = {};
	for (const i of inputs) {
		delta[i.itemId] = (delta[i.itemId] ?? 0) - i.quantity;
	}
	if (outputItemId > 0 && outputQuantity > 0) {
		delta[outputItemId] = (delta[outputItemId] ?? 0) + outputQuantity;
	}
	return delta;
}

function coerceUInt16(v: unknown): UInt16 {
	return UInt16.from(Number(String(v ?? "0")));
}
function coerceUInt32(v: unknown): UInt32 {
	return UInt32.from(Number(String(v ?? "0")));
}
function coerceInt64(v: unknown): Int64 {
	return Int64.from(BigInt(String(v ?? "0")));
}

/** Normalize a raw entity_info snapshot into a ShipLike the SDK helpers accept. */
function toShipLike(snap: EntitySnapshot): {
	coordinates: ServerTypes.coordinates;
	hullmass?: UInt32;
	energy?: UInt16;
	engines?: ServerTypes.movement_stats;
	generator?: ServerTypes.energy_stats;
	loaders?: ServerTypes.loader_stats;
} {
	const coordinates = ServerTypes.coordinates.from({
		x: coerceInt64(snap.coordinates.x),
		y: coerceInt64(snap.coordinates.y),
	});
	// biome-ignore lint/suspicious/noExplicitAny: raw server readonly output has loose typing
	const raw = snap as any;
	const engines: ServerTypes.movement_stats | undefined = raw.engines
		? ServerTypes.movement_stats.from({
				thrust: coerceUInt32(raw.engines.thrust),
				drain: coerceUInt16(raw.engines.drain),
			})
		: undefined;
	const generator: ServerTypes.energy_stats | undefined = raw.generator
		? ServerTypes.energy_stats.from({
				capacity: coerceUInt16(raw.generator.capacity),
				recharge: coerceUInt16(raw.generator.recharge),
			})
		: undefined;
	const loaders: ServerTypes.loader_stats | undefined = raw.loaders
		? ServerTypes.loader_stats.from({
				mass: coerceUInt32(raw.loaders.mass),
				thrust: coerceUInt16(raw.loaders.thrust),
				quantity: coerceUInt32(raw.loaders.quantity),
			})
		: undefined;
	const hullmass = raw.hullmass !== undefined ? coerceUInt32(raw.hullmass) : undefined;
	const energy = raw.energy !== undefined ? coerceUInt16(raw.energy) : undefined;

	return { coordinates, hullmass, energy, engines, generator, loaders };
}

export function populateTravelFeasibility(params: {
	generatorCapacity: number;
	currentEnergy: number;
	energyCost: number;
	flightSeconds: number;
	originX: number;
	originY: number;
	targetX: number;
	targetY: number;
	willRechargeFirst?: boolean;
	entity?: { entityType: string; entityId: bigint | number | string };
}): FeasibilityIssue[] {
	const energyForCheck = params.willRechargeFirst
		? params.generatorCapacity
		: params.currentEnergy;
	return collectIssues(
		checkOriginEqualsTarget(params.originX, params.originY, params.targetX, params.targetY),
		checkEnergyCapacity(params.generatorCapacity, params.energyCost, "travel"),
		checkEnergyAvailable(energyForCheck, params.energyCost, "travel", params.entity),
		checkTravelDuration(params.flightSeconds),
	);
}

export function populateGatherFeasibility(params: {
	generatorCapacity: number;
	currentEnergy: number;
	energyCost: number;
	availableCargo: number;
	cargoDelta: number;
	reserveRemaining: number;
	quantity: number;
	willRechargeFirst?: boolean;
	entity?: { entityType: string; entityId: bigint | number | string };
}): FeasibilityIssue[] {
	const energyForCheck = params.willRechargeFirst
		? params.generatorCapacity
		: params.currentEnergy;
	return collectIssues(
		checkEnergyCapacity(params.generatorCapacity, params.energyCost, "gather"),
		checkEnergyAvailable(energyForCheck, params.energyCost, "gather", params.entity),
		checkReserve(params.reserveRemaining, params.quantity),
		checkCargoCapacity(params.availableCargo, params.cargoDelta),
	);
}

export function populateCraftFeasibility(params: {
	generatorCapacity: number;
	currentEnergy: number;
	energyCost: number;
	availableCargo: number;
	cargoDelta: number;
	willRechargeFirst?: boolean;
	entity?: { entityType: string; entityId: bigint | number | string };
}): FeasibilityIssue[] {
	const energyForCheck = params.willRechargeFirst
		? params.generatorCapacity
		: params.currentEnergy;
	return collectIssues(
		checkEnergyCapacity(params.generatorCapacity, params.energyCost, "craft"),
		checkEnergyAvailable(energyForCheck, params.energyCost, "craft", params.entity),
		checkCargoCapacity(params.availableCargo, params.cargoDelta),
	);
}

function snapshotCargoMassInfo(snap: EntitySnapshot): ServerTypes.cargo_item[] {
	return snap.cargo.map((c) =>
		ServerTypes.cargo_item.from({
			item_id: Number(c.item_id.toString()),
			quantity: Number(c.quantity.toString()),
			stats: 0,
			modules: [],
		}),
	);
}

export async function estimateRecharge(params: {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	snapshot?: EntitySnapshot;
}): Promise<EstimateResult> {
	const { entityType, entityId } = params;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityType, entityId));

	const ship = toShipLike(snap);
	if (!ship.generator) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
		};
	}

	const duration = Number(calc_ship_rechargetime(ship));
	return {
		duration_s: duration,
		energy_cost: 0,
		cargo_delta: {},
		feasibility: { ok: true, issues: [] },
	};
}

export async function estimateTravel(params: {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	target: { x: number | bigint; y: number | bigint };
	recharge?: boolean;
	snapshot?: EntitySnapshot;
}): Promise<EstimateResult> {
	const { entityType, entityId, target } = params;
	const recharge = params.recharge ?? false;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityType, entityId));

	const ship = toShipLike(snap);
	if (!ship.engines || !ship.generator || !ship.hullmass) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const projection = projectFromCurrentState(snap as unknown as ProjectableSnapshot);
	const currentX = Number(snap.coordinates.x.toString());
	const currentY = Number(snap.coordinates.y.toString());
	const originX = Number(projection.location.x.toString());
	const originY = Number(projection.location.y.toString());
	const originIsProjected = originX !== currentX || originY !== currentY;
	const targetX = typeof target.x === "bigint" ? Number(target.x) : target.x;
	const targetY = typeof target.y === "bigint" ? Number(target.y) : target.y;

	const distance = distanceBetweenPoints(originX, originY, targetX, targetY);

	const mass = calc_ship_mass(ship, snapshotCargoMassInfo(snap));
	const flightSeconds = Number(calc_ship_flighttime(ship, mass, UInt64.from(distance)));
	const energyUsage = Number(calc_energyusage(distance, ship.engines.drain));

	let rechargeSeconds = 0;
	if (recharge) {
		rechargeSeconds = Number(calc_ship_rechargetime(ship));
	}

	const generatorCapacity = Number(ship.generator.capacity);
	const snapshotEnergy = Number(ship.energy ?? 0);
	const projectedAfterPending = Number(projection.energy.toString());
	const startEnergy = recharge ? generatorCapacity : projectedAfterPending;
	const startEnergyIsProjected = projectedAfterPending !== snapshotEnergy;
	const endEnergy = Math.max(0, startEnergy - energyUsage);

	const issues = populateTravelFeasibility({
		generatorCapacity,
		currentEnergy: projectedAfterPending,
		energyCost: energyUsage,
		flightSeconds,
		originX,
		originY,
		targetX,
		targetY,
		willRechargeFirst: recharge,
		entity: { entityType: String(entityType), entityId },
	});

	return {
		duration_s: flightSeconds + rechargeSeconds,
		energy_cost: energyUsage,
		cargo_delta: {},
		feasibility: { ok: issues.length === 0, issues },
		with_recharge: recharge,
		travel: {
			origin: { x: originX, y: originY },
			originIsProjected,
			destination: { x: targetX, y: targetY },
			distance: Number(distance),
			flightDuration_s: flightSeconds,
			rechargeDuration_s: rechargeSeconds,
			startEnergy,
			startEnergyIsProjected,
			endEnergy,
			energyCost: energyUsage,
		},
	};
}

export async function estimateGather(params: {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	stratum: number;
	quantity: number;
	snapshot?: EntitySnapshot;
	recharge?: boolean;
}): Promise<EstimateResult> {
	const { entityType, entityId, stratum, quantity } = params;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityType, entityId));

	if (!snap.gatherer) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const x = BigInt(snap.coordinates.x.toString());
	const y = BigInt(snap.coordinates.y.toString());

	const stratumResponse = (await server.readonly("getstratum", {
		x,
		y,
		stratum,
	})) as unknown as {
		stratum: {
			item_id: number | bigint | { toString(): string };
			reserve: number | bigint | { toString(): string };
			richness: number | bigint | { toString(): string };
		};
	};
	const itemId = Number(stratumResponse?.stratum?.item_id?.toString() ?? "0");
	const richness = Number(stratumResponse?.stratum?.richness?.toString() ?? "0");

	if (itemId === 0 || richness === 0 || quantity <= 0) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: computeGatherCargoDelta(itemId, quantity),
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const itemMass = getItem(itemId).mass;

	// biome-ignore lint/suspicious/noExplicitAny: raw server readonly output has loose typing
	const rawGatherer = snap.gatherer as any;
	const gatherer = ServerTypes.gatherer_stats.from({
		yield: coerceUInt16(rawGatherer.yield),
		drain: coerceUInt16(rawGatherer.drain),
		depth: coerceUInt16(rawGatherer.depth),
		speed: coerceUInt16(rawGatherer.speed),
	});

	const duration = calc_gather_duration(gatherer, itemMass, quantity, stratum, richness);
	const energy = calc_gather_energy(gatherer, Number(duration));

	const recharge = params.recharge ?? false;
	let rechargeSeconds = 0;
	if (recharge) {
		const ship = toShipLike(snap);
		if (ship.generator) {
			rechargeSeconds = Number(calc_ship_rechargetime(ship));
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: raw server readonly output has loose typing
	const rawSnap = snap as any;
	const rawCapacity = rawSnap.capacity ?? 0;
	const rawCargomass = rawSnap.cargomass ?? 0;
	const rawGen = rawSnap.generator;
	const rawEnergy = rawSnap.energy;

	const gatherIssues = populateGatherFeasibility({
		generatorCapacity: rawGen ? Number(String(rawGen.capacity ?? "0")) : 0,
		currentEnergy: Number(String(rawEnergy ?? "0")),
		energyCost: Number(energy),
		availableCargo: Number(String(rawCapacity)) - Number(String(rawCargomass)),
		cargoDelta: itemMass * quantity,
		reserveRemaining: Number(stratumResponse?.stratum?.reserve?.toString() ?? "0"),
		quantity,
		willRechargeFirst: recharge,
		entity: { entityType: String(entityType), entityId },
	});

	return {
		duration_s: Number(duration) + rechargeSeconds,
		energy_cost: Number(energy),
		cargo_delta: computeGatherCargoDelta(itemId, quantity),
		feasibility: { ok: gatherIssues.length === 0, issues: gatherIssues },
		with_recharge: recharge,
	};
}

/**
 * Group travel estimate — combined-thrust / combined-mass, matching the
 * contract grouptravel formula (movement.cpp:~190). Per-entity energy cost
 * is the max across participants (contract validates each entity against its
 * own drain). Returned energy_cost is the worst participant's usage.
 */
export async function estimateGroupTravel(params: {
	entities: { entityType: EntityTypeName | string; entityId: bigint | number }[];
	target: { x: number | bigint; y: number | bigint };
	recharge?: boolean;
}): Promise<EstimateResult> {
	const recharge = params.recharge ?? false;
	if (params.entities.length === 0) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const snapshots = await Promise.all(
		params.entities.map((e) => getEntitySnapshot(e.entityType, e.entityId)),
	);

	const originX = Number(snapshots[0].coordinates.x.toString());
	const originY = Number(snapshots[0].coordinates.y.toString());
	const targetX = typeof params.target.x === "bigint" ? Number(params.target.x) : params.target.x;
	const targetY = typeof params.target.y === "bigint" ? Number(params.target.y) : params.target.y;

	if (originX === targetX && originY === targetY) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const distance = distanceBetweenPoints(originX, originY, targetX, targetY);

	let totalThrust = 0;
	let totalMass = 0;
	let maxEnergyCost = 0;
	let maxRechargeSeconds = 0;

	for (const snap of snapshots) {
		const ship = toShipLike(snap);
		const entityMass = Number(calc_ship_mass(ship, snapshotCargoMassInfo(snap)));
		totalMass += entityMass;
		if (ship.engines) {
			totalThrust += Number(ship.engines.thrust);
			const energy = Number(calc_energyusage(distance, ship.engines.drain));
			if (energy > maxEnergyCost) maxEnergyCost = energy;
		}
		if (recharge && ship.generator) {
			const rt = Number(calc_ship_rechargetime(ship));
			if (rt > maxRechargeSeconds) maxRechargeSeconds = rt;
		}
	}

	if (totalThrust === 0 || totalMass === 0) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	// calc_acceleration(thrust, mass) = thrust/mass * PRECISION (sdkv2/src/travel/travel.ts:163)
	const PRECISION = 10_000;
	const acceleration = (totalThrust / totalMass) * PRECISION;
	const flightSeconds = computeFlightDurationSeconds(Number(distance), acceleration);

	return {
		duration_s: flightSeconds + maxRechargeSeconds,
		energy_cost: maxEnergyCost,
		cargo_delta: {},
		feasibility: { ok: true, issues: [] },
		with_recharge: recharge,
	};
}

export async function estimateCraft(params: {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	recipeId: number;
	quantity: number;
	inputs: ResolvedCargoInput[];
	snapshot?: EntitySnapshot;
	recharge?: boolean;
}): Promise<EstimateResult> {
	const { entityType, entityId, recipeId, quantity, inputs } = params;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityType, entityId));

	type CrafterSnap = { speed?: { toString(): string }; drain?: { toString(): string } };
	const crafter = (snap as unknown as { crafter?: CrafterSnap }).crafter;
	if (!crafter) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: computeCraftCargoDelta(inputs, 0, 0),
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const recipeResponse = (await server.readonly("getrecipe", {
		output_item_id: recipeId,
	})) as unknown as {
		recipes: {
			output_item_id: number | bigint | { toString(): string };
			inputs: {
				item_id: number | bigint | { toString(): string };
				quantity: number | bigint | { toString(): string };
			}[];
		}[];
	};
	const recipe = recipeResponse?.recipes?.[0];
	const outputItemId = recipe ? Number(recipe.output_item_id.toString()) : 0;

	let totalInputMass = 0;
	for (const i of inputs) {
		const item = getItem(i.itemId);
		totalInputMass += item.mass * i.quantity;
	}

	const speed = Number(crafter.speed?.toString() ?? "0");
	const drain = Number(crafter.drain?.toString() ?? "0");
	if (speed === 0) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: computeCraftCargoDelta(inputs, outputItemId, quantity),
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	// Mirrors contract calc_craft_duration + calc_craft_energy.
	// Also implemented in sdkv2/src/capabilities/crafting.ts but
	// sdkv2 takes the unpacked primitive shape (speed:number), which is
	// exactly what we already have in hand, so we stay with primitives to
	// avoid the double round-trip through UInt16 construction.
	const CRAFT_ENERGY_DIVISOR = 150000;
	const duration = Math.max(Math.floor(totalInputMass / speed), 1);
	const energy = Math.min(Math.floor((totalInputMass * drain) / CRAFT_ENERGY_DIVISOR), 65535);

	const recharge = params.recharge ?? false;
	let rechargeSeconds = 0;
	if (recharge) {
		const ship = toShipLike(snap);
		if (ship.generator) {
			rechargeSeconds = Number(calc_ship_rechargetime(ship));
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: raw server readonly output has loose typing
	const rawCraftSnap = snap as any;
	const craftCapacity = rawCraftSnap.capacity ?? 0;
	const craftCargomass = rawCraftSnap.cargomass ?? 0;
	const craftGen = rawCraftSnap.generator;
	const craftEnergy = rawCraftSnap.energy;

	let outputItemMass = 0;
	if (outputItemId > 0) {
		outputItemMass = getItem(outputItemId).mass;
	}
	const cargoDelta = outputItemMass * quantity - totalInputMass;

	const craftIssues = populateCraftFeasibility({
		generatorCapacity: craftGen ? Number(String(craftGen.capacity ?? "0")) : 0,
		currentEnergy: Number(String(craftEnergy ?? "0")),
		energyCost: energy,
		availableCargo: Number(String(craftCapacity)) - Number(String(craftCargomass)),
		cargoDelta,
		willRechargeFirst: recharge,
		entity: { entityType: String(entityType), entityId },
	});

	const craftSlots =
		recipe?.inputs.map((slot) => {
			const itemId = Number(slot.item_id.toString());
			const requiredQty = Number(slot.quantity.toString()) * quantity;
			const contributions = inputs
				.filter((i) => i.itemId === itemId)
				.map((i) => ({ stackId: i.stackId, qty: i.quantity }));
			return { itemId, requiredQty, contributions };
		}) ?? [];

	return {
		duration_s: duration + rechargeSeconds,
		energy_cost: energy,
		cargo_delta: computeCraftCargoDelta(inputs, outputItemId, quantity),
		feasibility: { ok: craftIssues.length === 0, issues: craftIssues },
		with_recharge: recharge,
		craft: {
			outputItemId,
			outputQty: quantity,
			slots: craftSlots,
		},
	};
}
