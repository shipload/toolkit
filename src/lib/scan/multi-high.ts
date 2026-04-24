import type { MultiHighSnapshot, StatTriple } from "./types";

const DEFAULT_TIERS = [800, 900, 950];

export class MultiHigh {
	private readonly thresholds: number[];
	private readonly counts: Map<number, { atLeast1: number; atLeast2: number; atLeast3: number }>;
	private total = 0;

	constructor(userThreshold: number) {
		const set = new Set<number>([...DEFAULT_TIERS, userThreshold]);
		this.thresholds = [...set].sort((a, b) => a - b);
		this.counts = new Map();
		for (const t of this.thresholds) {
			this.counts.set(t, { atLeast1: 0, atLeast2: 0, atLeast3: 0 });
		}
	}

	ingest(stats: StatTriple): void {
		this.total++;
		const values = [stats.stat1, stats.stat2, stats.stat3];
		for (const t of this.thresholds) {
			const n = values.filter((v) => v >= t).length;
			const entry = this.counts.get(t)!;
			if (n >= 1) entry.atLeast1++;
			if (n >= 2) entry.atLeast2++;
			if (n >= 3) entry.atLeast3++;
		}
	}

	mergeSnapshot(snap: MultiHighSnapshot): void {
		this.total += snap.totalStrata;
		for (const tier of snap.tiers) {
			const entry = this.counts.get(tier.threshold);
			if (entry) {
				entry.atLeast1 += tier.atLeast1;
				entry.atLeast2 += tier.atLeast2;
				entry.atLeast3 += tier.atLeast3;
			}
		}
	}

	snapshot(): MultiHighSnapshot {
		return {
			tiers: this.thresholds.map((t) => ({ threshold: t, ...this.counts.get(t)! })),
			totalStrata: this.total,
		};
	}
}
