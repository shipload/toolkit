import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveResourceStats,
	deriveStratum,
	getLocationType,
	getLocationTypeName,
	getPlanetSubtype,
	isGatherableLocation,
	LocationType,
	type ResourceStats,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";

export interface ResourceLead {
	index: number;
	itemId: number;
	reserve: number;
	richness: number;
	stats: ResourceStats;
	reachable: boolean;
}

export interface LocationSummary {
	coords: { x: number; y: number };
	type: LocationType;
	typeLabel: string;
	subtypeLabel?: string;
	size: number;
	totalNonEmpty: number;
	reachableNonEmpty: number;
	resources: ResourceLead[];
	distance?: number;
	energyCost?: number;
	flightTimeS?: number;
}

export interface LocationSummaryOpts {
	gameSeed: Checksum256Type;
	epochSeed?: Checksum256Type;
	reach?: { depth: number };
	includeOOD?: boolean;
}

export interface TravelMetrics {
	distance?: number;
	energyCost?: number;
	flightTimeS?: number;
}

export function buildLocationSummary(
	coord: { x: number; y: number },
	opts: LocationSummaryOpts,
	travel: TravelMetrics = {},
): LocationSummary {
	const type = getLocationType(opts.gameSeed, coord);
	const typeLabel = getLocationTypeName(type);

	if (!isGatherableLocation(type)) {
		return {
			coords: coord,
			type,
			typeLabel,
			size: 0,
			totalNonEmpty: 0,
			reachableNonEmpty: 0,
			resources: [],
			...travel,
		};
	}

	const loc = deriveLocationStatic(opts.gameSeed, coord);
	const subtype = loc.subtype.toNumber();
	const size = deriveLocationSize(loc);
	const subtypeLabel =
		type === LocationType.PLANET ? getPlanetSubtype(subtype)?.label : undefined;

	if (!opts.epochSeed || size === 0) {
		return {
			coords: coord,
			type,
			typeLabel,
			subtypeLabel,
			size,
			totalNonEmpty: 0,
			reachableNonEmpty: 0,
			resources: [],
			...travel,
		};
	}

	const reachDepth = opts.reach?.depth;
	const allLeads: ResourceLead[] = [];
	const seenItems = new Set<number>();
	let totalNonEmpty = 0;
	let reachableNonEmpty = 0;

	for (let i = 0; i < size; i++) {
		const s = deriveStratum(opts.epochSeed, coord, i, type, subtype, size);
		if (s.reserve === 0) continue;
		totalNonEmpty++;
		const reachable = reachDepth === undefined || i <= reachDepth;
		if (reachable) reachableNonEmpty++;
		if (seenItems.has(s.itemId)) continue;
		seenItems.add(s.itemId);
		allLeads.push({
			index: i,
			itemId: s.itemId,
			reserve: s.reserve,
			richness: s.richness,
			stats: s.seed ? deriveResourceStats(s.seed) : { stat1: 0, stat2: 0, stat3: 0 },
			reachable,
		});
	}

	const filtered =
		reachDepth === undefined || opts.includeOOD
			? allLeads
			: allLeads.filter((l) => l.reachable);

	filtered.sort((a, b) => a.index - b.index);

	return {
		coords: coord,
		type,
		typeLabel,
		subtypeLabel,
		size,
		totalNonEmpty,
		reachableNonEmpty,
		resources: filtered,
		...travel,
	};
}

export function locationSummaryToJson(s: LocationSummary): unknown {
	return {
		coords: s.coords,
		type: s.type,
		type_label: s.typeLabel,
		subtype_label: s.subtypeLabel,
		size: s.size,
		total_non_empty: s.totalNonEmpty,
		reachable_non_empty: s.reachableNonEmpty,
		distance: s.distance,
		energy_cost: s.energyCost,
		flight_time_s: s.flightTimeS,
		resources: s.resources.map((r) => ({
			index: r.index,
			item_id: r.itemId,
			reserve: r.reserve,
			richness: r.richness,
			stats: r.stats,
			reachable: r.reachable,
		})),
	};
}
