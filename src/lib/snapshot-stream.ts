import type { EntityTypeName } from "./args";
import { type EntitySnapshot, getEntitySnapshot } from "./snapshot";

export type FetchSnapshotFn = (
	entityType: EntityTypeName | string,
	entityId: bigint | number,
) => Promise<EntitySnapshot>;

export interface SnapshotTick {
	snap: EntitySnapshot;
	elapsed_s: number;
	remaining_s: number;
	total_s: number;
	attempt: number;
	sinceLastFetch_s: number;
	fetchInterval_s: number;
}

export interface SnapshotStreamOpts {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	initialSnapshot?: EntitySnapshot;
	fetchSnapshot?: FetchSnapshotFn;
	sleep?: (ms: number) => Promise<void>;
	renderIntervalMs?: number;
	fetchIntervalMs?: number;
}

export const DEFAULT_RENDER_INTERVAL_MS = 1_000;
export const DEFAULT_FETCH_INTERVAL_MS = 5_000;
const SMOOTH_TOLERANCE_S = 2;

function toNumber(v: unknown): number {
	if (v === undefined || v === null) return 0;
	if (typeof v === "number") return v;
	if (typeof v === "bigint") return Number(v);
	return Number(String(v));
}

export async function* streamEntitySnapshot(
	opts: SnapshotStreamOpts,
): AsyncGenerator<SnapshotTick, void, void> {
	const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
	const fetchSnapshot = opts.fetchSnapshot ?? getEntitySnapshot;
	const renderInterval = opts.renderIntervalMs ?? DEFAULT_RENDER_INTERVAL_MS;
	const fetchInterval = opts.fetchIntervalMs ?? DEFAULT_FETCH_INTERVAL_MS;

	let modelNow = 0;
	let snap = opts.initialSnapshot ?? (await fetchSnapshot(opts.entityType, opts.entityId));
	let snapAtModel = modelNow;
	let lastFetchAtModel = modelNow;
	let elapsedAtFetch = snap.is_idle ? 0 : toNumber(snap.current_task_elapsed);
	let remainingAtFetch = snap.is_idle ? 0 : toNumber(snap.current_task_remaining);
	let totalAtFetch = elapsedAtFetch + remainingAtFetch;
	let attempt = 0;

	while (true) {
		const dt = (modelNow - snapAtModel) / 1000;
		const elapsed_s = elapsedAtFetch + dt;
		const remaining_s = Math.max(0, remainingAtFetch - dt);
		const total_s = totalAtFetch > 0 ? totalAtFetch : elapsed_s + remaining_s;
		const sinceLastFetch_s = (modelNow - lastFetchAtModel) / 1000;

		yield {
			snap,
			elapsed_s,
			remaining_s,
			total_s,
			attempt,
			sinceLastFetch_s,
			fetchInterval_s: fetchInterval / 1000,
		};
		attempt++;

		const needRefetch =
			(!snap.is_idle && remaining_s <= 0) || sinceLastFetch_s * 1000 >= fetchInterval;

		await sleep(renderInterval);
		modelNow += renderInterval;

		if (!needRefetch) continue;

		const wasBusy = !snap.is_idle;
		const oldTotal = totalAtFetch;
		const interpolatedRemainingAtRefetch = Math.max(
			0,
			remainingAtFetch - (modelNow - snapAtModel) / 1000,
		);

		try {
			snap = await fetchSnapshot(opts.entityType, opts.entityId);
		} catch {
			lastFetchAtModel = modelNow;
			continue;
		}
		lastFetchAtModel = modelNow;

		if (snap.is_idle) {
			snapAtModel = modelNow;
			elapsedAtFetch = 0;
			remainingAtFetch = 0;
			totalAtFetch = 0;
			continue;
		}

		const newElapsed = toNumber(snap.current_task_elapsed);
		const newRemaining = toNumber(snap.current_task_remaining);
		const newTotal = newElapsed + newRemaining;
		const sameTask = wasBusy && Math.abs(newTotal - oldTotal) <= SMOOTH_TOLERANCE_S;
		const closeToInterpolation =
			Math.abs(newRemaining - interpolatedRemainingAtRefetch) <= SMOOTH_TOLERANCE_S;

		if (sameTask && closeToInterpolation) {
			// Chain agrees with our interpolation — keep counting down smoothly.
			remainingAtFetch = interpolatedRemainingAtRefetch;
			elapsedAtFetch = Math.max(0, newTotal - interpolatedRemainingAtRefetch);
			totalAtFetch = newTotal;
		} else {
			elapsedAtFetch = newElapsed;
			remainingAtFetch = newRemaining;
			totalAtFetch = newTotal;
		}
		snapAtModel = modelNow;
	}
}
