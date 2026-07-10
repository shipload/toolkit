import {describe, expect, test} from 'bun:test'
import {schedule, ServerContract, TaskType} from '@shipload/sdk'
import type {EntityKey, EntitySnapshot} from '../../../src/lib/snapshot'
import type {FleetTick} from '../../../src/lib/snapshot-fleet'
import {
    deriveVisible,
    resolveCursor,
    type FleetViewState,
} from '../../../src/tui/views/fleet-derive'

function makeLane(
    startedIso: string,
    tasks: unknown[],
    laneKey = schedule.LANE_MOBILITY
): ServerContract.Types.lane {
    return ServerContract.Types.lane.from({
        lane_key: laneKey,
        schedule: {started: startedIso, tasks},
    })
}

function startedOffset(secondsFromNow: number): string {
    return new Date(Date.now() + secondsFromNow * 1000).toISOString().slice(0, 23)
}

function task(type: TaskType, duration: number): unknown {
    return {type, duration, cancelable: 0, cargo: [], couplings: []}
}

function snapWithLanes(type: string, id: number, lanes: EntitySnapshot['lanes']): EntitySnapshot {
    return {
        type,
        id: BigInt(id),
        owner: 'alice',
        entity_name: `${type}-${id}`,
        coordinates: {x: 0, y: 0},
        cargomass: 0,
        cargo: [],
        is_idle: lanes.length === 0,
        lanes,
    }
}

function snap(type: string, id: number, isIdle: boolean, completed = 0, name = ''): EntitySnapshot {
    let lanes: EntitySnapshot['lanes'] = []
    if (!isIdle) {
        const started = new Date(Date.now() - 5000).toISOString().slice(0, 23)
        lanes = [
            makeLane(started, [{type: 1, duration: 60, cancelable: 0, cargo: [], couplings: []}]),
        ]
    } else if (completed > 0) {
        const started = new Date(Date.now() - (completed * 30 + 10) * 1000)
            .toISOString()
            .slice(0, 23)
        const tasks = new Array(completed).fill({
            type: 1,
            duration: 30,
            cancelable: 0,
            cargo: [],
            couplings: [],
        })
        lanes = [makeLane(started, tasks)]
    }
    return {
        type,
        id: BigInt(id),
        owner: 'alice',
        entity_name: name || `${type}-${id}`,
        coordinates: {x: 0, y: 0},
        cargomass: 0,
        cargo: [],
        is_idle: isIdle,
        lanes,
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

    test('statusFilter "resolvable" keeps entities with completed tasks even when busy', () => {
        const busyResolvable = snapWithLanes('ship', 3, [
            makeLane(startedOffset(-70), [task(TaskType.TRAVEL, 30)]),
            makeLane(startedOffset(-5), [task(TaskType.GATHER, 60)], 3),
        ])
        const tick = makeTick([snap('ship', 1, true, 0), snap('ship', 2, true, 3), busyResolvable])
        const rows = deriveVisible(tick, {...baseState, statusFilter: 'resolvable'})
        expect(rows.map((r) => r.key)).toEqual(['ship:2', 'ship:3'])
        expect(rows.find((r) => r.key === 'ship:3')).toMatchObject({
            completed: 1,
            isIdle: false,
        })
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

    test('sortMode "eta" uses lane-derived ETA when tick ETA is zero', () => {
        const tick = makeTick([
            snapWithLanes('ship', 1, [makeLane(startedOffset(-10), [task(TaskType.TRAVEL, 180)])]),
            snapWithLanes('ship', 2, [makeLane(startedOffset(-10), [task(TaskType.TRAVEL, 60)])]),
        ])

        tick.ticks.get('ship:1' as EntityKey)!.remaining_s = 0
        tick.ticks.get('ship:2' as EntityKey)!.remaining_s = 0

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

describe('deriveVisible — lane summaries', () => {
    test('exposes queued-tail counts that exclude completed fronts and the current task', () => {
        const tick = makeTick([
            snapWithLanes('ship', 1, [
                makeLane(startedOffset(-10), [
                    task(TaskType.TRAVEL, 60),
                    task(TaskType.RECHARGE, 30),
                ]),
                makeLane(startedOffset(-90), [task(TaskType.GATHER, 30)], 3),
            ]),
        ])

        const [row] = deriveVisible(tick, baseState)

        expect(row.queueTailCount).toBe(1)
        expect(row.queueTailDuration_s).toBe(30)
        expect(row.laneChips.map((chip) => [chip.label, chip.state, chip.queuedCount])).toEqual([
            ['mob', 'active', 1],
            ['L3 worker', 'ready', 0],
        ])
        expect(row.completed).toBe(1)
    })

    test('preserves done lane chips in semantic lane order', () => {
        const tick = makeTick([
            snapWithLanes('ship', 1, [
                makeLane(startedOffset(-60), []),
                makeLane(startedOffset(-60), [], 3),
                makeLane(startedOffset(-60), [], schedule.LANE_BARRIER),
            ]),
        ])

        const [row] = deriveVisible(tick, baseState)

        expect(row.queueTailCount).toBe(0)
        expect(row.laneChips.map((chip) => [chip.label, chip.state, chip.queuedCount])).toEqual([
            ['mob', 'done', 0],
            ['L3 worker', 'done', 0],
            ['barrier', 'done', 0],
        ])
    })
})

describe('resolveCursor', () => {
    test('returns prev key when still present', () => {
        const rows = [{key: 'ship:1' as EntityKey} as never, {key: 'ship:2' as EntityKey} as never]
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
