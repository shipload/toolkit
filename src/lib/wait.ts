import type { EntityTypeName } from "./args";
import { ensureNoPendingResolve } from "./resolve-prompt";
import { getEntitySnapshot } from "./snapshot";

export function nextInterval(s: { remaining_s: number; attempt: number }): number {
	if (s.remaining_s <= 2) return 1000;
	if (s.remaining_s < 120) return 2000;
	return 10_000;
}

export type FetchSnapshotFn = (
	entityType: EntityTypeName | string,
	entityId: bigint | number,
) => Promise<unknown>;

export type ResolveFn = (
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	completedCount: number,
	autoResolve: boolean,
) => Promise<void>;

export interface WaitOpts {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	timeoutMs?: number;
	intervalFn?: typeof nextInterval;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
	fetchSnapshot?: FetchSnapshotFn;
	resolveFn?: ResolveFn;
}

interface EntitySnapshotLike {
	is_idle?: boolean;
	current_task_remaining?: number | bigint | { toString(): string };
	schedule?: { tasks?: unknown[] };
}

function toNumber(v: unknown): number {
	if (v === undefined || v === null) return 0;
	if (typeof v === "number") return v;
	if (typeof v === "bigint") return Number(v);
	return Number(String(v));
}

function countCompletedTasks(snap: EntitySnapshotLike): number {
	if (!snap.is_idle) return 0;
	const tasks = snap.schedule?.tasks;
	return Array.isArray(tasks) ? tasks.length : 0;
}

export async function waitForEntityIdle(opts: WaitOpts): Promise<void> {
	const intervalFn = opts.intervalFn ?? nextInterval;
	const now = opts.now ?? (() => Date.now());
	const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
	const fetchSnapshot: FetchSnapshotFn = opts.fetchSnapshot ?? getEntitySnapshot;
	const resolveFn: ResolveFn = opts.resolveFn ?? ensureNoPendingResolve;
	const deadline = opts.timeoutMs ? now() + opts.timeoutMs : null;

	let attempt = 0;
	while (true) {
		const snap = (await fetchSnapshot(opts.entityType, opts.entityId)) as EntitySnapshotLike;

		if (snap.is_idle) {
			const completed = countCompletedTasks(snap);
			if (completed > 0) {
				await resolveFn(opts.entityType, opts.entityId, completed, true);
			}
			return;
		}

		const remaining_s = toNumber(snap.current_task_remaining);

		if (deadline !== null && now() > deadline) {
			throw new Error(`Timed out waiting for ${opts.entityType} ${opts.entityId}`);
		}

		await sleep(intervalFn({ remaining_s, attempt }));
		attempt++;
	}
}
