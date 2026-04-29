/**
 * Per-stratum gather metrics for the `gatherable` view.
 *
 * Time and energy mirror the contract via SDK helpers (calc_gather_duration /
 * calc_gather_energy). Max quantity is solved analytically against the linear
 * `q*A + B` shape of the duration formula, then verified by re-feeding the
 * candidate q through the SDK helpers — guarantees we never display a max
 * the contract would reject.
 */

import {
	calc_gather_duration,
	calc_gather_energy,
	getItem,
	type LocationStratum,
	PRECISION,
	ServerTypes,
} from "@shipload/sdk";
import { UInt16 } from "@wharfkit/antelope";

export interface GathererCaps {
	yield: number;
	depth: number;
	speed: number;
	drain: number;
}

export interface GatherBudget {
	energy: number;
	cargoFreeKg: number;
}

export type MaxQuantityBound = "reserve" | "cargo" | "energy" | null;

export interface StratumGatherMetrics {
	timeS: number;
	energyCost: number;
	maxQuantity: number;
	maxQuantityBound: MaxQuantityBound;
	itemMassKg: number;
	gatherable: boolean;
}

function gathererStats(caps: GathererCaps): ServerTypes.gatherer_stats {
	return ServerTypes.gatherer_stats.from({
		yield: UInt16.from(caps.yield),
		drain: UInt16.from(caps.drain),
		depth: UInt16.from(caps.depth),
		speed: UInt16.from(caps.speed),
	});
}

function durationAndEnergy(
	caps: GathererCaps,
	itemMass: number,
	stratum: number,
	richness: number,
	quantity: number,
): { duration: number; energy: number } {
	if (quantity <= 0) return { duration: 0, energy: 0 };
	const stats = gathererStats(caps);
	const duration = Number(calc_gather_duration(stats, itemMass, quantity, stratum, richness));
	const energy = Number(calc_gather_energy(stats, duration));
	return { duration, energy };
}

/**
 * Solve max gatherable quantity for a single gather call, bounded by reserve,
 * cargo space, and current energy. Returns the bound that was binding so
 * agents/users can see why the limit is what it is.
 */
export function solveMaxGatherQuantity(args: {
	caps: GathererCaps;
	budget: GatherBudget;
	itemMassKg: number;
	stratum: number;
	richness: number;
	reserve: number;
}): { maxQuantity: number; bound: MaxQuantityBound } {
	const { caps, budget, itemMassKg, stratum, richness, reserve } = args;

	if (
		caps.yield === 0 ||
		caps.speed === 0 ||
		richness === 0 ||
		reserve === 0
	) {
		return { maxQuantity: 0, bound: reserve === 0 ? "reserve" : null };
	}

	const reserveCap = reserve;
	const cargoCap =
		itemMassKg > 0 ? Math.floor(budget.cargoFreeKg / itemMassKg) : Number.POSITIVE_INFINITY;

	let energyCap = Number.POSITIVE_INFINITY;
	if (caps.drain > 0) {
		const A = (Math.sqrt(itemMassKg) * 100 * (1 + stratum / 5000)) / (caps.yield * (richness / 1000));
		const B = 300 * Math.log(1 + stratum / caps.speed);
		if (A > 0) {
			const candidate = Math.floor((budget.energy * PRECISION / caps.drain - B) / A);
			energyCap = Number.isFinite(candidate) ? Math.max(0, candidate) : 0;
		}
	}

	let q = Math.min(reserveCap, cargoCap, energyCap);
	if (!Number.isFinite(q) || q < 0) q = 0;
	q = Math.floor(q);

	while (q > 0) {
		const { energy, duration } = durationAndEnergy(caps, itemMassKg, stratum, richness, q);
		if (duration === 0) {
			q = 0;
			break;
		}
		const massNeeded = itemMassKg * q;
		if (energy <= budget.energy && massNeeded <= budget.cargoFreeKg && q <= reserveCap) break;
		q -= 1;
	}

	const bound = whichBound(q, reserveCap, cargoCap, energyCap);
	return { maxQuantity: q, bound };
}

function whichBound(
	q: number,
	reserveCap: number,
	cargoCap: number,
	energyCap: number,
): MaxQuantityBound {
	if (q <= 0) {
		const candidates: [number, MaxQuantityBound][] = [
			[reserveCap, "reserve"],
			[cargoCap, "cargo"],
			[energyCap, "energy"],
		];
		const finite = candidates.filter(([v]) => Number.isFinite(v));
		if (finite.length === 0) return null;
		finite.sort((a, b) => (a[0] as number) - (b[0] as number));
		return finite[0][1];
	}
	const tightest = Math.min(reserveCap, cargoCap, energyCap);
	if (q !== tightest) return null;
	if (tightest === reserveCap) return "reserve";
	if (tightest === cargoCap) return "cargo";
	if (tightest === energyCap) return "energy";
	return null;
}

export function computeStratumGatherMetrics(args: {
	caps: GathererCaps;
	budget: GatherBudget;
	stratum: LocationStratum;
	quantity: number;
}): StratumGatherMetrics {
	const { caps, budget, stratum, quantity } = args;
	const itemMassKg = getItem(stratum.itemId).mass;
	const richness = stratum.richness;
	const stratumIdx = stratum.index;
	const reserve = stratum.reserve;

	const gatherable =
		caps.yield > 0 && caps.speed > 0 && richness > 0 && reserve > 0 && quantity > 0;

	if (!gatherable) {
		return {
			timeS: 0,
			energyCost: 0,
			maxQuantity: 0,
			maxQuantityBound: reserve === 0 ? "reserve" : null,
			itemMassKg,
			gatherable: false,
		};
	}

	const { duration, energy } = durationAndEnergy(caps, itemMassKg, stratumIdx, richness, quantity);
	const max = solveMaxGatherQuantity({
		caps,
		budget,
		itemMassKg,
		stratum: stratumIdx,
		richness,
		reserve,
	});

	return {
		timeS: duration,
		energyCost: energy,
		maxQuantity: max.maxQuantity,
		maxQuantityBound: max.bound,
		itemMassKg,
		gatherable: true,
	};
}
