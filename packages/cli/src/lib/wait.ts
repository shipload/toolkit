import { Option } from "commander";
import type { ServerTypes } from "@shipload/sdk";
import type { EntityTypeName } from "./args";
import { loadConfig } from "./config";
import { renderEntityFull } from "./entity-header";
import { formatEntityRef } from "./format";
import { makeProgressRenderer } from "./progress";
import { ensureNoPendingResolve } from "./resolve-prompt";
import type { TransactResult } from "./session";
import { type EntitySnapshot, getEntitySnapshot } from "./snapshot";
import {
	DEFAULT_FETCH_INTERVAL_MS,
	DEFAULT_RENDER_INTERVAL_MS,
	streamEntitySnapshot,
} from "./snapshot-stream";

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
	console.log(renderEntityFull(snap as unknown as ServerTypes.entity_info));
}

export async function waitForEntityIdle(opts: WaitOpts): Promise<EntitySnapshot> {
	const renderInterval = opts.renderIntervalMs ?? DEFAULT_RENDER_INTERVAL_MS;
	const fetchInterval = opts.fetchIntervalMs ?? DEFAULT_FETCH_INTERVAL_MS;
	const fetchSnapshot: FetchSnapshotFn = opts.fetchSnapshot ?? getEntitySnapshot;
	const resolveFn: ResolveFn = opts.resolveFn ?? ensureNoPendingResolve;
	const watch = !!opts.watch;
	const deadline = opts.timeoutMs ?? null;

	const maybeAutoResolve = async (s: EntitySnapshot): Promise<EntitySnapshot> => {
		const completed = s.schedule?.tasks?.length ?? 0;
		if (completed > 0 && opts.autoResolve) {
			await resolveFn(opts.entityType, opts.entityId, completed, true);
			return await fetchSnapshot(opts.entityType, opts.entityId);
		}
		return s;
	};

	let modelNow = 0;
	let lastSnap: EntitySnapshot | undefined;

	for await (const tick of streamEntitySnapshot({
		entityType: opts.entityType,
		entityId: opts.entityId,
		initialSnapshot: opts.initialSnapshot,
		fetchSnapshot: opts.fetchSnapshot,
		sleep: opts.sleep,
		renderIntervalMs: renderInterval,
		fetchIntervalMs: fetchInterval,
	})) {
		opts.onTick?.(tick);
		lastSnap = tick.snap;

		if (deadline !== null && modelNow >= deadline) {
			throw new Error(`Timed out waiting for ${opts.entityType} ${opts.entityId}`);
		}
		modelNow += renderInterval;

		if (tick.snap.is_idle) {
			const resolved = await maybeAutoResolve(tick.snap);
			if (!watch) return resolved;
			lastSnap = resolved;
		}
	}
	return lastSnap as EntitySnapshot;
}
