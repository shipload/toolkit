import type { Types } from "../contracts/server";
import type { EntityTypeName } from "./args";
import { server } from "./client";

export interface EntitySnapshot {
	type: string;
	id: bigint;
	owner: string;
	entity_name: string;
	coordinates: {
		x: bigint | number | { toString(): string };
		y: bigint | number | { toString(): string };
	};
	cargomass: number | bigint | { toString(): string };
	cargo: {
		item_id: number | bigint | { toString(): string };
		quantity: number | bigint | { toString(): string };
	}[];
	capacity?: number | bigint | { toString(): string };
	energy?: number | bigint | { toString(): string };
	gatherer?: { depth: number | bigint | { toString(): string } };
	generator?: {
		capacity: number | bigint | { toString(): string };
		recharge: number | bigint | { toString(): string };
	};
	is_idle: boolean;
	current_task?: Types.task;
	current_task_elapsed?: number | bigint | { toString(): string };
	current_task_remaining?: number | bigint | { toString(): string };
	pending_tasks?: Types.task[];
	schedule?: {
		started?: { toMilliseconds(): number } | string | Date;
		tasks: unknown[];
	};
}

export async function getEntitySnapshot(
	entityType: EntityTypeName | string,
	entityId: bigint | number,
): Promise<EntitySnapshot> {
	const data = await server.readonly("getentity", {
		entity_type: entityType,
		entity_id: entityId,
	});
	return data as unknown as EntitySnapshot;
}

export function completedTaskCount(snap: EntitySnapshot): number {
	if (!snap.is_idle) return 0;
	return snap.schedule?.tasks.length ?? 0;
}
