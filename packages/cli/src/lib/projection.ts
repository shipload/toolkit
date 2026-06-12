import {
	projectRemainingAt,
	type Projectable,
	type ProjectedEntity,
	type ServerTypes,
} from "@shipload/sdk";
import { TimePoint } from "@wharfkit/antelope";
import type { EntitySnapshot } from "./snapshot";

export interface ProjectedCoords {
	x: bigint;
	y: bigint;
}

function startedMs(started: unknown): number {
	if (
		started &&
		typeof started === "object" &&
		"toDate" in started &&
		typeof started.toDate === "function"
	) {
		return started.toDate().getTime();
	}
	if (
		started &&
		typeof started === "object" &&
		"toMilliseconds" in started &&
		typeof started.toMilliseconds === "function"
	) {
		return Number(started.toMilliseconds());
	}
	if (typeof started === "string") {
		const iso = /(?:Z|[+-]\d\d:?\d\d)$/.test(started) ? started : `${started}Z`;
		const parsed = Date.parse(iso);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	if (started instanceof Date) return started.getTime();
	if (typeof started === "number") return started;
	return 0;
}

function normalizeSchedule(schedule: unknown): ServerTypes.schedule | undefined {
	if (!schedule || typeof schedule !== "object") return undefined;
	const raw = schedule as { started?: unknown; tasks?: unknown[] };
	return {
		...raw,
		started: TimePoint.fromMilliseconds(startedMs(raw.started)),
		tasks: raw.tasks ?? [],
	} as ServerTypes.schedule;
}

function laneKey(value: unknown): { toNumber(): number; toString(): string } {
	const n = Number((value as { toString?: () => string } | undefined)?.toString?.() ?? value ?? 0);
	return {
		toNumber: () => n,
		toString: () => String(n),
	};
}

function normalizeProjectable(entity: Projectable): Projectable {
	const rawLanes = (entity as { lanes?: unknown[] }).lanes;
	const lanes = rawLanes?.flatMap((lane) => {
		const raw = lane as unknown as { lane_key?: unknown; laneKey?: unknown; schedule?: unknown };
		const laneSchedule = normalizeSchedule(raw.schedule);
		if (!laneSchedule) return [];
		return [
			{
				...raw,
				lane_key: laneKey(raw.lane_key ?? raw.laneKey),
				schedule: laneSchedule,
			} as ServerTypes.lane,
		];
	});
	return {
		...entity,
		...(lanes ? { lanes } : {}),
	};
}

export function projectRemainingSnapshotAt(entity: unknown, now: Date): ProjectedEntity {
	return projectRemainingAt(normalizeProjectable(entity as Projectable), now);
}

export function projectedCoords(snap: EntitySnapshot, now: Date = new Date()): ProjectedCoords {
	const projection = projectRemainingSnapshotAt(snap, now);
	return {
		x: BigInt(projection.location.x.toString()),
		y: BigInt(projection.location.y.toString()),
	};
}

export function projectedCargoMass(snap: EntitySnapshot, now: Date = new Date()): bigint {
	const projection = projectRemainingSnapshotAt(snap, now);
	return BigInt(projection.cargoMass.toString());
}
