import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveStratum,
	type LocationType,
} from "@shipload/sdk";
import type { Checksum256Type } from "@wharfkit/antelope";
import type { EntityRef } from "./args";
import { server } from "./client";

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
	const info = (await server.readonly("getentity", {
		entity_type: ref.entityType,
		entity_id: ref.entityId,
	})) as unknown as {
		coordinates: {
			x: bigint | number | { toString(): string };
			y: bigint | number | { toString(): string };
		};
		gatherer?: {
			depth: number | bigint | { toString(): string };
			yield: number | bigint | { toString(): string };
			drain: number | bigint | { toString(): string };
			speed: number | bigint | { toString(): string };
		};
	};
	if (!info.gatherer) {
		throw new Error(
			`${ref.entityType}:${ref.entityId} has no gatherer module; cannot filter by depth`,
		);
	}
	return {
		coords: {
			x: BigInt(info.coordinates.x.toString()),
			y: BigInt(info.coordinates.y.toString()),
		},
		gatherer: {
			depth: Number(info.gatherer.depth.toString()),
			yield: Number(info.gatherer.yield.toString()),
			drain: Number(info.gatherer.drain.toString()),
			speed: Number(info.gatherer.speed.toString()),
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
