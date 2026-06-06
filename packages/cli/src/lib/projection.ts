import { projectFromCurrentState, type ProjectableSnapshot } from "@shipload/sdk";
import type { EntitySnapshot } from "./snapshot";

export interface ProjectedCoords {
	x: bigint;
	y: bigint;
}

export function projectedCoords(snap: EntitySnapshot): ProjectedCoords {
	const projection = projectFromCurrentState(snap as unknown as ProjectableSnapshot);
	return {
		x: BigInt(projection.location.x.toString()),
		y: BigInt(projection.location.y.toString()),
	};
}

export function projectedCargoMass(snap: EntitySnapshot): bigint {
	const projection = projectFromCurrentState(snap as unknown as ProjectableSnapshot);
	return BigInt(projection.cargoMass.toString());
}
