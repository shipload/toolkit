import { Name } from "@wharfkit/antelope";
import type { EntityTypeName } from "./args";
import { getShipload } from "./client";
import { transact } from "./session";
import { completedTaskCount, getEntitySnapshot } from "./snapshot";

export async function ensureNoPendingResolve(
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	completedCount: number,
	autoResolve: boolean,
): Promise<void> {
	if (completedCount === 0) return;
	if (!autoResolve) return;
	const shipload = await getShipload();
	const action = shipload.actions.resolve(
		BigInt(entityId.toString()),
		Name.from(String(entityType)),
	);
	await transact(
		{ action },
		{ description: `Auto-resolved completed tasks on ${entityType} ${entityId}` },
	);
}

export async function checkResolveEntity(
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	autoResolve: boolean,
): Promise<void> {
	const snap = await getEntitySnapshot(entityType, entityId);
	const completed = completedTaskCount(snap);
	await ensureNoPendingResolve(entityType, entityId, completed, autoResolve);
}
