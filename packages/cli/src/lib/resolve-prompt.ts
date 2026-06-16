import { composeIdleResolve } from "@shipload/sdk";
import { type Action, UInt64 } from "@wharfkit/antelope";
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

export async function bundleWithIdleResolve(
	entityId: bigint | number,
	action: Action,
	autoResolve: boolean,
): Promise<Action[]> {
	if (!autoResolve) return [action];
	const snap = await getEntitySnapshot(entityId);
	const sl = await getShipload();
	return composeIdleResolve(
		{ id: UInt64.from(snap.id), lanes: snap.lanes },
		action,
		sl.actions,
		new Date(),
	);
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
