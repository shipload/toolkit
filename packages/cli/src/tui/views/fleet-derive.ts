import type {EntityTypeName} from '../../lib/args'
import {completedCount, type EntityKey, type EntitySnapshot} from '../../lib/snapshot'
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

export interface EntityRow {
    key: EntityKey
    snap: EntitySnapshot
    remaining_s: number
    completed: number
    isIdle: boolean
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
            return row.isIdle && row.completed > 0
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
                if (a.isIdle && !b.isIdle) return 1
                if (!a.isIdle && b.isIdle) return -1
                if (a.isIdle && b.isIdle) return byTypeId(a, b)
                return a.remaining_s - b.remaining_s
            }
        case 'name': {
            const collator = new Intl.Collator(undefined, {sensitivity: 'base'})
            return (a, b) => collator.compare(a.snap.entity_name ?? '', b.snap.entity_name ?? '')
        }
    }
}

export function deriveVisible(tick: FleetTick, state: FleetViewState): EntityRow[] {
    const rows: EntityRow[] = []
    for (const [key, snap] of tick.snaps) {
        const remaining_s = tick.ticks.get(key)?.remaining_s ?? 0
        const row: EntityRow = {
            key,
            snap,
            remaining_s,
            completed: completedCount(snap),
            isIdle: snap.is_idle,
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
