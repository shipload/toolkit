import {scanCells} from "@shipload/sdk/scan";
import {Histogram} from "./histogram";
import {ingestDerivedCells, resolveItemName, type ScanAccumulators} from "./ingest";
import {MultiHigh} from "./multi-high";
import {TopN} from "./top-n";
import type {WorkerInput, WorkerProgress, WorkerResult} from "./types";

declare var self: Worker;

const PROGRESS_INTERVAL = 500;

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
	const {gameSeed, epochSeed, cells, threshold, topN} = event.data;

	const acc: ScanAccumulators = {
		histogram: new Histogram(),
		multiHigh: new MultiHigh(threshold),
		leaderboard: new TopN(topN),
		locationCounts: {planets: 0, asteroids: 0, nebulas: 0, iceFields: 0},
	};
	let strataCount = 0;
	let locationsSoFar = 0;
	let cellsDone = 0;

	for (let i = 0; i < cells.length; i += PROGRESS_INTERVAL) {
		const batch = cells.slice(i, i + PROGRESS_INTERVAL);
		const derived = await scanCells(gameSeed, epochSeed, batch);
		const {locations, strata} = ingestDerivedCells(derived, acc, resolveItemName);
		locationsSoFar += locations;
		strataCount += strata;
		cellsDone += batch.length;
		self.postMessage({
			type: "progress",
			cellsDone,
			locations: locationsSoFar,
			strata: strataCount,
		} satisfies WorkerProgress);
	}

	self.postMessage({
		type: "result",
		histogram: acc.histogram.snapshot(),
		multiHigh: acc.multiHigh.snapshot(),
		leaderboard: acc.leaderboard.snapshot(),
		locationCounts: acc.locationCounts,
		strataCount,
		cellsScanned: cellsDone,
	} satisfies WorkerResult);
};
