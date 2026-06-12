import {schedule} from '@shipload/sdk'
import type {EntityTypeName} from '../../lib/args'
import {
    laneFront,
    laneLabel,
    laneSectionStatus,
    sortLaneKeysSemantic,
} from '../../lib/lane-presentation'
import type {EntityKey, EntitySnapshot} from '../../lib/snapshot'
import type {FleetTick} from '../../lib/snapshot-fleet'

export type StatusFilter = 'all' | 'busy' | 'resolvable' | 'idle'
export type SortMode = 'type+id' | 'status' | 'eta' | 'name'

export interface FleetViewState {
    typeFilter: 'all' | EntityTypeName
    statusFilter: StatusFilter
    searchQuery: string
    sortMode: SortMode
    cursorKey: EntityKey | null
    searchMode: boolean
}

export interface LaneChip {
    laneKey: number
    label: string
    state: 'active' | 'waiting' | 'ready' | 'done'
    taskType: number | null
    remaining_s: number
    startsIn_s: number
    readyCount: number
    queuedCount: number
    queuedDuration_s: number
}

export interface EntityRow {
    key: EntityKey
    snap: EntitySnapshot
    remaining_s: number
    totalRemaining_s: number
    eta_s: number
    completed: number
    isIdle: boolean
    currentTaskType: number | null
    pendingCount: number
    laneChips: LaneChip[]
    queueTailCount: number
    queueTailDuration_s: number
}

function passesType(snap: EntitySnapshot, f: FleetViewState['typeFilter']): boolean {
    return f === 'all' || snap.type === f
}

function passesStatus(row: EntityRow, f: StatusFilter): boolean {
    switch (f) {
        case 'all':
            return true
        case 'busy':
            return !row.isIdle
        case 'resolvable':
            return row.completed > 0
        case 'idle':
            return row.isIdle
    }
}

function passesSearch(snap: EntitySnapshot, q: string): boolean {
    if (q === '') return true
    const lower = q.toLowerCase()
    if (snap.entity_name?.toLowerCase().includes(lower)) return true
    return String(snap.id).includes(lower)
}

function statusRank(row: EntityRow): number {
    if (!row.isIdle) return 0
    if (row.completed > 0) return 1
    return 2
}

function makeComparator(mode: SortMode): (a: EntityRow, b: EntityRow) => number {
    const byTypeId = (a: EntityRow, b: EntityRow): number => {
        if (a.snap.type !== b.snap.type) return a.snap.type < b.snap.type ? -1 : 1
        const aid = a.snap.id as bigint
        const bid = b.snap.id as bigint
        if (aid === bid) return 0
        return aid < bid ? -1 : 1
    }
    switch (mode) {
        case 'type+id':
            return byTypeId
        case 'status':
            return (a, b) => statusRank(a) - statusRank(b) || byTypeId(a, b)
        case 'eta':
            return (a, b) => {
                if (a.eta_s !== b.eta_s) return a.eta_s - b.eta_s
                return byTypeId(a, b)
            }
        case 'name': {
            const collator = new Intl.Collator(undefined, {sensitivity: 'base'})
            return (a, b) => collator.compare(a.snap.entity_name ?? '', b.snap.entity_name ?? '')
        }
    }
}

function asNumber(value: unknown): number {
    if (value === undefined || value === null) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'bigint') return Number(value)
    if (typeof value === 'string') return Number(value)
    if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
        return value.toNumber()
    }
    return Number(value)
}

function taskDuration_s(task: unknown): number {
    const raw = task as {duration?: unknown; duration_s?: unknown}
    return Math.max(0, asNumber(raw.duration_s ?? raw.duration))
}

function taskType(task: unknown): number | null {
    const raw = task as {type?: unknown}
    return raw.type === undefined ? null : asNumber(raw.type)
}

function deriveLaneChips(
    snap: EntitySnapshot,
    now: Date,
    readyByLane: Map<number, number>
): LaneChip[] {
    const lanes = schedule.getLanes(snap)
    const lanesByKey = new Map(lanes.map((lane) => [lane.laneKey, lane]))
    return sortLaneKeysSemantic(lanes.map((lane) => lane.laneKey))
        .map((laneKey): LaneChip | null => {
            const lane = lanesByKey.get(laneKey)
            if (!lane) return null
            const tasks = lane.schedule.tasks
            const front = laneFront(lane.schedule, now)
            const readyCount = readyByLane.get(laneKey) ?? 0
            const tailStart =
                front.status === 'active'
                    ? front.activeIndex + 1
                    : front.status === 'waiting'
                      ? 1
                      : tasks.length
            const queuedTasks = tasks.slice(Math.max(0, tailStart))
            const queuedDuration_s = queuedTasks.reduce(
                (sum, task) => sum + taskDuration_s(task),
                0
            )
            const sectionStatus = laneSectionStatus(lane, now)
            const label = laneLabel(snap, laneKey, {compact: true})

            if (readyCount > 0 && sectionStatus === 'ready to resolve') {
                return {
                    laneKey,
                    label,
                    state: 'ready',
                    taskType: null,
                    remaining_s: 0,
                    startsIn_s: 0,
                    readyCount,
                    queuedCount: queuedTasks.length,
                    queuedDuration_s,
                }
            }
            if (front.status === 'active') {
                return {
                    laneKey,
                    label,
                    state: 'active',
                    taskType: taskType(tasks[front.activeIndex]),
                    remaining_s: front.remaining_s,
                    startsIn_s: 0,
                    readyCount,
                    queuedCount: queuedTasks.length,
                    queuedDuration_s,
                }
            }
            if (front.status === 'waiting') {
                return {
                    laneKey,
                    label,
                    state: 'waiting',
                    taskType: taskType(tasks[0]),
                    remaining_s: front.remaining_s,
                    startsIn_s: front.startsIn_s,
                    readyCount,
                    queuedCount: queuedTasks.length,
                    queuedDuration_s,
                }
            }
            return {
                laneKey,
                label,
                state: 'done',
                taskType: null,
                remaining_s: 0,
                startsIn_s: 0,
                readyCount,
                queuedCount: queuedTasks.length,
                queuedDuration_s,
            }
        })
        .filter((chip): chip is LaneChip => chip !== null)
}

function deriveEta_s(chips: LaneChip[], fallbackRemaining_s: number, isIdle: boolean): number {
    if (chips.some((chip) => chip.state === 'ready')) return 0

    const activeEtas = chips
        .filter((chip) => chip.state === 'active')
        .map((chip) => Math.max(0, chip.remaining_s))
    if (activeEtas.length > 0) return Math.min(...activeEtas)

    const waitingEtas = chips
        .filter((chip) => chip.state === 'waiting')
        .map((chip) => Math.max(0, chip.startsIn_s))
    if (waitingEtas.length > 0) return Math.min(...waitingEtas)

    if (!isIdle && chips.length === 0) return Math.max(0, fallbackRemaining_s)
    return Number.POSITIVE_INFINITY
}

export function deriveVisible(tick: FleetTick, state: FleetViewState): EntityRow[] {
    const now = new Date()
    const rows: EntityRow[] = []
    for (const [key, snap] of tick.snaps) {
        const remaining_s = tick.ticks.get(key)?.remaining_s ?? 0
        const activeTask = schedule.activeTasks(snap, now)[0]
        const totalRemaining_s = schedule.scheduleRemaining(snap, now)
        const resolveOrder = schedule.resolveOrder(snap, now)
        const readyByLane = new Map<number, number>()
        for (const event of resolveOrder) {
            readyByLane.set(event.laneKey, (readyByLane.get(event.laneKey) ?? 0) + 1)
        }
        const laneChips = deriveLaneChips(snap, now, readyByLane)
        const queueTailCount = laneChips.reduce((sum, chip) => sum + chip.queuedCount, 0)
        const queueTailDuration_s = laneChips.reduce((sum, chip) => sum + chip.queuedDuration_s, 0)
        const isIdle = totalRemaining_s === 0
        const row: EntityRow = {
            key,
            snap,
            remaining_s,
            totalRemaining_s,
            eta_s: deriveEta_s(laneChips, remaining_s, isIdle),
            completed: resolveOrder.length,
            isIdle,
            currentTaskType: activeTask ? Number(activeTask.type) : null,
            pendingCount: queueTailCount,
            laneChips,
            queueTailCount,
            queueTailDuration_s,
        }
        if (!passesType(snap, state.typeFilter)) continue
        if (!passesStatus(row, state.statusFilter)) continue
        if (!passesSearch(snap, state.searchQuery)) continue
        rows.push(row)
    }
    rows.sort(makeComparator(state.sortMode))
    return rows
}

export function resolveCursor(
    rows: Pick<EntityRow, 'key'>[],
    prevKey: EntityKey | null,
    prevRows: Pick<EntityRow, 'key'>[]
): EntityKey | null {
    if (rows.length === 0) return null
    if (prevKey === null) return rows[0].key
    const stillPresent = rows.find((r) => r.key === prevKey)
    if (stillPresent) return prevKey
    const prevIndex = prevRows.findIndex((r) => r.key === prevKey)
    if (prevIndex < 0) return rows[0].key
    const clamped = Math.min(prevIndex, rows.length - 1)
    return rows[clamped].key
}
