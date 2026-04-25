import { Option } from "commander";
import type { Types } from "../contracts/server";
import type { EntityTypeName } from "./args";
import { loadConfig } from "./config";
import { formatEntity, formatEntityRef } from "./format";
import { makeProgressRenderer } from "./progress";
import { ensureNoPendingResolve } from "./resolve-prompt";
import type { TransactResult } from "./session";
import { getEntitySnapshot } from "./snapshot";

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
) => Promise<unknown>;

export type ResolveFn = (
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	completedCount: number,
	autoResolve: boolean,
) => Promise<void>;

export interface WaitTick {
	remaining_s: number;
	total_s: number;
	attempt: number;
}

export interface WaitOpts {
	entityType: EntityTypeName | string;
	entityId: bigint | number;
	timeoutMs?: number;
	intervalFn?: typeof nextInterval;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
	fetchSnapshot?: FetchSnapshotFn;
	resolveFn?: ResolveFn;
	onTick?: (tick: WaitTick) => void;
	autoResolve?: boolean;
	initialSnapshot?: unknown;
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
	);
	await awaitAndPrint(entityType, entityId, {
		progress: !!options.track,
		initialSnapshot,
	});
}

const PROGRESS_MAX_INTERVAL_MS = 5_000;

export async function awaitAndPrint(
	entityType: EntityTypeName | string,
	entityId: bigint | number,
	opts?: Omit<WaitOpts, "entityType" | "entityId"> & { progress?: boolean },
): Promise<void> {
	const { progress, ...waitOpts } = opts ?? {};
	const renderer = progress ? makeProgressRenderer() : null;
	const baseInterval = waitOpts.intervalFn ?? nextInterval;
	const snap = await waitForEntityIdle({
		entityType,
		entityId,
		...waitOpts,
		autoResolve: waitOpts.autoResolve ?? loadAutoResolveDefault(),
		onTick: renderer?.tick ?? waitOpts.onTick,
		intervalFn: renderer
			? (s) => Math.min(baseInterval(s), PROGRESS_MAX_INTERVAL_MS)
			: waitOpts.intervalFn,
	});
	renderer?.done();
	console.log(formatEntity(snap as unknown as Types.entity_info));
}

export async function waitForEntityIdle(opts: WaitOpts): Promise<unknown> {
	const intervalFn = opts.intervalFn ?? nextInterval;
	const now = opts.now ?? (() => Date.now());
	const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
	const fetchSnapshot: FetchSnapshotFn = opts.fetchSnapshot ?? getEntitySnapshot;
	const resolveFn: ResolveFn = opts.resolveFn ?? ensureNoPendingResolve;
	const deadline = opts.timeoutMs ? now() + opts.timeoutMs : null;

	let attempt = 0;
	let total_s = 0;
	let firstSnap = opts.initialSnapshot as EntitySnapshotLike | undefined;
	while (true) {
		const snap =
			firstSnap ??
			((await fetchSnapshot(opts.entityType, opts.entityId)) as EntitySnapshotLike);
		firstSnap = undefined;

		if (snap.is_idle) {
			const completed = snap.schedule?.tasks?.length ?? 0;
			if (completed > 0 && opts.autoResolve) {
				await resolveFn(opts.entityType, opts.entityId, completed, true);
				return await fetchSnapshot(opts.entityType, opts.entityId);
			}
			return snap;
		}

		const remaining_s = toNumber(snap.current_task_remaining);
		if (remaining_s > total_s) total_s = remaining_s;

		if (deadline !== null && now() > deadline) {
			throw new Error(`Timed out waiting for ${opts.entityType} ${opts.entityId}`);
		}

		opts.onTick?.({ remaining_s, total_s, attempt });
		await sleep(intervalFn({ remaining_s, attempt }));
		attempt++;
	}
}
