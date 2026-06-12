import {describe, expect, test} from 'bun:test'
import {ServerContract, schedule as sched} from '@shipload/sdk'
import {entityKeyOf, entityInfoToSnapshot, type EntitySnapshot} from '../../src/lib/snapshot'
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
		lanes: [],
		...over,
	} as EntitySnapshot
}

function laneWith(tasks: Array<{type: number; duration: number}>): ServerContract.Types.lane {
	const started = new Date(Date.now() - 600_000).toISOString().slice(0, 23)
	return ServerContract.Types.lane.from({
		lane_key: 0,
		schedule: {
			started,
			tasks: tasks.map((t) => ({type: t.type, duration: t.duration, cancelable: 0, cargo: []})),
		},
	})
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
	test('idle with no lanes → true', () => {
		expect(isAvailable(snap({is_idle: true, lanes: []}))).toBe(true)
	})
	test('idle with empty-task lane → true', () => {
		expect(isAvailable(snap({is_idle: true, lanes: [laneWith([])]}))).toBe(true)
	})
	test('idle with completed (unresolved) tasks → false', () => {
		expect(
			isAvailable(snap({is_idle: true, lanes: [laneWith([{type: 1, duration: 60}])]})),
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
		const completedLane = ServerContract.Types.lane.from({
			lane_key: 0,
			schedule: {
				started: new Date(Date.now() - 120_000).toISOString().slice(0, 23),
				tasks: [{type: 0, duration: 60, cancelable: 0, cargo: []}],
			},
		})
		const idleWithCompleted = snap({
			type: 'ship',
			id: 1n,
			modules: [{} as never],
			is_idle: true,
			lanes: [completedLane],
		})
		const stream = fromTicks([tickOf([idleWithCompleted])])
		const resolveCalls: Array<
			[bigint | number, number, boolean, {quiet?: boolean}?]
		> = []
		const result = await waitForFleetAvailable({
			stream,
			mode: 'first',
			autoResolve: true,
			quiet: true,
			resolveFn: async (...args) => {
				resolveCalls.push(args as never)
			},
			fetchSnapshot: async (i) =>
				snap({
					type: 'ship',
					id: BigInt(i.toString()),
					modules: [{} as never],
					is_idle: true,
				}),
		})
		expect(resolveCalls.length).toBe(1)
		expect(resolveCalls[0][0]).toBe(1n)
		expect(resolveCalls[0][2]).toBe(true)
		expect(resolveCalls[0][3]?.quiet).toBe(true)
		expect(result.matched.length).toBe(1)
	})

	test('with no-auto-resolve, idle-with-completed does NOT match', async () => {
		const completedLane2 = ServerContract.Types.lane.from({
			lane_key: 0,
			schedule: {
				started: new Date(Date.now() - 120_000).toISOString().slice(0, 23),
				tasks: [{type: 0, duration: 60, cancelable: 0, cargo: []}],
			},
		})
		const idleWithCompleted = snap({
			type: 'ship',
			id: 1n,
			modules: [{} as never],
			is_idle: true,
			lanes: [completedLane2],
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

test('a worker-lane-busy, mobility-idle entity reads as unavailable', () => {
	const at = new Date('2026-06-11T12:00:00.000Z')
	const ei = ServerContract.Types.entity_info.from({
		type: 'ship', id: 9, owner: 'alice', entity_name: 'Worker',
		coordinates: {x: 0, y: 0, z: 800}, item_id: 0, cargomass: 0, cargo: [],
		modules: [], is_idle: true, current_task_elapsed: 0, current_task_remaining: 0,
		pending_tasks: [],
		lanes: [
			{lane_key: 3, schedule: {
				started: new Date(at.getTime() - 30_000).toISOString().slice(0, 23),
				tasks: [{type: 5, duration: 300, cancelable: 0, cargo: []}]}},
		],
	})
	const snap = entityInfoToSnapshot(ei)
	expect(sched.hasSchedule(snap)).toBe(true)
	expect(isAvailable(snap)).toBe(false)
})
