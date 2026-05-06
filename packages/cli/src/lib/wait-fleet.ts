import type {EntityTypeName} from './args'
import {
	completedTaskCount,
	type EntityKey,
	type EntitySnapshot,
	getEntitySnapshot,
} from './snapshot'
import type {FleetTick} from './snapshot-fleet'

export function isActionCapable(snap: EntitySnapshot): boolean {
	if (snap.type === 'container') return false
	return (snap.modules?.length ?? 0) > 0
}

export function isAvailable(snap: EntitySnapshot): boolean {
	if (!snap.is_idle) return false
	return (snap.schedule?.tasks.length ?? 0) === 0
}

export function detectCohort(
	snaps: Map<EntityKey, EntitySnapshot>,
	typeFilter?: EntityTypeName,
): Set<EntityKey> {
	const out = new Set<EntityKey>()
	for (const [key, s] of snaps) {
		if (typeFilter && s.type !== typeFilter) continue
		if (!isActionCapable(s)) continue
		out.add(key)
	}
	return out
}

export type WaitFleetMode = 'first' | 'all'

export type WaitFleetResolveFn = (
	entityType: string,
	entityId: bigint | number,
	completedCount: number,
	autoResolve: boolean,
	opts?: { quiet?: boolean },
) => Promise<void>

export type WaitFleetFetchSnapshotFn = (
	entityType: string,
	entityId: bigint | number,
) => Promise<EntitySnapshot>

export interface WaitFleetOpts {
	stream: AsyncGenerator<FleetTick, void, void>
	mode: WaitFleetMode
	autoResolve: boolean
	resolveFn?: WaitFleetResolveFn
	fetchSnapshot?: WaitFleetFetchSnapshotFn
	typeFilter?: EntityTypeName
	timeoutMs?: number
	quiet?: boolean
	owner?: string
}

export interface WaitFleetResult {
	mode: WaitFleetMode
	matched: EntitySnapshot[]
	cohortSize: number
}

export class NoEligibleEntitiesError extends Error {
	constructor(owner: string | undefined) {
		const target = owner ?? 'self'
		super(
			`no action-capable entities found for ${target} (need at least one ship or warehouse with installed modules)`,
		)
	}
}

export class WaitFleetTimeoutError extends Error {
	constructor(owner: string | undefined, mode: WaitFleetMode) {
		const target = owner ?? 'self'
		super(`Timed out waiting for ${target} fleet (mode=${mode})`)
	}
}

function rankType(t: string): number {
	if (t === 'ship') return 0
	if (t === 'warehouse') return 1
	return 2
}

function deterministicSort(items: EntitySnapshot[]): EntitySnapshot[] {
	return [...items].sort((a, b) => {
		const r = rankType(String(a.type)) - rankType(String(b.type))
		if (r !== 0) return r
		const diff = BigInt(a.id.toString()) - BigInt(b.id.toString())
		return diff < 0n ? -1 : diff > 0n ? 1 : 0
	})
}

export async function waitForFleetAvailable(opts: WaitFleetOpts): Promise<WaitFleetResult> {
	const fetchSnapshot = opts.fetchSnapshot ?? getEntitySnapshot
	const deadline = opts.timeoutMs != null ? Date.now() + opts.timeoutMs : null

	let cohort: Set<EntityKey> | null = null
	const matched = new Map<EntityKey, EntitySnapshot>()

	for await (const tick of opts.stream) {
		if (deadline != null && Date.now() >= deadline) {
			throw new WaitFleetTimeoutError(opts.owner, opts.mode)
		}
		if (cohort === null) {
			if (tick.snaps.size === 0) continue
			cohort = detectCohort(tick.snaps, opts.typeFilter)
			if (cohort.size === 0) throw new NoEligibleEntitiesError(opts.owner)
		}

		for (const key of cohort) {
			if (matched.has(key)) continue
			const s = tick.snaps.get(key)
			if (!s) continue
			if (!s.is_idle) continue

			const completed = completedTaskCount(s)
			if (completed > 0) {
				if (!opts.autoResolve) continue
				if (!opts.resolveFn)
					throw new Error('resolveFn required when autoResolve is true')
				await opts.resolveFn(String(s.type), s.id, completed, true, {
					quiet: opts.quiet,
				})
				const refreshed = await fetchSnapshot(String(s.type), s.id)
				if (!isAvailable(refreshed)) continue
				matched.set(key, refreshed)
			} else {
				matched.set(key, s)
			}

			if (opts.mode === 'first') {
				return {
					mode: 'first',
					matched: deterministicSort([matched.get(key) as EntitySnapshot]),
					cohortSize: cohort.size,
				}
			}
		}

		if (opts.mode === 'all' && matched.size === cohort.size) {
			return {
				mode: 'all',
				matched: deterministicSort(Array.from(matched.values())),
				cohortSize: cohort.size,
			}
		}
	}

	throw new WaitFleetTimeoutError(opts.owner, opts.mode)
}
