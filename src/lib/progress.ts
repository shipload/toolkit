import type { Types } from "../contracts/server";
import {
	formatCargoUsage,
	formatCoords,
	formatDuration,
	formatTaskShort,
	formatTimeUTC,
	projectEnergy,
} from "./format";
import type { EntitySnapshot } from "./snapshot";

const BAR_WIDTH = 28;
const TASK_DESC_WIDTH = 32;

export interface ProgressTick {
	snap: EntitySnapshot;
	elapsed_s: number;
	remaining_s: number;
	total_s: number;
	sinceLastFetch_s: number;
	fetchInterval_s: number;
}

export interface ProgressRenderer {
	tick: (t: ProgressTick) => void;
	done: () => void;
}

let cursorHidden = false;
let cleanupInstalled = false;

function showCursor(): void {
	if (cursorHidden) {
		process.stderr.write("\x1b[?25h");
		cursorHidden = false;
	}
}

function installCleanupOnce(): void {
	if (cleanupInstalled) return;
	cleanupInstalled = true;
	process.on("exit", showCursor);
	process.on("SIGINT", () => {
		showCursor();
		process.exit(130);
	});
}

export function makeProgressRenderer(out: NodeJS.WriteStream = process.stderr): ProgressRenderer {
	const isTTY = !!out.isTTY;
	let lastLines = 0;
	let lastFrame = "";
	installCleanupOnce();

	const moveCursorToBlockStart = (): void => {
		if (lastLines > 0) out.write(`\x1b[${lastLines}A`);
	};

	const tick = (t: ProgressTick): void => {
		const lines = composeBlock(t);
		const frame = lines.join("\n");
		if (frame === lastFrame) return;
		lastFrame = frame;
		if (!isTTY) {
			out.write(`\r${lines[lines.length - 1]}    `);
			return;
		}
		if (!cursorHidden) {
			out.write("\x1b[?25l");
			cursorHidden = true;
		}
		moveCursorToBlockStart();
		for (const line of lines) out.write(`\r\x1b[2K${line}\n`);
		if (lines.length < lastLines) {
			for (let i = 0; i < lastLines - lines.length; i++) out.write("\r\x1b[2K\n");
			out.write(`\x1b[${lastLines - lines.length}A`);
		}
		lastLines = lines.length;
	};

	const done = (): void => {
		lastFrame = "";
		if (!isTTY) {
			out.write(`\r${" ".repeat(80)}\r`);
			showCursor();
			return;
		}
		moveCursorToBlockStart();
		for (let i = 0; i < lastLines; i++) out.write("\r\x1b[2K\n");
		if (lastLines > 0) out.write(`\x1b[${lastLines}A`);
		lastLines = 0;
		showCursor();
	};

	return { tick, done };
}

function composeBlock(t: ProgressTick): string[] {
	const lines = [headerLine(t.snap)];
	const stats = statsLine(t);
	if (stats) lines.push(stats);
	if (t.snap.is_idle) lines.push(...idleBody(t));
	else lines.push(...busyBody(t));
	return lines;
}

function headerLine(snap: EntitySnapshot): string {
	const name = snap.entity_name?.trim();
	const ref = `${snap.type} ${snap.id}`;
	return name ? `${name}  ·  ${ref}` : ref;
}

function statsLine(t: ProgressTick): string | null {
	const parts: string[] = [];
	if (t.snap.coordinates) parts.push(formatCoords(t.snap.coordinates as Types.coordinates));
	const energyStr = energySummary(t);
	if (energyStr) parts.push(energyStr);
	const cargoStr = cargoSummary(t.snap);
	if (cargoStr) parts.push(cargoStr);
	if (parts.length === 0) return null;
	return `  ${parts.join("  ·  ")}`;
}

function energySummary(t: ProgressTick): string | null {
	if (t.snap.energy === undefined) return null;
	const stored = Number(t.snap.energy);
	if (!t.snap.generator) return `⚡ ${stored}`;
	const cap = Number(t.snap.generator.capacity);
	const recharge = Number(t.snap.generator.recharge);
	if (t.snap.is_idle || !recharge) return `⚡ ${stored}/${cap}`;
	return `⚡ ${projectEnergy(stored, cap, recharge, 0, t.elapsed_s)}/${cap}`;
}

function cargoSummary(snap: EntitySnapshot): string | null {
	if (snap.cargomass === undefined) return null;
	const cap = snap.capacity !== undefined ? Number(snap.capacity) : undefined;
	return `cargo ${formatCargoUsage(Number(snap.cargomass), cap)}`;
}

function idleBody(t: ProgressTick): string[] {
	const completed = t.snap.schedule?.tasks?.length ?? 0;
	const refreshIn = Math.max(0, Math.ceil(t.fetchInterval_s - t.sinceLastFetch_s));
	const parts = ["◌ idle"];
	if (completed > 0) parts.push(`${completed} task(s) awaiting resolve`);
	parts.push(`refresh in ${refreshIn}s`);
	return [`  ${parts.join("  ·  ")}`];
}

function busyBody(t: ProgressTick): string[] {
	const all = (t.snap.schedule?.tasks ?? []) as Types.task[];
	const pendingCount = (t.snap.pending_tasks ?? []).length;
	const activeIdx = Math.max(0, all.length - pendingCount - 1);
	const done = all.slice(0, activeIdx);
	const active = all[activeIdx] ?? t.snap.current_task;
	const pending = all.slice(activeIdx + 1);

	const lines: string[] = [];
	for (const task of done) lines.push(taskRow("  ✓ ", task, "done"));
	if (active) lines.push(taskRow("  ▶ ", active, formatDuration(Number(active.duration ?? 0))));

	const remainingLabel = formatDuration(Math.max(0, Math.ceil(t.remaining_s)));
	const ratio = t.total_s > 0 ? Math.min(1, Math.max(0, t.elapsed_s / t.total_s)) : 0;
	const filled = Math.round(ratio * BAR_WIDTH);
	const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
	lines.push(`  [${bar}] ${remainingLabel} remaining`);

	if (pending.length > 0) {
		lines.push("  Queued:");
		for (const task of pending) {
			lines.push(taskRow("    ", task, formatDuration(Number(task.duration ?? 0))));
		}
		const totalRemaining_s =
			Math.max(0, t.remaining_s) +
			pending.reduce((acc, p) => acc + Number(p.duration ?? 0), 0);
		const finishesAt = new Date(Date.now() + totalRemaining_s * 1000);
		lines.push(
			`  ETA: ${formatDuration(Math.ceil(totalRemaining_s))} · finishes at ${formatTimeUTC(finishesAt)}`,
		);
	}

	return lines;
}

function taskRow(prefix: string, task: Types.task, suffix: string): string {
	const desc = formatTaskShort(task);
	const padded = desc.length >= TASK_DESC_WIDTH ? `${desc} ` : desc.padEnd(TASK_DESC_WIDTH);
	return `${prefix}${padded}${suffix}`;
}
