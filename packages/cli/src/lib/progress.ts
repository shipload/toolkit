import type { ServerTypes } from "@shipload/sdk";
import { schedule } from "@shipload/sdk";
import {
	formatCargoUsage,
	formatCoordinatePair,
	formatDuration,
	formatTaskShort,
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

export function composeBlock(t: ProgressTick): string[] {
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
	if (t.snap.coordinates)
		parts.push(formatCoordinatePair(t.snap.coordinates as unknown as ServerTypes.coordinates));
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
	const completed = schedule.resolveOrder(t.snap, new Date()).length;
	const refreshIn = Math.max(0, Math.ceil(t.fetchInterval_s - t.sinceLastFetch_s));
	const parts = ["◌ idle"];
	if (completed > 0) parts.push(`${completed} task(s) awaiting resolve`);
	parts.push(`refresh in ${refreshIn}s`);
	return [`  ${parts.join("  ·  ")}`];
}

function laneTag(key: number): string {
	return key === schedule.LANE_MOBILITY ? "mob" : `L${key}`;
}

function busyBody(t: ProgressTick): string[] {
	const now = new Date();
	const ordered = schedule.orderedTasks(t.snap);
	const lines: string[] = [];
	for (const ot of ordered) {
		const done = schedule.laneTaskCompleteOf(t.snap, ot.laneKey, ot.taskIndex, now);
		const active = schedule.laneTaskInProgressOf(t.snap, ot.laneKey, ot.taskIndex, now);
		const prefix = done ? "  ✓ " : active ? "  ▶ " : "    ";
		const suffix = done ? "done" : formatDuration(Number(ot.task.duration ?? 0));
		lines.push(taskRow(prefix, ot.task, `${laneTag(ot.laneKey)}  ${suffix}`));
	}
	const remainingLabel = formatDuration(Math.max(0, Math.ceil(t.remaining_s)));
	const ratio = t.total_s > 0 ? Math.min(1, Math.max(0, t.elapsed_s / t.total_s)) : 0;
	const filled = Math.round(ratio * BAR_WIDTH);
	const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
	lines.push(`  [${bar}] ${remainingLabel} remaining`);
	return lines;
}

function taskRow(prefix: string, task:ServerTypes.task, suffix: string): string {
	const desc = formatTaskShort(task);
	const padded = desc.length >= TASK_DESC_WIDTH ? `${desc} ` : desc.padEnd(TASK_DESC_WIDTH);
	return `${prefix}${padded}${suffix}`;
}
