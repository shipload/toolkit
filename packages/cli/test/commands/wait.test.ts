import {describe, expect, test} from 'bun:test'
import type {EntitySnapshot} from '../../src/lib/snapshot'
import {renderWaitJson, renderWaitText} from '../../src/commands/wait'

function snap(over: Partial<EntitySnapshot> = {}): EntitySnapshot {
	return {
		type: 'ship',
		id: 1n,
		owner: 'alice',
		entity_name: 'Voyager',
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

describe('renderWaitText — first-match', () => {
	test('includes ready header with type, id, name', () => {
		const out = renderWaitText('alice', {
			mode: 'first',
			matched: [snap({type: 'ship', id: 42n, entity_name: 'Voyager'})],
			cohortSize: 5,
		})
		expect(out).toContain('Ready: ship 42 — Voyager')
		expect(out).toContain('Voyager')
	})
})

describe('renderWaitText — all', () => {
	test('includes count and owner header', () => {
		const out = renderWaitText('alice', {
			mode: 'all',
			matched: [
				snap({type: 'ship', id: 1n, entity_name: 'A'}),
				snap({type: 'warehouse', id: 9n, entity_name: 'B'}),
			],
			cohortSize: 2,
		})
		expect(out).toContain('All 2 entities ready (alice)')
		expect(out).toContain('ship')
		expect(out).toContain('warehouse')
	})
})

describe('renderWaitJson', () => {
	test('first-match emits matched as object', () => {
		const out = renderWaitJson('alice', {
			mode: 'first',
			matched: [snap({type: 'ship', id: 42n})],
			cohortSize: 5,
		}) as Record<string, unknown>
		expect(out.mode).toBe('first')
		expect(out.owner).toBe('alice')
		expect(out.cohort_size).toBe(5)
		expect((out.matched as EntitySnapshot).id).toBe(42n)
	})

	test('--all emits matched as array', () => {
		const out = renderWaitJson('alice', {
			mode: 'all',
			matched: [snap({id: 1n}), snap({id: 2n})],
			cohortSize: 2,
		}) as Record<string, unknown>
		expect(out.mode).toBe('all')
		expect(Array.isArray(out.matched)).toBe(true)
		expect((out.matched as EntitySnapshot[]).length).toBe(2)
	})
})
