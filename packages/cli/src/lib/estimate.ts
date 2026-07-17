/**
 * Action estimators — preview (duration_s, energy_cost, cargo_delta) without submitting.
 *
 * Source of truth: @shipload/sdk helpers mirror the contract formulas and are
 * maintained in lockstep by the SDK package. We call them directly rather than
 * re-mirroring.
 *
 * Contract sources for the underlying formulas (for reference):
 *   - Travel duration : contracts/src/server/src/capabilities/movement.cpp:191 (calc_flighttime)
 *   - Travel energy  : contracts/src/server/src/capabilities/energy.cpp    (calc_entity_energyusage)
 *   - Gather duration: contracts/src/server/src/capabilities/gathering.cpp:7  (calc_gather_duration)
 *   - Gather energy  : contracts/src/server/src/capabilities/gathering.cpp:23 (calc_gather_energy)
 *   - Craft duration : contracts/src/server/src/capabilities/crafting.cpp:6   (calc_craft_duration)
 *   - Craft energy   : contracts/src/server/src/capabilities/crafting.cpp:13  (calc_craft_energy)
 *
 * No readonly endpoint currently exposes an estimate for an arbitrary (x,y) /
 * stratum / recipe without an existing schedule, so we compute locally from the
 * current entity snapshot.
 */

import {
	buildGatherPlan,
	calc_craft_energy,
	calc_energyusage,
	calc_ship_flighttime,
	calc_ship_mass,
	calc_ship_rechargetime,
	calcCounterpartDelivery,
	cargoInputKey,
	cargoReadyAt,
	distanceBetweenPoints,
	gatherEnergyCost,
	getItem,
	hasSystem,
	HoldKind,
	ServerTypes,
	laneKeyForModule,
	projectedCargoAvailableAt,
	schedule,
	splitCost,
	type CargoInput,
	type GatherPlan,
	type GatherPlanEntity,
	type IncomingSource,
} from "@shipload/sdk";
import { Int64, UInt16, UInt32, UInt64 } from "@wharfkit/antelope";
import { projectCargoFromSnapshot } from "./cargo-projection";
import { type ResolvedCargoInput, resolveCargoInputs } from "./cargo-resolve";
import { getGameSeed, server } from "./client";
import {
	checkCargoAvailability,
	checkCargoCapacity,
	checkDestinationIsSystem,
	checkEnergyAvailable,
	checkEnergyCapacity,
	checkOriginEqualsTarget,
	checkReserve,
	checkTravelDuration,
	collectIssues,
	type FeasibilityIssue,
} from "./feasibility";
import { formatItem } from "./format";
import { projectedCargoMass, projectedCoords, projectRemainingSnapshotAt } from "./projection";
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
	waitsForIncoming?: { readyIn_s: number };
}

export interface CraftRecipe {
	output_item_id: number | bigint | { toString(): string };
	inputs: {
		item_id: number | bigint | { toString(): string };
		quantity: number | bigint | { toString(): string };
	}[];
}

export interface GatherPlanSummary {
	limpets: number;
	cycles: number;
	recharges: number;
}

export interface EstimateResult {
	duration_s: number;
	energy_cost: number;
	cargo_delta: Record<number, number>;
	feasibility: { ok: boolean; issues: FeasibilityIssue[] };
	with_recharge?: boolean;
	travel?: TravelSummary;
	craft?: CraftSummary;
	gather?: GatherPlanSummary;
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

export interface GathererLaneInput {
	slotIndex: number;
	yield: number;
	drain: number;
	depth: number;
	outputPct: number;
}

export function pickGathererLane(
	lanes: GathererLaneInput[],
	busyLaneKeys: number[],
	stratum: number,
): GathererLaneInput {
	const ordered = [...lanes].sort((a, b) => a.slotIndex - b.slotIndex);
	let lowestReaching: GathererLaneInput | undefined;
	for (const lane of ordered) {
		if (lane.depth < stratum) continue;
		const laneKey = laneKeyForModule(lane.slotIndex);
		if (lowestReaching === undefined) lowestReaching = lane;
		if (!busyLaneKeys.includes(laneKey)) return lane;
	}
	if (lowestReaching !== undefined) return lowestReaching;
	throw new Error("no gatherer reaches this stratum");
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
	energy?: UInt32;
	engines?: ServerTypes.movement_stats;
	generator?: ServerTypes.energy_stats;
	loader_lanes: ServerTypes.loader_lane[];
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
				drain: coerceUInt32(raw.engines.drain),
			})
		: undefined;
	const generator: ServerTypes.energy_stats | undefined = raw.generator
		? ServerTypes.energy_stats.from({
				capacity: coerceUInt32(raw.generator.capacity),
				recharge: coerceUInt32(raw.generator.recharge),
			})
		: undefined;
	const hullmass = raw.hullmass !== undefined ? coerceUInt32(raw.hullmass) : undefined;
	const energy = raw.energy !== undefined ? coerceUInt32(raw.energy) : undefined;

	return { coordinates, hullmass, energy, engines, generator, loader_lanes: snap.loader_lanes ?? [] };
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
	hasSystemAtDestination?: boolean;
	willRechargeFirst?: boolean;
	entity?: { entityType: string; entityId: bigint | number | string };
}): FeasibilityIssue[] {
	const energyForCheck = params.willRechargeFirst
		? params.generatorCapacity
		: params.currentEnergy;
	const destinationCheck =
		params.hasSystemAtDestination === undefined
			? null
			: checkDestinationIsSystem(params.hasSystemAtDestination, params.targetX, params.targetY);
	return collectIssues(
		checkOriginEqualsTarget(params.originX, params.originY, params.targetX, params.targetY),
		destinationCheck,
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

export async function estimateDeploy(params: {
	entityId: bigint | number;
	packedItemId: number;
	stackId: bigint;
	snapshot?: EntitySnapshot;
}): Promise<EstimateResult> {
	const { entityId, packedItemId, stackId } = params;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityId));

	resolveCargoInputs(
		[{ itemId: packedItemId, stackId, quantity: 1 }],
		projectCargoFromSnapshot(snap) as unknown as ServerTypes.cargo_item[],
	);

	return {
		duration_s: 0,
		energy_cost: 0,
		cargo_delta: { [packedItemId]: -1 },
		feasibility: { ok: true, issues: [] },
	};
}

export async function estimateRecharge(params: {
	entityId: bigint | number;
	snapshot?: EntitySnapshot;
}): Promise<EstimateResult> {
	const { entityId } = params;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityId));

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
	entityId: bigint | number;
	target: { x: number | bigint; y: number | bigint };
	recharge?: boolean;
	snapshot?: EntitySnapshot;
	hasSystemAtDestination?: boolean;
}): Promise<EstimateResult> {
	const { entityId, target } = params;
	const recharge = params.recharge ?? false;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityId));

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

	const projection = projectRemainingSnapshotAt(snap, new Date());
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

	const hasSystemAtDestination =
		params.hasSystemAtDestination ??
		hasSystem(await getGameSeed(), { x: targetX, y: targetY });

	const issues = populateTravelFeasibility({
		generatorCapacity,
		currentEnergy: projectedAfterPending,
		energyCost: energyUsage,
		flightSeconds,
		originX,
		originY,
		targetX,
		targetY,
		hasSystemAtDestination,
		willRechargeFirst: recharge,
		entity: { entityType: snap.type, entityId },
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
	entityId: bigint | number;
	stratum: number;
	quantity: number;
	snapshot?: EntitySnapshot;
	recharge?: boolean;
}): Promise<EstimateResult> {
	const { entityId, stratum, quantity } = params;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityId));

	const gLanes = snap.gatherer_lanes ?? [];
	if (gLanes.length === 0) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: {},
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const now = new Date();
	const { x, y } = projectedCoords(snap, now);

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

	return estimateGatherFromStratum({
		snapshot: snap,
		entityId,
		stratum,
		quantity,
		itemId,
		richness,
		reserveRemaining: Number(stratumResponse?.stratum?.reserve?.toString() ?? "0"),
		recharge: params.recharge ?? false,
		now,
	});
}

/** Pure gather estimator — models the run as gatherplan plans it, via the SDK's buildGatherPlan mirror. */
export function estimateGatherFromStratum(params: {
	snapshot: EntitySnapshot;
	entityId: bigint | number;
	stratum: number;
	quantity: number;
	itemId: number;
	richness: number;
	reserveRemaining: number;
	recharge: boolean;
	now?: Date;
}): EstimateResult {
	const { snapshot: snap, entityId, stratum, quantity, itemId, richness, recharge } = params;
	const now = params.now ?? new Date();
	const itemMass = getItem(itemId).mass;

	const planEntity = {
		...snap,
		generator: snap.generator
			? ServerTypes.energy_stats.from({
					capacity: coerceUInt32(snap.generator.capacity),
					recharge: coerceUInt32(snap.generator.recharge),
				})
			: undefined,
		gatherer_lanes: (snap.gatherer_lanes ?? []).map((l) => ServerTypes.gatherer_lane.from(l)),
		loader_lanes: [],
	} as unknown as GatherPlanEntity;

	let plan: GatherPlan;
	try {
		// caps become feasibility issues below, so the plan models the full request
		plan = buildGatherPlan(
			planEntity,
			stratum,
			{ quantity },
			{
				richness,
				itemMass,
				holdRoom: Number.POSITIVE_INFINITY,
				reserveRemaining: Number.POSITIVE_INFINITY,
				now,
			},
		);
	} catch {
		// no reaching limpet / no generator — preflight and the chain surface these
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: computeGatherCargoDelta(itemId, quantity),
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const laneBySlot = new Map(planEntity.gatherer_lanes.map((l) => [l.slot_index.toNumber(), l]));
	let energyTotal = 0;
	for (const cycle of plan.cycles) {
		for (const limpet of cycle.limpets) {
			const lane = laneBySlot.get(limpet.slot);
			if (lane) {
				energyTotal += gatherEnergyCost(lane, limpet.quantity, stratum, itemMass, richness);
			}
		}
	}
	const rechargeCount = plan.cycles.filter((c) => c.rechargeBefore).length;

	const reaching = planEntity.gatherer_lanes.filter((l) => l.depth.toNumber() >= stratum);
	const singleUnitCost = splitCost(reaching, 1, stratum, itemMass, richness);
	const generatorCapacity = snap.generator ? Number(String(snap.generator.capacity)) : 0;
	const tailEnergy = Number(String(projectRemainingSnapshotAt(snap, now).energy ?? 0));
	const availableCargo =
		Number(String(snap.capacity ?? 0)) - Number(projectedCargoMass(snap, now));

	const issues = collectIssues(
		checkEnergyCapacity(generatorCapacity, singleUnitCost, "gather"),
		recharge
			? null
			: checkEnergyAvailable(tailEnergy, energyTotal, "gather", {
					entityType: snap.type,
					entityId,
				}),
		checkReserve(params.reserveRemaining, quantity),
		checkCargoCapacity(availableCargo, itemMass * quantity),
	);

	return {
		duration_s: plan.totalSeconds,
		energy_cost: energyTotal,
		cargo_delta: computeGatherCargoDelta(itemId, quantity),
		feasibility: { ok: issues.length === 0, issues },
		with_recharge: recharge && rechargeCount > 0,
		gather: {
			limpets: plan.reachingCount,
			cycles: plan.cycleCount,
			recharges: rechargeCount,
		},
	};
}

/**
 * Group travel estimate — combined-thrust / combined-mass, matching the
 * contract grouptravel formula (movement.cpp:~190). Per-entity energy cost
 * is the max across participants (contract validates each entity against its
 * own drain). Returned energy_cost is the worst participant's usage.
 */
export async function estimateGroupTravel(params: {
	entities: { entityId: bigint | number }[];
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
		params.entities.map((e) => getEntitySnapshot(e.entityId)),
	);

	const now = new Date();
	const groupOrigin = projectedCoords(snapshots[0], now);
	const originX = Number(groupOrigin.x);
	const originY = Number(groupOrigin.y);
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

	const gameSeed = await getGameSeed();
	const issues = collectIssues(
		checkDestinationIsSystem(hasSystem(gameSeed, { x: targetX, y: targetY }), targetX, targetY),
	);

	return {
		duration_s: flightSeconds + maxRechargeSeconds,
		energy_cost: maxEnergyCost,
		cargo_delta: {},
		feasibility: { ok: issues.length === 0, issues },
		with_recharge: recharge,
	};
}

const INCOMING_HOLD_KINDS = new Set<number>([HoldKind.PUSH, HoldKind.GATHER, HoldKind.FLIGHT]);

async function findCoupledTask(
	counterpartId: string,
	holdId: string,
	receiverId: string,
): Promise<{ task: ServerTypes.task; coupling: ServerTypes.coupling } | undefined> {
	const raw = (await server.readonly("getentity", {
		entity_id: counterpartId,
	})) as unknown as ServerTypes.entity_info;
	for (const ordered of schedule.orderedTasks(raw)) {
		const coupling = ordered.task.couplings.find(
			(c) => c.hold.toString() === holdId && c.counterpart.entity_id.toString() === receiverId,
		);
		if (coupling) return { task: ordered.task, coupling };
	}
	return undefined;
}

/** For each incoming-kind hold on the receiver, locate the counterpart's coupled task and read its manifest. */
export async function buildIncomingSources(
	receiverId: bigint | number,
	holds: readonly ServerTypes.hold[],
): Promise<IncomingSource[]> {
	const receiverKey = String(receiverId);
	const sources: IncomingSource[] = [];
	for (const h of holds) {
		if (!INCOMING_HOLD_KINDS.has(h.kind.toNumber())) continue;
		const found = await findCoupledTask(h.counterpart.entity_id.toString(), h.id.toString(), receiverKey);
		if (!found) continue;
		const items = calcCounterpartDelivery(found.task, found.coupling);
		if (items.length === 0) continue;
		sources.push({ holdId: h.id.toString(), until: h.until.toDate(), items });
	}
	return sources;
}

export async function estimateCraft(params: {
	entityId: bigint | number;
	recipeId: number;
	quantity: number;
	inputs: ResolvedCargoInput[];
	snapshot?: EntitySnapshot;
	recharge?: boolean;
	incoming?: IncomingSource[];
	recipe?: CraftRecipe;
}): Promise<EstimateResult> {
	const { entityId, recipeId, quantity, inputs } = params;
	const snap = params.snapshot ?? (await getEntitySnapshot(entityId));

	// craft is single-lane
	const crafter = (snap.crafter_lanes ?? [])[0];
	if (!crafter) {
		return {
			duration_s: 0,
			energy_cost: 0,
			cargo_delta: computeCraftCargoDelta(inputs, 0, 0),
			feasibility: { ok: true, issues: [] },
			with_recharge: false,
		};
	}

	const recipe =
		params.recipe ??
		(
			(await server.readonly("getrecipe", {
				output_item_id: recipeId,
			})) as unknown as { recipes: CraftRecipe[] }
		)?.recipes?.[0];
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

	const duration = Math.max(Math.floor(totalInputMass / speed), 1);
	const energy = calc_craft_energy(drain, totalInputMass).toNumber();

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
	const craftGen = rawCraftSnap.generator;
	const craftEnergy = rawCraftSnap.energy;

	let outputItemMass = 0;
	if (outputItemId > 0) {
		outputItemMass = getItem(outputItemId).mass;
	}
	const cargoDelta = outputItemMass * quantity - totalInputMass;
	const now = new Date();

	const craftIssues = populateCraftFeasibility({
		generatorCapacity: craftGen ? Number(String(craftGen.capacity ?? "0")) : 0,
		currentEnergy: Number(String(craftEnergy ?? "0")),
		energyCost: energy,
		availableCargo: Number(String(craftCapacity)) - Number(projectedCargoMass(snap, now)),
		cargoDelta,
		willRechargeFirst: recharge,
		entity: { entityType: snap.type, entityId },
	});

	const incoming = params.incoming ?? [];
	let waitsForIncoming: { readyIn_s: number } | undefined;
	if (inputs.length > 0) {
		const demand: CargoInput[] = inputs.map((i) => ({
			itemId: i.itemId,
			stats: i.stackId,
			modules: i.modules,
			quantity: i.quantity,
		}));
		const availabilityEntity = {
			lanes: snap.lanes,
			cargo: snap.cargo.map((c) =>
				ServerTypes.cargo_item.from({
					item_id: c.item_id,
					stats: c.stats ?? 0n,
					modules: (c.modules as ServerTypes.module_entry[] | undefined) ?? [],
					quantity: c.quantity,
				}),
			),
		};
		const readyAt = cargoReadyAt(availabilityEntity, demand, incoming);
		const probe = new Date(readyAt.getTime() + 1);
		const availAtReady = projectedCargoAvailableAt(availabilityEntity, probe, incoming);
		const shortfalls = demand.filter((d) => (availAtReady.get(cargoInputKey(d)) ?? 0n) < BigInt(d.quantity));
		if (shortfalls.length > 0) {
			for (const d of shortfalls) {
				const have = Number(availAtReady.get(cargoInputKey(d)) ?? 0n);
				const issue = checkCargoAvailability(have, d.quantity, formatItem(d.itemId));
				if (issue) craftIssues.push(issue);
			}
		} else if (readyAt.getTime() > now.getTime()) {
			const availWithoutIncoming = projectedCargoAvailableAt(availabilityEntity, probe, []);
			const sufficientWithoutIncoming = demand.every(
				(d) => (availWithoutIncoming.get(cargoInputKey(d)) ?? 0n) >= BigInt(d.quantity),
			);
			if (!sufficientWithoutIncoming) {
				waitsForIncoming = {
					readyIn_s: Math.max(0, Math.round((readyAt.getTime() - now.getTime()) / 1000)),
				};
			}
		}
	}

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
			...(waitsForIncoming ? { waitsForIncoming } : {}),
		},
	};
}
