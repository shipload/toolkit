import {
	buildGatherPlan,
	calc_craft_duration,
	calc_craft_energy,
	calc_energyusage,
	calc_group_flighttime,
	calc_rechargetime,
	calc_ship_mass,
	calc_travel_flighttime,
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
	workerLaneKey,
	projectedCargoAvailableAt,
	schedule,
	splitCost,
	type CargoInput,
	type GatherPlan,
	type GatherPlanEntity,
	type IncomingSource,
} from "@shipload/sdk";
import { Int64, UInt16, UInt32 } from "@wharfkit/antelope";
import { projectCargoFromSnapshot } from "./cargo-projection";
import { type ResolvedCargoInput, resolveCargoInputs } from "./cargo-resolve";
import { getGameSeed, server } from "./client";
import {
	checkCargoAvailability,
	checkCargoCapacity,
	checkDestinationIsSystem,
	checkEnergyAvailable,
	checkEnergyCapacity,
	checkHaulCapacity,
	checkOriginEqualsTarget,
	checkReserve,
	checkTravelDuration,
	collectIssues,
	type FeasibilityIssue,
} from "./feasibility";
import { formatItem } from "./format";
import {
	projectedCargoMass,
	projectedCoords,
	projectRemainingSnapshotAt,
	travelCargoMass,
	travelDepartureAt,
} from "./projection";
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

export function computeFlightDurationSeconds(
	distance: number | bigint,
	acceleration: number,
): number {
	const d = typeof distance === "bigint" ? Number(distance) : distance;
	if (acceleration <= 0 || d <= 0) return 0;
	return calc_travel_flighttime(d, acceleration).toNumber();
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
	holds: ServerTypes.hold[];
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

	return { coordinates, hullmass, energy, engines, generator, loader_lanes: snap.loader_lanes ?? [], holds: snap.holds ?? [] };
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

function rechargeSecondsAfterQueue(snap: EntitySnapshot, now: Date, energyOverride?: number): number {
	if (!snap.generator) return 0;
	const energy = energyOverride ?? Number(projectRemainingSnapshotAt(snap, now).energy.toString());
	return Number(
		calc_rechargetime(
			UInt32.from(Number(snap.generator.capacity)),
			UInt32.from(energy),
			UInt32.from(Number(snap.generator.recharge)),
		),
	);
}

function travelMass(snap: EntitySnapshot, ship: ReturnType<typeof toShipLike>, departsAt: Date): number {
	return Number(calc_ship_mass(ship, [])) + travelCargoMass(snap, departsAt);
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

	const duration = rechargeSecondsAfterQueue(snap, new Date());
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

	const now = new Date();
	const projection = projectRemainingSnapshotAt(snap, now);
	const currentX = Number(snap.coordinates.x.toString());
	const currentY = Number(snap.coordinates.y.toString());
	const originX = Number(projection.location.x.toString());
	const originY = Number(projection.location.y.toString());
	const originIsProjected = originX !== currentX || originY !== currentY;
	const targetX = typeof target.x === "bigint" ? Number(target.x) : target.x;
	const targetY = typeof target.y === "bigint" ? Number(target.y) : target.y;

	const distance = distanceBetweenPoints(originX, originY, targetX, targetY);

	const mass = travelMass(snap, ship, travelDepartureAt(snap, now, recharge));
	const flightSeconds = Number(
		calc_group_flighttime(Number(ship.engines.thrust), 0, 0, 0, mass, distance),
	);
	const energyUsage = Number(calc_energyusage(distance, ship.engines.drain));

	const projectedAfterPending = Number(projection.energy.toString());
	const rechargeSeconds = recharge
		? rechargeSecondsAfterQueue(snap, now, projectedAfterPending)
		: 0;

	const generatorCapacity = Number(ship.generator.capacity);
	const snapshotEnergy = Number(ship.energy ?? 0);
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

export async function estimateGroupTravel(params: {
	entities: { entityId: bigint | number }[];
	target: { x: number | bigint; y: number | bigint };
	recharge?: boolean;
	snapshots?: EntitySnapshot[];
	hasSystemAtDestination?: boolean;
	now?: Date;
}): Promise<EstimateResult> {
	const recharge = params.recharge ?? false;
	const empty: EstimateResult = {
		duration_s: 0,
		energy_cost: 0,
		cargo_delta: {},
		feasibility: { ok: true, issues: [] },
		with_recharge: false,
	};
	if (params.entities.length === 0) return empty;

	const snapshots =
		params.snapshots ??
		(await Promise.all(params.entities.map((e) => getEntitySnapshot(e.entityId))));

	const now = params.now ?? new Date();
	const groupOrigin = projectedCoords(snapshots[0], now);
	const originX = Number(groupOrigin.x);
	const originY = Number(groupOrigin.y);
	const targetX = typeof params.target.x === "bigint" ? Number(params.target.x) : params.target.x;
	const targetY = typeof params.target.y === "bigint" ? Number(params.target.y) : params.target.y;

	if (originX === targetX && originY === targetY) return empty;

	const distance = distanceBetweenPoints(originX, originY, targetX, targetY);

	let totalThrust = 0;
	let haulCount = 0;
	let pooledHaulCap = 0;
	let weightedHaulEffNum = 0;
	let maxEnergyCost = 0;
	let maxRechargeSeconds = 0;
	let departure = now;
	const energyChecks: { snap: EntitySnapshot; energy: number; cost: number }[] = [];

	for (const snap of snapshots) {
		const ship = toShipLike(snap);
		const hasMovement = ship.engines !== undefined && ship.generator !== undefined;
		const energy = hasMovement
			? Number(projectRemainingSnapshotAt(snap, now).energy.toString())
			: 0;
		if (hasMovement && ship.engines) {
			totalThrust += Number(ship.engines.thrust);
			const cost = Number(calc_energyusage(distance, ship.engines.drain));
			if (cost > maxEnergyCost) maxEnergyCost = cost;
			energyChecks.push({ snap, energy, cost });
		} else {
			haulCount += 1;
		}
		if (hasMovement && snap.hauler) {
			const capacity = Number(snap.hauler.capacity);
			pooledHaulCap += capacity;
			weightedHaulEffNum += Number(snap.hauler.efficiency) * capacity;
		}
		if (recharge && snap.generator) {
			const rt = rechargeSecondsAfterQueue(snap, now, energy);
			if (rt > maxRechargeSeconds) maxRechargeSeconds = rt;
		}
		const departsAt = travelDepartureAt(snap, now, recharge);
		if (departsAt.getTime() > departure.getTime()) departure = departsAt;
	}

	if (totalThrust === 0) return empty;

	const departsAt = new Date(departure.getTime() + (recharge ? maxRechargeSeconds * 1000 : 0));
	const totalMass = snapshots.reduce(
		(sum, snap) => sum + travelMass(snap, toShipLike(snap), departsAt),
		0,
	);
	if (totalMass === 0) return empty;

	const flightSeconds = Number(
		calc_group_flighttime(
			totalThrust,
			haulCount,
			pooledHaulCap,
			weightedHaulEffNum,
			totalMass,
			distance,
		),
	);

	const hasSystemAtDestination =
		params.hasSystemAtDestination ??
		hasSystem(await getGameSeed(), { x: targetX, y: targetY });
	const issues = collectIssues(
		checkDestinationIsSystem(hasSystemAtDestination, targetX, targetY),
		checkTravelDuration(flightSeconds),
		checkHaulCapacity(haulCount, pooledHaulCap),
		...energyChecks.flatMap(({ snap, energy, cost }) => {
			const capacity = Number(snap.generator?.capacity ?? 0);
			const entity = { entityType: snap.type, entityId: snap.id };
			return [
				checkEnergyCapacity(capacity, cost, "travel"),
				checkEnergyAvailable(recharge ? capacity : energy, cost, "travel", entity),
			];
		}),
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

export type CounterpartFetch = (entityId: string) => Promise<ServerTypes.entity_info>;

async function fetchCounterpartEntity(entityId: string): Promise<ServerTypes.entity_info> {
	return (await server.readonly("getentity", {
		entity_id: entityId,
	})) as unknown as ServerTypes.entity_info;
}

function findCoupledTask(
	counterpart: ServerTypes.entity_info,
	holdId: string,
	receiverId: string,
): { task: ServerTypes.task; coupling: ServerTypes.coupling } | undefined {
	for (const ordered of schedule.orderedTasks(counterpart)) {
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
	fetcher: CounterpartFetch = fetchCounterpartEntity,
): Promise<IncomingSource[]> {
	const receiverKey = String(receiverId);
	const incoming = holds.filter((h) => INCOMING_HOLD_KINDS.has(h.kind.toNumber()));
	const counterpartIds = [...new Set(incoming.map((h) => h.counterpart.entity_id.toString()))];
	const counterparts = new Map(
		await Promise.all(counterpartIds.map(async (id) => [id, await fetcher(id)] as const)),
	);
	const sources: IncomingSource[] = [];
	for (const h of incoming) {
		const counterpart = counterparts.get(h.counterpart.entity_id.toString());
		if (!counterpart) continue;
		const found = findCoupledTask(counterpart, h.id.toString(), receiverKey);
		if (!found) continue;
		const items = calcCounterpartDelivery(found.task, found.coupling);
		if (items.length === 0) continue;
		sources.push({ holdId: h.id.toString(), until: h.until.toDate(), items });
	}
	return sources;
}

function pickCrafterLane(snap: EntitySnapshot): ServerTypes.crafter_lane | undefined {
	const lanes = snap.crafter_lanes ?? [];
	if (lanes.length <= 1 || !snap.modules?.length) return lanes[0];
	try {
		const key = workerLaneKey(snap.modules, "crafter", snap.lanes ?? []);
		return lanes.find((l) => laneKeyForModule(Number(l.slot_index)) === key) ?? lanes[0];
	} catch {
		return lanes[0];
	}
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

	const crafter = pickCrafterLane(snap);
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

	const duration = calc_craft_duration(speed, totalInputMass).toNumber();
	const energy = calc_craft_energy(drain, totalInputMass).toNumber();

	const recharge = params.recharge ?? false;
	const rechargeSeconds = recharge ? rechargeSecondsAfterQueue(snap, new Date()) : 0;

	// biome-ignore lint/suspicious/noExplicitAny: raw server readonly output has loose typing
	const rawCraftSnap = snap as any;
	const craftCapacity = rawCraftSnap.capacity ?? 0;
	const craftGen = rawCraftSnap.generator;

	let outputItemMass = 0;
	if (outputItemId > 0) {
		outputItemMass = getItem(outputItemId).mass;
	}
	const cargoDelta = outputItemMass * quantity - totalInputMass;
	const now = new Date();

	const craftIssues = populateCraftFeasibility({
		generatorCapacity: craftGen ? Number(String(craftGen.capacity ?? "0")) : 0,
		currentEnergy: Number(projectRemainingSnapshotAt(snap, now).energy.toString()),
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
