import type { LeaderboardEntry } from "./types";

function score(e: LeaderboardEntry): [number, number] {
	const { stat1, stat2, stat3 } = e.stats;
	return [Math.max(stat1, stat2, stat3), stat1 + stat2 + stat3];
}

function cmp(a: LeaderboardEntry, b: LeaderboardEntry): number {
	const [am, as] = score(a);
	const [bm, bs] = score(b);
	if (bm !== am) return bm - am;
	return bs - as;
}

export class TopN {
	private readonly entries: LeaderboardEntry[] = [];

	constructor(private readonly n: number) {}

	ingest(entry: LeaderboardEntry): void {
		if (this.entries.length < this.n) {
			this.entries.push(entry);
			this.entries.sort(cmp);
			return;
		}
		const worst = this.entries[this.entries.length - 1];
		if (cmp(entry, worst) < 0) {
			this.entries[this.entries.length - 1] = entry;
			this.entries.sort(cmp);
		}
	}

	mergeEntries(entries: LeaderboardEntry[]): void {
		for (const e of entries) this.ingest(e);
	}

	snapshot(): LeaderboardEntry[] {
		return [...this.entries];
	}
}
