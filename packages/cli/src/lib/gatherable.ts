import {
	allocateProportional,
	calc_gather_duration,
	type GatherLane,
	getItem,
	type LocationStratum,
	maxQtyForCharge,
	splitCost,
} from "@shipload/sdk";

export interface GathererCaps {
	yield: number;
	depth: number;
	drain: number;
}

export interface GatherBudget {
	energy: number;
	cargoFree: number;
}

export type MaxQuantityBound = "reserve" | "cargo" | "energy" | null;

export interface StratumGatherMetrics {
	timeS: number;
	energyCost: number;
	maxQuantity: number;
	maxQuantityBound: MaxQuantityBound;
	itemMass: number;
	gatherable: boolean;
}

function reachingLanes(lanes: GatherLane[], stratum: number): GatherLane[] {
	return lanes.filter((l) => l.depth.toNumber() >= stratum);
}

function splitDuration(
	reaching: GatherLane[],
	itemMass: number,
	stratum: number,
	richness: number,
	quantity: number,
): number {
	if (quantity <= 0) return 0;
	const weights = reaching.map((l) => ({ slot: l.slot_index.toNumber(), weight: l.yield.toNumber() }));
	let longest = 0;
	for (const entry of allocateProportional(weights, quantity)) {
		if (entry.quantity <= 0) continue;
		const lane = reaching.find((l) => l.slot_index.toNumber() === entry.slot);
		if (!lane) continue;
		const dur = Number(
			calc_gather_duration(
				lane as unknown as Parameters<typeof calc_gather_duration>[0],
				itemMass,
				entry.quantity,
				stratum,
				richness,
			),
		);
		if (dur > longest) longest = dur;
	}
	return longest;
}

export function solveMaxGatherQuantity(args: {
	lanes: GatherLane[];
	budget: GatherBudget;
	itemMass: number;
	stratum: number;
	richness: number;
	reserve: number;
}): { maxQuantity: number; bound: MaxQuantityBound } {
	const { budget, itemMass, stratum, richness, reserve } = args;
	const reaching = reachingLanes(args.lanes, stratum);
	const totalYield = reaching.reduce((sum, l) => sum + l.yield.toNumber(), 0);

	if (totalYield === 0 || richness === 0 || reserve === 0) {
		return { maxQuantity: 0, bound: reserve === 0 ? "reserve" : null };
	}

	const cargoCap =
		itemMass > 0 ? Math.floor(budget.cargoFree / itemMass) : Number.POSITIVE_INFINITY;
	const ceiling = Math.min(reserve, cargoCap);
	const maxQuantity = maxQtyForCharge(reaching, ceiling, budget.energy, stratum, itemMass, richness);

	if (maxQuantity < ceiling) return { maxQuantity, bound: "energy" };
	return { maxQuantity, bound: reserve <= cargoCap ? "reserve" : "cargo" };
}

export function computeStratumGatherMetrics(args: {
	lanes: GatherLane[];
	budget: GatherBudget;
	stratum: LocationStratum;
	quantity: number;
}): StratumGatherMetrics {
	const { lanes, budget, stratum, quantity } = args;
	const itemMass = getItem(stratum.itemId).mass;
	const richness = stratum.richness;
	const stratumIdx = stratum.index;
	const reserve = stratum.reserve;
	const reaching = reachingLanes(lanes, stratumIdx);
	const totalYield = reaching.reduce((sum, l) => sum + l.yield.toNumber(), 0);

	const gatherable = totalYield > 0 && richness > 0 && reserve > 0 && quantity > 0;

	if (!gatherable) {
		return {
			timeS: 0,
			energyCost: 0,
			maxQuantity: 0,
			maxQuantityBound: reserve === 0 ? "reserve" : null,
			itemMass,
			gatherable: false,
		};
	}

	const max = solveMaxGatherQuantity({ lanes, budget, itemMass, stratum: stratumIdx, richness, reserve });

	return {
		timeS: splitDuration(reaching, itemMass, stratumIdx, richness, quantity),
		energyCost: splitCost(reaching, quantity, stratumIdx, itemMass, richness),
		maxQuantity: max.maxQuantity,
		maxQuantityBound: max.bound,
		itemMass,
		gatherable: true,
	};
}
