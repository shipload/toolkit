import {describe, expect, test} from 'bun:test'
import type {EntityKey, EntitySnapshot} from '../../../src/lib/snapshot'
import type {FleetTick} from '../../../src/lib/snapshot-fleet'
import {
    deriveVisible,
    resolveCursor,
    type FleetViewState,
} from '../../../src/tui/views/fleet-derive'

function snap(
    type: string,
    id: number,
    isIdle: boolean,
    completed = 0,
    name = ''
): EntitySnapshot {
    return {
        type,
        id: BigInt(id),
        owner: 'alice',
        entity_name: name || `${type}-${id}`,
        coordinates: {x: 0, y: 0},
        cargomass: 0,
        cargo: [],
        is_idle: isIdle,
        schedule: {tasks: new Array(completed).fill({type: 1, duration: 30n})},
    }
}

function makeTick(snaps: EntitySnapshot[]): FleetTick {
    const map = new Map<EntityKey, EntitySnapshot>()
    const ticks = new Map()
    for (const s of snaps) {
        const key = `${s.type}:${String(s.id)}` as EntityKey
        map.set(key, s)
        ticks.set(key, {
            snap: s,
            elapsed_s: 0,
            remaining_s: 0,
            total_s: 0,
            attempt: 0,
            sinceLastFetch_s: 0,
            fetchInterval_s: 60,
        })
    }
    return {snaps: map, ticks, connection: 'live', sinceLastFetch_s: 0, fetchInterval_s: 60}
}

const baseState: FleetViewState = {
    typeFilter: 'all',
    statusFilter: 'all',
    searchQuery: '',
    sortMode: 'type+id',
    cursorKey: null,
    searchMode: false,
}

describe('deriveVisible — filters', () => {
    test('returns all rows when filters are "all"', () => {
        const tick = makeTick([
            snap('ship', 1, false),
            snap('container', 2, true),
            snap('warehouse', 3, true, 1),
        ])
        const rows = deriveVisible(tick, baseState)
        expect(rows.map((r) => r.key)).toEqual(['container:2', 'ship:1', 'warehouse:3'])
    })

    test('typeFilter narrows to one type', () => {
        const tick = makeTick([snap('ship', 1, false), snap('container', 2, true)])
        const rows = deriveVisible(tick, {...baseState, typeFilter: 'ship'})
        expect(rows.map((r) => r.key)).toEqual(['ship:1'])
    })

    test('statusFilter "busy" keeps only busy entities', () => {
        const tick = makeTick([snap('ship', 1, false), snap('ship', 2, true)])
        const rows = deriveVisible(tick, {...baseState, statusFilter: 'busy'})
        expect(rows.map((r) => r.key)).toEqual(['ship:1'])
    })

    test('statusFilter "resolvable" keeps only idle entities with completed tasks', () => {
        const tick = makeTick([
            snap('ship', 1, true, 0),
            snap('ship', 2, true, 3),
            snap('ship', 3, false),
        ])
        const rows = deriveVisible(tick, {...baseState, statusFilter: 'resolvable'})
        expect(rows.map((r) => r.key)).toEqual(['ship:2'])
    })

    test('statusFilter "idle" keeps only idle entities (resolvable or not)', () => {
        const tick = makeTick([
            snap('ship', 1, true),
            snap('ship', 2, false),
            snap('ship', 3, true, 2),
        ])
        const rows = deriveVisible(tick, {...baseState, statusFilter: 'idle'})
        expect(rows.map((r) => r.key).sort()).toEqual(['ship:1', 'ship:3'])
    })

    test('searchQuery matches name (case-insensitive)', () => {
        const tick = makeTick([
            snap('ship', 1, false, 0, 'Roborovski'),
            snap('ship', 2, false, 0, 'Stardust'),
        ])
        const rows = deriveVisible(tick, {...baseState, searchQuery: 'rob'})
        expect(rows.map((r) => r.key)).toEqual(['ship:1'])
    })

    test('searchQuery matches id', () => {
        const tick = makeTick([snap('ship', 17, false), snap('ship', 42, false)])
        const rows = deriveVisible(tick, {...baseState, searchQuery: '17'})
        expect(rows.map((r) => r.key)).toEqual(['ship:17'])
    })
})

describe('deriveVisible — sort modes', () => {
    test('sortMode "type+id" orders by type then id ascending', () => {
        const tick = makeTick([
            snap('ship', 4, false),
            snap('ship', 1, false),
            snap('container', 2, true),
        ])
        const rows = deriveVisible(tick, {...baseState, sortMode: 'type+id'})
        expect(rows.map((r) => r.key)).toEqual(['container:2', 'ship:1', 'ship:4'])
    })

    test('sortMode "status" orders busy → resolvable → idle, ties by type+id', () => {
        const tick = makeTick([
            snap('ship', 1, true), // idle
            snap('ship', 2, false), // busy
            snap('ship', 3, true, 2), // resolvable
        ])
        const rows = deriveVisible(tick, {...baseState, sortMode: 'status'})
        expect(rows.map((r) => r.key)).toEqual(['ship:2', 'ship:3', 'ship:1'])
    })

    test('sortMode "eta" orders busy entities by remaining_s ascending; idle entities last', () => {
        const tick = makeTick([snap('ship', 1, true), snap('ship', 2, false)])
        tick.ticks.get('ship:2' as EntityKey)!.remaining_s = 30
        const rows = deriveVisible(tick, {...baseState, sortMode: 'eta'})
        expect(rows.map((r) => r.key)).toEqual(['ship:2', 'ship:1'])
    })

    test('sortMode "name" orders by entity_name case-insensitively', () => {
        const tick = makeTick([
            snap('ship', 1, false, 0, 'beta'),
            snap('ship', 2, false, 0, 'Alpha'),
        ])
        const rows = deriveVisible(tick, {...baseState, sortMode: 'name'})
        expect(rows.map((r) => r.key)).toEqual(['ship:2', 'ship:1'])
    })
})

describe('resolveCursor', () => {
    test('returns prev key when still present', () => {
        const rows = [
            {key: 'ship:1' as EntityKey} as never,
            {key: 'ship:2' as EntityKey} as never,
        ]
        expect(resolveCursor(rows, 'ship:2' as EntityKey, rows)).toBe('ship:2')
    })

    test('returns null when rows is empty', () => {
        expect(resolveCursor([], 'ship:1' as EntityKey, [])).toBeNull()
    })

    test('snaps to nearest neighbor by previous index', () => {
        const prevRows = [
            {key: 'ship:1'} as never,
            {key: 'ship:2'} as never,
            {key: 'ship:3'} as never,
        ]
        const rows = [{key: 'ship:1'} as never, {key: 'ship:3'} as never]
        expect(resolveCursor(rows, 'ship:2' as EntityKey, prevRows)).toBe('ship:3')
    })

    test('returns first row when prev cursor is null', () => {
        const rows = [{key: 'ship:1'} as never, {key: 'ship:2'} as never]
        expect(resolveCursor(rows, null, [])).toBe('ship:1')
    })
})
