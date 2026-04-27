export function formatDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const mm = Math.floor(s / 60);
	const ss = s % 60;
	return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export interface ProgressLineInput {
	cellsDone: number;
	cellsTotal: number;
	locations: number;
	strata: number;
	elapsedSeconds: number;
	etaSeconds: number;
}

export function formatProgressLine(p: ProgressLineInput): string {
	const pct = Math.min(100, Math.floor((p.cellsDone / p.cellsTotal) * 100));
	return (
		`[${pct}%] ${p.cellsDone}/${p.cellsTotal} cells · ` +
		`${p.locations} locations · ${p.strata} strata · ` +
		`elapsed ${formatDuration(p.elapsedSeconds)} · ETA ${formatDuration(p.etaSeconds)}`
	);
}

export class ProgressTracker {
	private readonly startMs: number;
	private cellsDone = 0;
	private locations = 0;
	private strata = 0;

	constructor(
		private readonly total: number,
		private readonly intervalCells = 1000,
		private readonly log: (line: string) => void = (l) => console.log(l),
	) {
		this.startMs = Date.now();
	}

	tickCell(): void {
		this.cellsDone++;
		if (this.cellsDone % this.intervalCells === 0 || this.cellsDone === this.total) {
			this.emit();
		}
	}

	addLocation(): void {
		this.locations++;
	}

	addStrata(n: number): void {
		this.strata += n;
	}

	private emit(): void {
		const elapsedSeconds = (Date.now() - this.startMs) / 1000;
		const rate = this.cellsDone / Math.max(elapsedSeconds, 0.001);
		const remaining = Math.max(0, this.total - this.cellsDone);
		const etaSeconds = remaining / Math.max(rate, 0.001);
		this.log(
			formatProgressLine({
				cellsDone: this.cellsDone,
				cellsTotal: this.total,
				locations: this.locations,
				strata: this.strata,
				elapsedSeconds,
				etaSeconds,
			}),
		);
	}

	finalElapsedSeconds(): number {
		return (Date.now() - this.startMs) / 1000;
	}
}
