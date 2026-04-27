import {
	deriveLocationSize,
	deriveLocationStatic,
	getLocationTypeName,
	type LocationStratum,
	type LocationType,
} from "@shipload/sdk";
import type { EntityRef } from "./args";
import { getGameSeed, getShipload } from "./client";
import { resolveReach } from "./reach";

export interface LocationStrataView {
	coords: { x: bigint; y: bigint };
	locationType: LocationType;
	locationTypeLabel: string;
	size: number;
	strata: LocationStratum[];
	reach?: { depth: number };
}

export async function loadLocationStrata(
	coords: { x: bigint; y: bigint },
	opts: { entity?: EntityRef } = {},
): Promise<LocationStrataView> {
	const [gameSeed, shipload, reach] = await Promise.all([
		getGameSeed(),
		getShipload(),
		opts.entity
			? resolveReach(opts.entity).then((r) => ({ depth: r.gatherer.depth }))
			: Promise.resolve(undefined),
	]);

	const locStatic = deriveLocationStatic(gameSeed, coords);
	const locationType = Number(locStatic.type) as LocationType;
	const locationTypeLabel = getLocationTypeName(locationType);
	const size = deriveLocationSize(locStatic);

	if (locationType === 0) {
		return { coords, locationType, locationTypeLabel, size: 0, strata: [], reach };
	}

	const strata = await shipload.locations.getStrata(coords);
	return { coords, locationType, locationTypeLabel, size, strata, reach };
}
