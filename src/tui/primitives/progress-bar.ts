const MAX_WIDTH = 40;
const MIN_WIDTH = 8;

export interface BarSizing {
	available: number;
	reservedRight: number;
}

export function renderProgressBar(ratio: number, fixed: number, sizing?: BarSizing): string {
	const width = sizing
		? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, sizing.available - sizing.reservedRight))
		: fixed;
	const clamped = Math.max(0, Math.min(1, ratio));
	const filled = Math.round(clamped * width);
	return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`;
}
