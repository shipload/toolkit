import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveStratum,
	type LocationType,
	type ServerTypes,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";
import type { EntityRef } from "./args";
import { projectedCoords } from "./projection";
import { getEntitySnapshot } from "./snapshot";

export interface GathererStats {
	depth: number;
	yield: number;
	drain: number;
}

export interface GathererLaneStats {
	slotIndex: number;
	depth: number;
	yield: number;
	drain: number;
	outputPct: number;
}

export interface Reach {
	coords: { x: bigint; y: bigint };
	gatherer: GathererStats;
	gathererLanes: GathererLaneStats[];
}

export interface StratumLead {
	index: number;
	itemId: number;
	reserve: number;
}

export function isReachable(index: number, depth: number): boolean {
	return index <= depth;
}

export function reachLegend(reachable: number, total: number, depth: number): string {
	return `${reachable} reachable of ${total} · gatherer depth ${depth}`;
}

export function reachDepth(lanes: Pick<ServerTypes.gatherer_lane, "depth">[]): number {
	if (lanes.length === 0) return 0;
	return Math.max(...lanes.map((l) => Number(l.depth.toString())));
}

export async function resolveReach(ref: EntityRef): Promise<Reach> {
	const snap = await getEntitySnapshot(ref.entityId);
	const gLanes = snap.gatherer_lanes ?? [];
	if (gLanes.length === 0) {
		throw new Error(
			`${ref.entityType}:${ref.entityId} has no gatherer module; cannot filter by depth`,
		);
	}
	const maxDepth = reachDepth(gLanes);
	const gathererLanes: GathererLaneStats[] = gLanes.map((l) => ({
		slotIndex: Number(l.slot_index.toString()),
		depth: Number(l.depth.toString()),
		yield: Number(l.yield.toString()),
		drain: Number(l.drain.toString()),
		outputPct: Number(l.output_pct.toString()),
	}));
	return {
		coords: projectedCoords(snap),
		gatherer: {
			depth: maxDepth,
			yield: gathererLanes[0]?.yield ?? 0,
			drain: gathererLanes[0]?.drain ?? 0,
		},
		gathererLanes,
	};
}

export function shallowestPerItem(
	gameSeed: Checksum256Type,
	epochSeed: Checksum256Type,
	coord: { x: number; y: number },
	maxDepth?: number,
): StratumLead[] {
	const loc = deriveLocationStatic(gameSeed, coord);
	const locType = loc.type.toNumber() as LocationType;
	if (locType === 0) return [];
	const size = deriveLocationSize(loc);
	if (size === 0) return [];
	const subtype = loc.subtype.toNumber();
	const limit = maxDepth === undefined ? size : Math.min(size, maxDepth + 1);
	const byItem = new Map<number, StratumLead>();
	for (let i = 0; i < limit; i++) {
		const s = deriveStratum(epochSeed, coord, i, locType, subtype, size);
		if (s.reserve === 0) continue;
		if (!byItem.has(s.itemId)) {
			byItem.set(s.itemId, { index: i, itemId: s.itemId, reserve: s.reserve });
		}
	}
	return [...byItem.values()].sort((a, b) => a.index - b.index);
}
