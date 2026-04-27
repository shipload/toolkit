import type { HistogramSnapshot, StatTriple } from "./types";

function bucketIndex(v: number): number {
	if (v < 0) return 0;
	if (v >= 1000) return 9;
	return Math.floor(v / 100);
}

export class Histogram {
	private readonly s1 = new Array(10).fill(0);
	private readonly s2 = new Array(10).fill(0);
	private readonly s3 = new Array(10).fill(0);
	private readonly cb = new Array(10).fill(0);
	private total = 0;

	ingest(stats: StatTriple): void {
		const b1 = bucketIndex(stats.stat1);
		const b2 = bucketIndex(stats.stat2);
		const b3 = bucketIndex(stats.stat3);
		this.s1[b1]++;
		this.s2[b2]++;
		this.s3[b3]++;
		this.cb[b1]++;
		this.cb[b2]++;
		this.cb[b3]++;
		this.total++;
	}

	mergeSnapshot(snap: HistogramSnapshot): void {
		for (let i = 0; i < 10; i++) {
			this.s1[i] += snap.stat1[i];
			this.s2[i] += snap.stat2[i];
			this.s3[i] += snap.stat3[i];
			this.cb[i] += snap.combined[i];
		}
		this.total += snap.totalSamples;
	}

	snapshot(): HistogramSnapshot {
		return {
			stat1: [...this.s1],
			stat2: [...this.s2],
			stat3: [...this.s3],
			combined: [...this.cb],
			totalSamples: this.total,
		};
	}
}
