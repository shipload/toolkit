import { type ServerTypes, schedule } from "@shipload/sdk";
import { UInt64 } from "@wharfkit/antelope";
import type { EntityTypeName } from "./args";
import type { LaneTaskView } from "./cancel-compute";
import { server } from "./client";

const UINT16_MAX = 65535n;
const clampU16 = (value: bigint): bigint => (value > UINT16_MAX ? UINT16_MAX : value);

export interface EntitySnapshot {
	type: string;
	id: bigint;
	owner: string;
	entity_name: string;
	coordinates: {
		x: bigint;
		y: bigint;
	};
	cargomass: bigint;
	cargo: {
		item_id: bigint;
		quantity: bigint;
		stats?: bigint;
		modules?: unknown[];
		id?: bigint;
	}[];
	capacity?: bigint;
	energy?: bigint;
	hullmass?: bigint;
	engines?: { thrust: bigint; drain: bigint };
	generator?: { capacity: bigint; recharge: bigint };
	gatherer?: { yield: bigint; drain: bigint; depth: bigint };
	hauler?: { capacity: bigint; efficiency: bigint; drain: bigint };
	crafter?: { speed: bigint; drain: bigint };
	warp?: { range: bigint };
	loaders?: { mass: bigint; thrust: bigint; quantity: bigint };
	gatherer_lanes: ServerTypes.gatherer_lane[];
	crafter_lanes: ServerTypes.crafter_lane[];
	loader_lanes: ServerTypes.loader_lane[];
	is_idle: boolean;
	modules?: ServerTypes.module_entry[];
	lanes: ServerTypes.lane[];
}

export function entityInfoToSnapshot(
	ei: ServerTypes.entity_info,
	now: Date = new Date(),
): EntitySnapshot {
	const snap: EntitySnapshot = {
		type: ei.type.toString(),
		id: BigInt(ei.id.toString()),
		owner: ei.owner.toString(),
		entity_name: ei.entity_name,
		coordinates: {
			x: BigInt(ei.coordinates.x.toString()),
			y: BigInt(ei.coordinates.y.toString()),
		},
		cargomass: BigInt(ei.cargomass.toString()),
		cargo: ei.cargo.map((c) => ({
			item_id: BigInt(c.item_id.toString()),
			quantity: BigInt(c.quantity.toString()),
			stats: BigInt(c.stats.toString()),
			modules: c.modules,
			id: BigInt(c.id.toString()),
		})),
		gatherer_lanes: ei.gatherer_lanes ?? [],
		crafter_lanes: ei.crafter_lanes ?? [],
		loader_lanes: ei.loader_lanes ?? [],
		is_idle: schedule.isEntityIdle(ei, now),
		modules: ei.modules,
		lanes: ei.lanes,
	};
	if (ei.capacity != null) snap.capacity = BigInt(ei.capacity.toString());
	if (ei.energy != null) snap.energy = BigInt(ei.energy.toString());
	if (ei.hullmass != null) snap.hullmass = BigInt(ei.hullmass.toString());
	if (ei.engines != null) {
		snap.engines = {
			thrust: BigInt(ei.engines.thrust.toString()),
			drain: BigInt(ei.engines.drain.toString()),
		};
	}
	if (ei.generator != null) {
		snap.generator = {
			capacity: BigInt(ei.generator.capacity.toString()),
			recharge: BigInt(ei.generator.recharge.toString()),
		};
	}
	const gathererLanes = ei.gatherer_lanes ?? []
	if (gathererLanes.length > 0) {
		let totalYield = 0n, totalDrain = 0n, maxDepth = 0n
		for (const l of gathererLanes) {
			totalYield += BigInt(l.yield.toString())
			totalDrain += BigInt(l.drain.toString())
			const d = BigInt(l.depth.toString())
			if (d > maxDepth) maxDepth = d
		}
		snap.gatherer = {yield: clampU16(totalYield), drain: totalDrain, depth: maxDepth}
	}
	if (ei.hauler != null) {
		snap.hauler = {
			capacity: BigInt(ei.hauler.capacity.toString()),
			efficiency: BigInt(ei.hauler.efficiency.toString()),
			drain: BigInt(ei.hauler.drain.toString()),
		};
	}
	const crafterLanes = ei.crafter_lanes ?? []
	if (crafterLanes.length > 0) {
		let totalSpeed = 0n, totalDrain = 0n
		for (const l of crafterLanes) {
			totalSpeed += BigInt(l.speed.toString())
			totalDrain += BigInt(l.drain.toString())
		}
		snap.crafter = {speed: clampU16(totalSpeed), drain: totalDrain}
	}
	if (ei.warp != null) {
		snap.warp = {range: BigInt(ei.warp.range.toString())};
	}
	const loaderLanes = ei.loader_lanes ?? []
	if (loaderLanes.length > 0) {
		const count = BigInt(loaderLanes.length)
		let totalMass = 0n, totalThrust = 0n
		for (const l of loaderLanes) {
			totalMass += BigInt(l.mass.toString())
			totalThrust += BigInt(l.thrust.toString())
		}
		snap.loaders = {
			mass: totalMass / count,
			thrust: clampU16(totalThrust),
			quantity: count,
		}
	}
	return snap;
}

export async function getEntitySnapshot(
	entityId: bigint | number,
): Promise<EntitySnapshot> {
	const data = await server.readonly("getentity", {
		entity_id: entityId,
	});
	return entityInfoToSnapshot(
		data as unknown as ServerTypes.entity_info,
	);
}

export type EntityKey = `${string}:${string}`;

export function entityKeyOf(snap: Pick<EntitySnapshot, "type" | "id">): EntityKey {
	return `${snap.type}:${String(snap.id)}` as EntityKey;
}

export async function getEntitiesSnapshot(
	owner: string,
	entityType?: EntityTypeName,
): Promise<EntitySnapshot[]> {
	const params: Record<string, unknown> = { owner };
	if (entityType) params.entity_type = entityType;
	const data = await server.readonly("getentities", params as never);
	const arr = data as unknown as ServerTypes.entity_info[];
	return arr.map((ei) => entityInfoToSnapshot(ei));
}

export function mobilitySchedule(
	snap: Pick<EntitySnapshot, "lanes">,
): ServerTypes.lane["schedule"] | undefined {
	return schedule.mobilityLane(snap)?.schedule;
}

export interface SnapshotTaskTimes {
	elapsed_s: number;
	remaining_s: number;
	total_s: number;
}

// The in-progress task on the tracked lane: mobility for ships, else the first
// active lane in canonical order. Drives single-entity progress display.
export function activeLaneTask(
	snap: Pick<EntitySnapshot, "lanes">,
	now: Date = new Date(),
): schedule.OrderedTask | undefined {
	const inProgress = schedule
		.orderedTasks(snap)
		.filter((t) => schedule.currentTaskIndexOf(snap, t.laneKey, now) === t.taskIndex);
	if (inProgress.length === 0) return undefined;
	const mobility = inProgress.find(
		(t) => t.laneKey === schedule.LANE_MOBILITY,
	);
	return mobility ?? inProgress[0];
}

export function snapshotTaskTimes(
	snap: Pick<EntitySnapshot, "lanes">,
	now: Date = new Date(),
): SnapshotTaskTimes {
	const task = activeLaneTask(snap, now);
	if (!task) return { elapsed_s: 0, remaining_s: 0, total_s: 0 };
	const elapsed_s = schedule.laneTaskElapsedOf(
		snap,
		task.laneKey,
		task.taskIndex,
		now,
	);
	const remaining_s = schedule.laneTaskRemainingOf(
		snap,
		task.laneKey,
		task.taskIndex,
		now,
	);
	return { elapsed_s, remaining_s, total_s: elapsed_s + remaining_s };
}

// Entity-wide completed task-fronts in canonical order (what one resolve drains).
export function completedCount(
	snap: Pick<EntitySnapshot, "lanes">,
	now: Date = new Date(),
): number {
	return schedule.resolveOrder(snap, now).length;
}

export function completedTaskCount(snap: EntitySnapshot, now: Date = new Date()): number {
	return completedCount(snap, now);
}

// Queued tasks across all lanes: neither complete nor in progress.
export function pendingTaskCount(
	snap: Pick<EntitySnapshot, "lanes">,
	now: Date = new Date(),
): number {
	return schedule
		.orderedTasks(snap)
		.filter(
			(ot) =>
				!schedule.laneTaskCompleteOf(snap, ot.laneKey, ot.taskIndex, now) &&
				!schedule.laneTaskInProgressOf(snap, ot.laneKey, ot.taskIndex, now),
		).length;
}

export async function getEntityRow(
	entityId: bigint | number,
): Promise<ServerTypes.entity_row> {
	const row = await server.table("entity").get(UInt64.from(entityId));
	if (!row) throw new Error(`entity ${entityId} not found`);
	return row;
}

export interface LaneSnapshotView {
	laneKey: number;
	pending: number;
}

export function lanesWithPendingTasks(
	row: ServerTypes.entity_row,
	now: Date,
): LaneSnapshotView[] {
	return schedule
		.getLanes(row)
		.filter((l) => l.schedule.tasks.length > 0)
		.map((l) => {
			const current = schedule.currentTaskIndexForLane(l.schedule, now);
			const pending =
				current < 0 ? 0 : l.schedule.tasks.length - current;
			return { laneKey: l.laneKey, pending };
		})
		.filter((l) => l.pending > 0);
}

export function laneSnapshot(
	row: ServerTypes.entity_row,
	laneKey: number,
	now: Date,
): LaneTaskView {
	const lane = schedule.getLane(row, laneKey);
	const tasks = (lane?.schedule.tasks ?? []) as ServerTypes.task[];
	const active = lane ? schedule.currentTaskIndexForLane(lane.schedule, now) : -1;
	const isIdle = active < 0;
	const completed = isIdle ? tasks.length : active;
	const pending = isIdle ? [] : tasks.slice(active + 1);
	return {tasks, pending, completed, isIdle};
}
