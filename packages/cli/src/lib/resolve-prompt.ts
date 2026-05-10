import type { EntityRef } from "./args";
import { getShipload } from "./client";
import { transact } from "./session";
import { completedTaskCount, getEntitySnapshot } from "./snapshot";

export async function ensureNoPendingResolve(
	entityId: bigint | number,
	completedCount: number,
	autoResolve: boolean,
	opts: { quiet?: boolean } = {},
): Promise<void> {
	if (completedCount === 0) return;
	if (!autoResolve) return;
	const shipload = await getShipload();
	const action = shipload.actions.resolve(BigInt(entityId.toString()));
	await transact(
		{ action },
		opts.quiet
			? {}
			: { description: `Auto-resolved completed tasks on entity ${entityId}` },
	);
}

export async function checkResolveEntity(
	entityId: bigint | number,
	autoResolve: boolean,
): Promise<void> {
	const snap = await getEntitySnapshot(entityId);
	const completed = completedTaskCount(snap);
	await ensureNoPendingResolve(entityId, completed, autoResolve);
}

export async function resolveGroupCompleted(entities: EntityRef[]): Promise<void> {
	if (entities.length === 0) return;
	const snaps = await Promise.all(
		entities.map((e) => getEntitySnapshot(e.entityId)),
	);
	const toResolve = entities.filter((_, i) => completedTaskCount(snaps[i]) > 0);
	if (toResolve.length === 0) return;
	const shipload = await getShipload();
	const actions = toResolve.map((e) => shipload.actions.resolve(e.entityId));
	await transact(
		{ actions },
		{ description: `Auto-resolved ${actions.length} entit${actions.length === 1 ? "y" : "ies"}` },
	);
}
