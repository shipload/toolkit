import { formatDuration } from "./format";

const BAR_WIDTH = 20;

export interface ProgressTick {
	remaining_s: number;
	total_s: number;
}

export function makeProgressRenderer(): { tick: (t: ProgressTick) => void; done: () => void } {
	let lastRendered = -1;

	const tick = ({ remaining_s, total_s }: ProgressTick): void => {
		const ceilRemaining = Math.ceil(remaining_s);
		if (ceilRemaining === lastRendered) return;
		lastRendered = ceilRemaining;
		const elapsed = Math.max(0, total_s - remaining_s);
		const ratio = total_s > 0 ? Math.min(1, elapsed / total_s) : 0;
		const filled = Math.round(ratio * BAR_WIDTH);
		const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
		const timeStr = formatDuration(ceilRemaining);
		process.stderr.write(`\r  [${bar}]  ${timeStr} remaining    `);
	};

	const done = (): void => {
		process.stderr.write(`\r${" ".repeat(BAR_WIDTH + 22)}\r`);
	};

	return { tick, done };
}
