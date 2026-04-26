import { Option } from "commander";
import type { Types } from "../contracts/server";
import type { EntityTypeName } from "./args";
import { loadConfig } from "./config";
import { formatEntity, formatEntityRef } from "./format";
import { makeProgressRenderer } from "./progress";
import { ensureNoPendingResolve } from "./resolve-prompt";
import type { TransactResult } from "./session";
import { type EntitySnapshot, getEntitySnapshot } from "./snapshot";

export const WAIT_OPTION = new Option(
	"--wait",
	"block until scheduled task completes, then print post-state",
);

export const TRACK_OPTION = new Option(
	"--track",
	"wait with live progress display, then print post-state (implies --wait)",
);

export const AUTO_RESOLVE_OPTION = new Option(
	"--auto-resolve",
	"resolve completed tasks when done (overrides config)",
);

export const TIMEOUT_OPTION = new Option("--timeout <s>", "timeout in seconds").argParser(
	(v) => Number(v) * 1000,
);

export function nextInterval(s: { remaining_s: number; attempt: number }): number {
	if (s.remaining_s <= 2) return 1000;
	if (s.remaining_s < 120) return 2000;
	return 10_000;
}

export type FetchSnapshotFn = (
	entityType: EntityTypeName | string,
	entityId: bigint | number,
) => Promise<EntitySnapshot>;

export type ResolveFn = (
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	completedCount: number,
	autoResolve: boolean,
) => Promise<void>;

export interface WaitTick {
	snap: EntitySnapshot;
	elapsed_s: number;
	remaining_s: number;
	total_s: number;
	attempt: number;
	sinceLastFetch_s: number;
	fetchInterval_s: number;
}

export interface WaitOpts {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	timeoutMs?: number;
	renderIntervalMs?: number;
	fetchIntervalMs?: number;
	sleep?: (ms: number) => Promise<void>;
	fetchSnapshot?: FetchSnapshotFn;
	resolveFn?: ResolveFn;
	onTick?: (tick: WaitTick) => void;
	autoResolve?: boolean;
	initialSnapshot?: EntitySnapshot;
	watch?: boolean;
}

function toNumber(v: unknown): number {
	if (v === undefined || v === null) return 0;
	if (typeof v === "number") return v;
	if (typeof v === "bigint") return Number(v);
	return Number(String(v));
}

function loadAutoResolveDefault(): boolean {
	try {
		return loadConfig().autoResolve;
	} catch {
		return false;
	}
}

export async function maybeAwaitAndPrint(
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	options: { wait?: boolean; track?: boolean },
	result?: TransactResult,
): Promise<void> {
	if (!options.wait && !options.track) return;
	const initialSnapshot = result?.snapshots.get(
		formatEntityRef({ entityType: String(entityType), entityId }),
	) as EntitySnapshot | undefined;
	await awaitAndPrint(entityType, entityId, {
		progress: !!options.track,
		initialSnapshot,
	});
}

const DEFAULT_RENDER_INTERVAL_MS = 1_000;
const DEFAULT_FETCH_INTERVAL_MS = 5_000;

export async function awaitAndPrint(
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	opts?: Omit<WaitOpts, "entityType" | "entityId"> & { progress?: boolean },
): Promise<void> {
	const { progress, ...waitOpts } = opts ?? {};
	const renderer = progress ? makeProgressRenderer() : null;
	let snap: EntitySnapshot;
	try {
		snap = await waitForEntityIdle({
			entityType,
			entityId,
			...waitOpts,
			autoResolve: waitOpts.autoResolve ?? loadAutoResolveDefault(),
			onTick: renderer?.tick ?? waitOpts.onTick,
		});
	} finally {
		renderer?.done();
	}
	if (waitOpts.watch) return;
	console.log(formatEntity(snap as unknown as Types.entity_info));
}

export async function waitForEntityIdle(opts: WaitOpts): Promise<EntitySnapshot> {
	const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
	const fetchSnapshot: FetchSnapshotFn = opts.fetchSnapshot ?? getEntitySnapshot;
	const resolveFn: ResolveFn = opts.resolveFn ?? ensureNoPendingResolve;
	const renderInterval = opts.renderIntervalMs ?? DEFAULT_RENDER_INTERVAL_MS;
	const fetchInterval = opts.fetchIntervalMs ?? DEFAULT_FETCH_INTERVAL_MS;
	const watch = !!opts.watch;

	let modelNow = 0;
	const deadline = opts.timeoutMs ?? null;

	const maybeAutoResolve = async (s: EntitySnapshot): Promise<EntitySnapshot> => {
		const completed = s.schedule?.tasks?.length ?? 0;
		if (completed > 0 && opts.autoResolve) {
			await resolveFn(opts.entityType, opts.entityId, completed, true);
			return await fetchSnapshot(opts.entityType, opts.entityId);
		}
		return s;
	};

	let snap = opts.initialSnapshot ?? (await fetchSnapshot(opts.entityType, opts.entityId));
	let snapAtModel = modelNow;
	let lastFetchAtModel = modelNow;

	if (snap.is_idle) {
		if (!watch) return await maybeAutoResolve(snap);
		snap = await maybeAutoResolve(snap);
	}

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

		opts.onTick?.({
			snap,
			elapsed_s,
			remaining_s,
			total_s,
			attempt,
			sinceLastFetch_s,
			fetchInterval_s: fetchInterval / 1000,
		});
		attempt++;

		if (deadline !== null && modelNow >= deadline) {
			throw new Error(`Timed out waiting for ${opts.entityType} ${opts.entityId}`);
		}

		const needRefetch =
			(!snap.is_idle && remaining_s <= 0) || sinceLastFetch_s * 1000 >= fetchInterval;

		await sleep(renderInterval);
		modelNow += renderInterval;

		if (!needRefetch) continue;

		try {
			snap = await fetchSnapshot(opts.entityType, opts.entityId);
		} catch {
			lastFetchAtModel = modelNow;
			continue;
		}
		snapAtModel = modelNow;
		lastFetchAtModel = modelNow;

		if (snap.is_idle) {
			if (!watch) return await maybeAutoResolve(snap);
			snap = await maybeAutoResolve(snap);
			elapsedAtFetch = 0;
			remainingAtFetch = 0;
			totalAtFetch = 0;
			continue;
		}

		elapsedAtFetch = toNumber(snap.current_task_elapsed);
		remainingAtFetch = toNumber(snap.current_task_remaining);
		totalAtFetch = elapsedAtFetch + remainingAtFetch;
	}
}
