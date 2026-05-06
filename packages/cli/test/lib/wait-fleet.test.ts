import {describe, expect, test} from 'bun:test'
import {entityKeyOf, type EntitySnapshot} from '../../src/lib/snapshot'
import type {FleetTick} from '../../src/lib/snapshot-fleet'
import {
	detectCohort,
	isActionCapable,
	isAvailable,
	waitForFleetAvailable,
} from '../../src/lib/wait-fleet'

function snap(over: Partial<EntitySnapshot> = {}): EntitySnapshot {
	return {
		type: 'ship',
		id: 1n,
		owner: 'alice',
		entity_name: 'S1',
		coordinates: {x: 0n, y: 0n},
		cargomass: 0n,
		cargo: [],
		is_idle: true,
		modules: [],
		pending_tasks: [],
		current_task_elapsed: 0n,
		current_task_remaining: 0n,
		...over,
	} as EntitySnapshot
}

describe('isActionCapable', () => {
	test('ship with modules → true', () => {
		expect(isActionCapable(snap({type: 'ship', modules: [{} as never]}))).toBe(true)
	})
	test('ship with no modules → false', () => {
		expect(isActionCapable(snap({type: 'ship', modules: []}))).toBe(false)
	})
	test('warehouse with modules → true', () => {
		expect(isActionCapable(snap({type: 'warehouse', modules: [{} as never]}))).toBe(true)
	})
	test('warehouse with no modules → false', () => {
		expect(isActionCapable(snap({type: 'warehouse', modules: []}))).toBe(false)
	})
	test('container with modules (defensive) → false', () => {
		expect(isActionCapable(snap({type: 'container', modules: [{} as never]}))).toBe(false)
	})
	test('container with no modules → false', () => {
		expect(isActionCapable(snap({type: 'container', modules: []}))).toBe(false)
	})
	test('snapshot without modules field → false', () => {
		const s = snap()
		delete (s as Partial<EntitySnapshot>).modules
		expect(isActionCapable(s)).toBe(false)
	})
})

describe('isAvailable', () => {
	test('idle with no schedule → true', () => {
		expect(isAvailable(snap({is_idle: true, schedule: undefined}))).toBe(true)
	})
	test('idle with empty tasks list → true', () => {
		expect(
			isAvailable(snap({is_idle: true, schedule: {started: new Date(), tasks: []}})),
		).toBe(true)
	})
	test('idle with completed (unresolved) tasks → false', () => {
		expect(
			isAvailable(
				snap({
					is_idle: true,
					schedule: {started: new Date(), tasks: [{} as never]},
				}),
			),
		).toBe(false)
	})
	test('busy → false', () => {
		expect(isAvailable(snap({is_idle: false}))).toBe(false)
	})
})

function snapsMap(items: EntitySnapshot[]): Map<ReturnType<typeof entityKeyOf>, EntitySnapshot> {
	const m = new Map<ReturnType<typeof entityKeyOf>, EntitySnapshot>()
	for (const s of items) m.set(entityKeyOf(s), s)
	return m
}

describe('detectCohort', () => {
	test('returns keys of all action-capable entities', () => {
		const m = snapsMap([
			snap({type: 'ship', id: 1n, modules: [{} as never]}),
			snap({type: 'ship', id: 2n, modules: []}),
			snap({type: 'warehouse', id: 9n, modules: [{} as never]}),
			snap({type: 'container', id: 3n, modules: [{} as never]}),
		])
		const cohort = detectCohort(m)
		expect(Array.from(cohort).sort()).toEqual(['ship:1', 'warehouse:9'])
	})

	test('with type=ship narrows to ships only', () => {
		const m = snapsMap([
			snap({type: 'ship', id: 1n, modules: [{} as never]}),
			snap({type: 'warehouse', id: 9n, modules: [{} as never]}),
		])
		const cohort = detectCohort(m, 'ship')
		expect(Array.from(cohort)).toEqual(['ship:1'])
	})

	test('with type=warehouse narrows to warehouses only', () => {
		const m = snapsMap([
			snap({type: 'ship', id: 1n, modules: [{} as never]}),
			snap({type: 'warehouse', id: 9n, modules: [{} as never]}),
		])
		const cohort = detectCohort(m, 'warehouse')
		expect(Array.from(cohort)).toEqual(['warehouse:9'])
	})

	test('empty input → empty cohort', () => {
		expect(detectCohort(snapsMap([])).size).toBe(0)
	})
})

async function* fromTicks(ticks: FleetTick[]): AsyncGenerator<FleetTick, void, void> {
	for (const t of ticks) yield t
}

function tickOf(items: EntitySnapshot[]): FleetTick {
	return {
		snaps: snapsMap(items),
		ticks: new Map(),
		connection: 'live',
		sinceLastFetch_s: 0,
		fetchInterval_s: 60,
	}
}

describe('waitForFleetAvailable — first-match', () => {
	test('exits with first idle+clean cohort entity', async () => {
		const busy1 = snap({
			type: 'ship',
			id: 1n,
			modules: [{} as never],
			is_idle: false,
			schedule: {started: new Date(), tasks: [{} as never]},
		})
		const busy2 = snap({
			type: 'ship',
			id: 2n,
			modules: [{} as never],
			is_idle: false,
			schedule: {started: new Date(), tasks: [{} as never]},
		})
		const idle1 = snap({type: 'ship', id: 1n, modules: [{} as never], is_idle: true})
		const stream = fromTicks([tickOf([busy1, busy2]), tickOf([idle1, busy2])])
		const resolveCalls: unknown[] = []
		const result = await waitForFleetAvailable({
			stream,
			mode: 'first',
			autoResolve: true,
			resolveFn: async (...args) => {
				resolveCalls.push(args)
			},
			fetchSnapshot: async (t, i) =>
				snap({
					type: t as 'ship',
					id: BigInt(i.toString()),
					modules: [{} as never],
					is_idle: true,
				}),
		})
		expect(result.mode).toBe('first')
		expect(result.matched.length).toBe(1)
		expect(result.matched[0].id).toBe(1n)
		expect(resolveCalls.length).toBe(0)
	})

	test('runs auto-resolve when first idle entity has completed tasks', async () => {
		const idleWithCompleted = snap({
			type: 'ship',
			id: 1n,
			modules: [{} as never],
			is_idle: true,
			schedule: {started: new Date(), tasks: [{} as never]},
		})
		const stream = fromTicks([tickOf([idleWithCompleted])])
		const resolveCalls: Array<
			[string, bigint | number, number, boolean, {quiet?: boolean}?]
		> = []
		const result = await waitForFleetAvailable({
			stream,
			mode: 'first',
			autoResolve: true,
			quiet: true,
			resolveFn: async (...args) => {
				resolveCalls.push(args as never)
			},
			fetchSnapshot: async (t, i) =>
				snap({
					type: t as 'ship',
					id: BigInt(i.toString()),
					modules: [{} as never],
					is_idle: true,
				}),
		})
		expect(resolveCalls.length).toBe(1)
		expect(resolveCalls[0][0]).toBe('ship')
		expect(resolveCalls[0][1]).toBe(1n)
		expect(resolveCalls[0][3]).toBe(true)
		expect(resolveCalls[0][4]?.quiet).toBe(true)
		expect(result.matched.length).toBe(1)
	})

	test('with no-auto-resolve, idle-with-completed does NOT match', async () => {
		const idleWithCompleted = snap({
			type: 'ship',
			id: 1n,
			modules: [{} as never],
			is_idle: true,
			schedule: {started: new Date(), tasks: [{} as never]},
		})
		const idleClean = snap({type: 'ship', id: 1n, modules: [{} as never], is_idle: true})
		const stream = fromTicks([tickOf([idleWithCompleted]), tickOf([idleClean])])
		const resolveCalls: unknown[] = []
		const result = await waitForFleetAvailable({
			stream,
			mode: 'first',
			autoResolve: false,
			resolveFn: async (...args) => {
				resolveCalls.push(args)
			},
			fetchSnapshot: async () => idleClean,
		})
		expect(resolveCalls.length).toBe(0)
		expect(result.matched[0].id).toBe(1n)
	})
})

describe('waitForFleetAvailable — all', () => {
	test('exits only when every cohort entity is idle+clean', async () => {
		const busy = (id: bigint) =>
			snap({
				type: 'ship',
				id,
				modules: [{} as never],
				is_idle: false,
				schedule: {started: new Date(), tasks: [{} as never]},
			})
		const idle = (id: bigint) =>
			snap({type: 'ship', id, modules: [{} as never], is_idle: true})
		const stream = fromTicks([
			tickOf([busy(1n), busy(2n)]),
			tickOf([idle(1n), busy(2n)]),
			tickOf([idle(1n), idle(2n)]),
		])
		const result = await waitForFleetAvailable({
			stream,
			mode: 'all',
			autoResolve: true,
			resolveFn: async () => {},
			fetchSnapshot: async (t, i) =>
				snap({
					type: t as 'ship',
					id: BigInt(i.toString()),
					modules: [{} as never],
					is_idle: true,
				}),
		})
		expect(result.matched.length).toBe(2)
		const ids = result.matched.map((m) => m.id).sort()
		expect(ids).toEqual([1n, 2n])
	})
})

describe('waitForFleetAvailable — errors', () => {
	test('throws when cohort is empty', async () => {
		const onlyContainers = snap({type: 'container', id: 1n, modules: []})
		const stream = fromTicks([tickOf([onlyContainers])])
		await expect(
			waitForFleetAvailable({
				stream,
				mode: 'first',
				autoResolve: true,
				resolveFn: async () => {},
				fetchSnapshot: async () => onlyContainers,
				owner: 'alice',
			}),
		).rejects.toThrow(/no action-capable entities found for alice/)
	})
})
