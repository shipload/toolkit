import type { ServerTypes } from "@shipload/sdk";
import type { EntityTypeName } from "./args";
import { server } from "./client";

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
	gatherer?: { yield: bigint; drain: bigint; depth: bigint; speed: bigint };
	hauler?: { capacity: bigint; efficiency: bigint; drain: bigint };
	crafter?: { speed: bigint; drain: bigint };
	warp?: { range: bigint };
	loaders?: { mass: bigint; thrust: bigint; quantity: bigint };
	is_idle: boolean;
	current_task?: ServerTypes.task;
	current_task_elapsed?: bigint;
	current_task_remaining?: bigint;
	pending_tasks?: ServerTypes.task[];
	schedule?: {
		started?: { toMilliseconds(): number } | string | Date;
		tasks: unknown[];
	};
}

// Task fields (current_task, pending_tasks, schedule.tasks) and cargo[i].modules
// are passed through with wharfkit types intact; downstream rendering tolerates
// them via toString. If task-comparison logic is added later, expand the converter.
export function entityInfoToSnapshot(
	ei: ServerTypes.entity_info,
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
		is_idle: ei.is_idle,
		current_task: ei.current_task,
		current_task_elapsed: BigInt(ei.current_task_elapsed.toString()),
		current_task_remaining: BigInt(ei.current_task_remaining.toString()),
		pending_tasks: ei.pending_tasks,
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
	if (ei.gatherer != null) {
		snap.gatherer = {
			yield: BigInt(ei.gatherer.yield.toString()),
			drain: BigInt(ei.gatherer.drain.toString()),
			depth: BigInt(ei.gatherer.depth.toString()),
			speed: BigInt(ei.gatherer.speed.toString()),
		};
	}
	if (ei.hauler != null) {
		snap.hauler = {
			capacity: BigInt(ei.hauler.capacity.toString()),
			efficiency: BigInt(ei.hauler.efficiency.toString()),
			drain: BigInt(ei.hauler.drain.toString()),
		};
	}
	if (ei.crafter != null) {
		snap.crafter = {
			speed: BigInt(ei.crafter.speed.toString()),
			drain: BigInt(ei.crafter.drain.toString()),
		};
	}
	if (ei.warp != null) {
		snap.warp = {range: BigInt(ei.warp.range.toString())};
	}
	if (ei.loaders != null) {
		snap.loaders = {
			mass: BigInt(ei.loaders.mass.toString()),
			thrust: BigInt(ei.loaders.thrust.toString()),
			quantity: BigInt(ei.loaders.quantity.toString()),
		};
	}
	if (ei.schedule != null) {
		snap.schedule = {
			started: ei.schedule.started,
			tasks: ei.schedule.tasks,
		};
	}
	return snap;
}

export async function getEntitySnapshot(
	entityType: EntityTypeName | string,
	entityId: bigint | number,
): Promise<EntitySnapshot> {
	const data = await server.readonly("getentity", {
		entity_type: entityType,
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
	return arr.map(entityInfoToSnapshot);
}

export function completedTaskCount(snap: EntitySnapshot): number {
	if (!snap.is_idle) return 0;
	return snap.schedule?.tasks.length ?? 0;
}

export function completedCount(snap: EntitySnapshot): number {
	if (snap.is_idle) return snap.schedule?.tasks?.length ?? 0;
	const all = snap.schedule?.tasks?.length ?? 0;
	const pending = snap.pending_tasks?.length ?? 0;
	return Math.max(0, all - pending - 1);
}
