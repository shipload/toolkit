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
	gatherer?: { depth: bigint };
	generator?: {
		capacity: bigint;
		recharge: bigint;
	};
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
	if (ei.capacity !== undefined) snap.capacity = BigInt(ei.capacity.toString());
	if (ei.energy !== undefined) snap.energy = BigInt(ei.energy.toString());
	if (ei.gatherer !== undefined) {
		snap.gatherer = {depth: BigInt(ei.gatherer.depth.toString())};
	}
	if (ei.generator !== undefined) {
		snap.generator = {
			capacity: BigInt(ei.generator.capacity.toString()),
			recharge: BigInt(ei.generator.recharge.toString()),
		};
	}
	if (ei.schedule !== undefined) {
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
