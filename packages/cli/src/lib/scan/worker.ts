import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveResourceStats,
	deriveStratum,
	getItem,
	LocationType,
} from "@shipload/sdk";
import { Checksum256 } from "@wharfkit/antelope";
import { Histogram } from "./histogram";
import { MultiHigh } from "./multi-high";
import { TopN } from "./top-n";
import type { LeaderboardEntry, WorkerInput, WorkerProgress, WorkerResult } from "./types";

declare var self: Worker;

const PROGRESS_INTERVAL = 500;

self.onmessage = (event: MessageEvent<WorkerInput>) => {
	const { gameSeed: gameSeedHex, epochSeed: epochSeedHex, cells, threshold, topN } = event.data;
	const gameSeed = Checksum256.from(gameSeedHex);
	const epochSeed = Checksum256.from(epochSeedHex);

	const histogram = new Histogram();
	const multiHigh = new MultiHigh(threshold);
	const leaderboard = new TopN(topN);
	const locationCounts = { planets: 0, asteroids: 0, nebulas: 0, iceFields: 0 };
	let strataCount = 0;
	let cellsDone = 0;
	let locationsSoFar = 0;
	let lastProgressAt = 0;

	for (const coord of cells) {
		cellsDone++;

		const loc = deriveLocationStatic(gameSeed, coord);
		const locType = loc.type.toNumber() as LocationType;
		if (locType === LocationType.EMPTY) {
			if (cellsDone - lastProgressAt >= PROGRESS_INTERVAL) {
				lastProgressAt = cellsDone;
				self.postMessage({
					type: "progress",
					cellsDone,
					locations: locationsSoFar,
					strata: strataCount,
				} satisfies WorkerProgress);
			}
			continue;
		}

		switch (locType) {
			case LocationType.PLANET:
				locationCounts.planets++;
				break;
			case LocationType.ASTEROID:
				locationCounts.asteroids++;
				break;
			case LocationType.NEBULA:
				locationCounts.nebulas++;
				break;
			case LocationType.ICE_FIELD:
				locationCounts.iceFields++;
				break;
		}
		locationsSoFar++;

		const size = deriveLocationSize(loc);
		if (size === 0) continue;

		const subtype = loc.subtype.toNumber();

		for (let stratum = 0; stratum < size; stratum++) {
			const s = deriveStratum(epochSeed, coord, stratum, locType, subtype, size);
			if (s.reserve === 0) continue;

			const stats = deriveResourceStats(s.seed);
			strataCount++;

			histogram.ingest(stats);
			multiHigh.ingest(stats);

			const itemName = (() => {
				try {
					return getItem(s.itemId).name;
				} catch {
					return `#${s.itemId}`;
				}
			})();

			const entry: LeaderboardEntry = {
				coord,
				locType,
				subtype,
				itemId: s.itemId,
				itemName,
				stratum,
				richness: s.richness,
				reserve: s.reserve,
				stats,
			};
			leaderboard.ingest(entry);
		}

		if (cellsDone - lastProgressAt >= PROGRESS_INTERVAL) {
			lastProgressAt = cellsDone;
			self.postMessage({
				type: "progress",
				cellsDone,
				locations: locationsSoFar,
				strata: strataCount,
			} satisfies WorkerProgress);
		}
	}

	self.postMessage({
		type: "result",
		histogram: histogram.snapshot(),
		multiHigh: multiHigh.snapshot(),
		leaderboard: leaderboard.snapshot(),
		locationCounts,
		strataCount,
		cellsScanned: cellsDone,
	} satisfies WorkerResult);
};
