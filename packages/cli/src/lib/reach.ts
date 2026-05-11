import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveStratum,
	type LocationType,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";
import type { EntityRef } from "./args";
import { projectedCoords } from "./projection";
import { getEntitySnapshot } from "./snapshot";

export interface GathererStats {
	depth: number;
	yield: number;
	drain: number;
	speed: number;
}

export interface Reach {
	coords: { x: bigint; y: bigint };
	gatherer: GathererStats;
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

export async function resolveReach(ref: EntityRef): Promise<Reach> {
	const snap = await getEntitySnapshot(ref.entityId);
	if (!snap.gatherer) {
		throw new Error(
			`${ref.entityType}:${ref.entityId} has no gatherer module; cannot filter by depth`,
		);
	}
	return {
		coords: projectedCoords(snap),
		gatherer: {
			depth: Number(snap.gatherer.depth.toString()),
			yield: Number(snap.gatherer.yield.toString()),
			drain: Number(snap.gatherer.drain.toString()),
			speed: Number(snap.gatherer.speed.toString()),
		},
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
