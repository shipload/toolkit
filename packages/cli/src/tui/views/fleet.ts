import {Box, type CliRenderer, type KeyEvent, Text, type VChild} from '@opentui/core'
import type {EntityTypeName} from '../../lib/args'
import {formatDuration} from '../../lib/format'
import type {EntityKey} from '../../lib/snapshot'
import type {FleetTick} from '../../lib/snapshot-fleet'
import {type Hotkey, HotkeyRegistry} from '../hotkeys'
import {renderFooter} from '../primitives/footer'
import {renderPanel} from '../primitives/panel'
import {
    createResolveModal,
    type ResolveModalHandle,
    type ResolveSuccess,
} from '../primitives/resolve-modal'
import type {View} from '../view'
import {
    deriveVisible,
    type EntityRow,
    type FleetViewState,
    resolveCursor,
    type SortMode,
    type StatusFilter,
} from './fleet-derive'

export interface FleetViewDefaults {
    sort: SortMode
    typeFilter: 'all' | EntityTypeName
    statusFilter: StatusFilter
}

export interface FleetTrackEmbed {
    onBack: () => void
    onStepNext: () => void
    onStepPrev: () => void
    label?: string
}

export interface FleetViewOpts {
    owner: string
    initialTick: FleetTick
    stream: AsyncGenerator<FleetTick, void, void>
    defaults: FleetViewDefaults
    perEntityResolve: (row: EntityRow) => Promise<ResolveSuccess>
    bulkResolve: (rows: EntityRow[]) => Promise<ResolveSuccess>
    openTrackView: (row: EntityRow, embed: FleetTrackEmbed) => View
}

const ROOT_ID = 'fleet-root'
const BULK_LIMIT = 50

const SORT_CYCLE: SortMode[] = ['type+id', 'status', 'eta', 'name']
const STATUS_CYCLE: StatusFilter[] = ['all', 'busy', 'resolvable', 'idle']
const TYPE_CYCLE: ('all' | EntityTypeName)[] = ['all', 'ship', 'container', 'warehouse']

interface FleetState {
    tick: FleetTick
    view: FleetViewState
    lastRows: EntityRow[]
    modal: ResolveModalHandle | null
    drilled: View | null
    helpOpen: boolean
}

export function createFleetView(opts: FleetViewOpts): View & {cursorKey: () => EntityKey | null} {
    const initialView: FleetViewState = {
        typeFilter: opts.defaults.typeFilter,
        statusFilter: opts.defaults.statusFilter,
        searchQuery: '',
        sortMode: opts.defaults.sort,
        cursorKey: null,
        searchMode: false,
    }

    const state: FleetState = {
        tick: opts.initialTick,
        view: initialView,
        lastRows: [],
        modal: null,
        drilled: null,
        helpOpen: false,
    }

    state.lastRows = deriveVisible(state.tick, state.view)
    state.view.cursorKey = resolveCursor(state.lastRows, null, [])

    let renderer: CliRenderer | null = null
    let consumed = false
    let resolveExit!: () => void
    const onExit = new Promise<void>((r) => {
        resolveExit = r
    })

    function recompute(): void {
        const prevRows = state.lastRows
        const prevCursor = state.view.cursorKey
        const next = deriveVisible(state.tick, state.view)
        state.view.cursorKey = resolveCursor(next, prevCursor, prevRows)
        state.lastRows = next
    }

    function bumpCursor(delta: number): void {
        const n = state.lastRows.length
        if (n === 0) return
        const idx = state.lastRows.findIndex((r) => r.key === state.view.cursorKey)
        const start = idx < 0 ? 0 : idx
        const next = (((start + delta) % n) + n) % n
        state.view.cursorKey = state.lastRows[next].key
    }

    function cursorRow(): EntityRow | null {
        if (!state.view.cursorKey) return null
        return state.lastRows.find((r) => r.key === state.view.cursorKey) ?? null
    }

    function isInteractable(): boolean {
        return state.modal === null && state.drilled === null && !state.view.searchMode
    }

    function cycleSort(delta: 1 | -1): void {
        const idx = SORT_CYCLE.indexOf(state.view.sortMode)
        const n = SORT_CYCLE.length
        const next = (((idx + delta) % n) + n) % n
        state.view.sortMode = SORT_CYCLE[next]
        recompute()
        render()
    }

    function cycleStatus(): void {
        const idx = STATUS_CYCLE.indexOf(state.view.statusFilter)
        state.view.statusFilter = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
        recompute()
        render()
    }

    function cycleType(): void {
        const idx = TYPE_CYCLE.indexOf(state.view.typeFilter)
        state.view.typeFilter = TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length]
        recompute()
        render()
    }

    function openModal(spec: {
        title: string
        body: string
        submittingLabel: string
        successLabel: string
        onConfirm: () => Promise<ResolveSuccess>
    }): void {
        state.modal = createResolveModal({
            title: spec.title,
            body: spec.body,
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            submittingLabel: spec.submittingLabel,
            successLabel: () => spec.successLabel,
            onCopyToClipboard: (text) => renderer?.copyToClipboardOSC52?.(text),
            onConfirm: spec.onConfirm,
            onClose: () => {
                state.modal = null
                render()
            },
        })
        state.modal.onChange(render)
        render()
    }

    function openPerEntityResolve(): void {
        const row = cursorRow()
        if (!row || !row.isIdle || row.completed <= 0) return
        const taskWord = row.completed === 1 ? 'task' : 'tasks'
        openModal({
            title: 'Resolve completed tasks?',
            body: `Submit on-chain transaction resolving ${row.completed} ${taskWord} for ${row.snap.type} ${row.snap.id} (${row.snap.entity_name}).`,
            submittingLabel: `Resolving ${row.completed} ${taskWord}`,
            successLabel: `Resolved ${row.completed} ${taskWord} for ${row.snap.type} ${row.snap.id}.`,
            onConfirm: () => opts.perEntityResolve(row),
        })
    }

    function openBulkResolve(): void {
        const visibleResolvable = state.lastRows.filter((r) => r.isIdle && r.completed > 0)
        if (visibleResolvable.length === 0) return
        const targets = visibleResolvable.slice(0, BULK_LIMIT)
        const overflow = visibleResolvable.length - targets.length
        const totalTasks = targets.reduce((acc, r) => acc + r.completed, 0)
        const lines = targets
            .map(
                (r) =>
                    `  ${r.snap.type} ${r.snap.id} ${r.snap.entity_name} (${r.completed} task${
                        r.completed === 1 ? '' : 's'
                    })`
            )
            .join('\n')
        const overflowLine =
            overflow > 0 ? `\n\n  (+${overflow} more — narrow the filter to include them)` : ''
        const entityWord = targets.length === 1 ? 'entity' : 'entities'
        openModal({
            title: 'Resolve across fleet?',
            body: `Submit a single transaction resolving ${totalTasks} task(s) across ${targets.length} ${entityWord}:\n\n${lines}${overflowLine}`,
            submittingLabel: `Resolving ${totalTasks} task(s)`,
            successLabel: `Resolved ${totalTasks} task(s) across ${targets.length} ${entityWord}.`,
            onConfirm: () => opts.bulkResolve(targets),
        })
    }

    function openDrillIn(row: EntityRow): void {
        const embed: FleetTrackEmbed = {
            onBack: () => {
                if (state.drilled) {
                    void state.drilled.dispose()
                    state.drilled = null
                }
                recompute()
                render()
            },
            onStepNext: () => stepDrill(1),
            onStepPrev: () => stepDrill(-1),
        }
        const sub = opts.openTrackView(row, embed)
        state.drilled = sub
        if (renderer) sub.attach(renderer)
    }

    function stepDrill(delta: number): void {
        if (!state.drilled) return
        void state.drilled.dispose()
        state.drilled = null
        bumpCursor(delta)
        const row = cursorRow()
        if (!row) {
            render()
            return
        }
        openDrillIn(row)
    }

    const hotkeys: Hotkey[] = [
        {
            key: 'q',
            label: 'quit',
            enabled: () => state.modal?.state.kind !== 'submitting',
            action: () => resolveExit(),
        },
        {
            key: '?',
            label: 'help',
            enabled: () => state.modal === null && state.drilled === null,
            action: () => {
                state.helpOpen = !state.helpOpen
                render()
            },
        },
        {
            key: 'up',
            label: 'up',
            enabled: () => isInteractable() && state.lastRows.length > 0,
            action: () => {
                bumpCursor(-1)
                render()
            },
        },
        {
            key: 'down',
            label: 'down',
            enabled: () => isInteractable() && state.lastRows.length > 0,
            action: () => {
                bumpCursor(1)
                render()
            },
        },
        {
            key: 't',
            label: 'type',
            enabled: () => isInteractable(),
            action: () => cycleType(),
        },
        {
            key: 'f',
            label: 'filter',
            enabled: () => isInteractable(),
            action: () => cycleStatus(),
        },
        {
            key: 's',
            label: 'sort',
            enabled: () => isInteractable(),
            action: () => cycleSort(1),
        },
        {
            key: 's',
            shift: true,
            label: 'sort prev',
            enabled: () => isInteractable(),
            action: () => cycleSort(-1),
        },
        {
            key: '/',
            label: 'search',
            enabled: () => state.modal === null && state.drilled === null,
            action: () => {
                state.view.searchMode = true
                state.view.searchQuery = ''
                recompute()
                render()
            },
        },
        {
            key: 'r',
            label: 'resolve',
            enabled: () => {
                if (!isInteractable()) return false
                const row = cursorRow()
                return row !== null && row.isIdle && row.completed > 0
            },
            action: () => openPerEntityResolve(),
        },
        {
            key: 'r',
            shift: true,
            label: 'bulk resolve',
            enabled: () => {
                if (!isInteractable()) return false
                return state.lastRows.some((r) => r.isIdle && r.completed > 0)
            },
            action: () => openBulkResolve(),
        },
        {
            key: 'return',
            label: 'open',
            enabled: () => isInteractable() && cursorRow() !== null,
            action: () => {
                const row = cursorRow()
                if (!row) return
                openDrillIn(row)
            },
        },
        {
            key: '`',
            label: 'console',
            enabled: () => true,
            action: () => {
                renderer?.console?.toggle()
            },
        },
    ]

    const keys = new HotkeyRegistry<Hotkey>(hotkeys)

    function interceptKey(key: KeyEvent): boolean {
        if (state.drilled) {
            if (state.drilled.interceptKey?.(key)) return true
            return state.drilled.keys.dispatch(String(key.name ?? ''), key.shift ?? false)
        }
        if (state.modal) {
            state.modal.handleKey({name: String(key.name ?? '')})
            return true
        }
        if (state.view.searchMode) {
            const name = String(key.name ?? '')
            if (name === 'escape') {
                state.view.searchMode = false
                state.view.searchQuery = ''
                recompute()
                render()
                return true
            }
            if (name === 'return') {
                state.view.searchMode = false
                render()
                return true
            }
            if (name === 'backspace') {
                if (state.view.searchQuery.length > 0) {
                    state.view.searchQuery = state.view.searchQuery.slice(0, -1)
                    recompute()
                    render()
                }
                return true
            }
            const seq = (key as unknown as {sequence?: string}).sequence
            if (typeof seq === 'string' && seq.length === 1 && seq >= ' ') {
                state.view.searchQuery += seq
                recompute()
                render()
                return true
            }
            return true
        }
        return false
    }

    function render(): void {
        if (!renderer) return
        if (state.drilled) return
        const root = renderer.root as unknown as {
            add: (n: VChild) => void
            remove: (id: string) => void
        }
        try {
            root.remove(ROOT_ID)
        } catch {}
        root.add(layout(state, opts.owner, keys))
    }

    async function consume(): Promise<void> {
        try {
            for await (const tick of opts.stream) {
                state.tick = tick
                if (state.drilled) continue
                recompute()
                render()
            }
        } catch {
            // swallow stream errors; UI keeps last good frame
        }
    }

    return {
        keys,
        attach(r: CliRenderer): void {
            renderer = r
            render()
            if (!consumed) {
                consumed = true
                void consume()
            }
        },
        dispose: async () => {
            if (state.drilled) {
                try {
                    await state.drilled.dispose()
                } catch {}
                state.drilled = null
            }
            renderer = null
        },
        onExit,
        helpOpen: () => state.helpOpen,
        dismissHelp: () => {
            state.helpOpen = false
            render()
        },
        interceptKey,
        cursorKey: () => state.view.cursorKey,
    }
}

function connectionGlyph(c: FleetTick['connection']): {glyph: string; fg: string} {
    switch (c) {
        case 'live':
            return {glyph: '●live', fg: '#00FF66'}
        case 'reconnecting':
            return {glyph: '◐reconnecting', fg: '#FFCC00'}
        case 'connecting':
            return {glyph: '○connecting', fg: '#888888'}
    }
}

function layout(state: FleetState, owner: string, keys: HotkeyRegistry<Hotkey>): VChild {
    const total = state.tick.snaps.size
    const visible = state.lastRows.length
    let busy = 0
    let resolvable = 0
    for (const r of state.lastRows) {
        if (!r.isIdle) busy++
        else if (r.completed > 0) resolvable++
    }
    const conn = connectionGlyph(state.tick.connection)
    const searchOrSort = state.view.searchMode
        ? `/${state.view.searchQuery}_`
        : `sort: ${state.view.sortMode}`
    const headerLine = `FLEET · ${owner} · ${visible}/${total} entities · ${busy} busy · ${resolvable} resolvable · ${searchOrSort}`

    const children: VChild[] = [
        Box(
            {flexDirection: 'row', justifyContent: 'space-between'},
            Text({content: headerLine, fg: '#FFFFFF'}),
            Text({content: conn.glyph, fg: conn.fg})
        ),
        Text({content: '─'.repeat(60), fg: '#444444'}),
    ]

    if (state.lastRows.length === 0) {
        const msg =
            total === 0
                ? `  No entities owned by ${owner}.`
                : `  No entities match the current filter.`
        children.push(Text({content: ''}))
        children.push(Text({content: msg, fg: '#888888'}))
    } else {
        children.push(headerRow())
        for (const row of state.lastRows) {
            children.push(rowLine(row, row.key === state.view.cursorKey))
        }
    }

    const panel = renderPanel({children})

    const footer = renderFooter(keys.hints(), {kind: 'ready'})
    const rootChildren: VChild[] = [panel, footer]
    if (state.helpOpen && state.modal === null) {
        rootChildren.push(helpOverlay(keys))
    }
    if (state.modal) {
        rootChildren.push(state.modal.render())
    }
    return Box(
        {id: ROOT_ID, flexDirection: 'column', width: '100%', height: '100%'},
        ...rootChildren
    )
}

function headerRow(): VChild {
    const head = `  ${'TYPE'.padEnd(11)}${'ID'.padStart(4)}  ${'NAME'.padEnd(24)}${'STATUS'.padEnd(14)}ETA`
    return Text({content: head, fg: '#888888'})
}

function rowLine(row: EntityRow, isCursor: boolean): VChild {
    const prefix = isCursor ? '▶ ' : '  '
    const type = row.snap.type.padEnd(11)
    const id = String(row.snap.id).padStart(4)
    const name = (row.snap.entity_name ?? '').slice(0, 22).padEnd(24)
    const status = statusLabel(row).padEnd(14)
    const eta = row.isIdle ? '—' : formatDuration(Math.max(0, Math.ceil(row.remaining_s)))
    const fg = isCursor ? '#FFFF00' : undefined
    return Text({
        content: `${prefix}${type}${id}  ${name}${status}${eta}`,
        fg,
    })
}

function statusLabel(row: EntityRow): string {
    if (!row.isIdle) return 'busy'
    if (row.completed > 0) return `${row.completed} to resolve`
    return 'idle'
}

function helpOverlay(keys: HotkeyRegistry<Hotkey>): VChild {
    const rows: VChild[] = keys.all().map((h) => {
        const label = `${h.shift ? 'S+' : ''}${h.key}`
        return Text({
            content: `  ${label.padEnd(8)}${h.label}${h.enabled() ? '' : '  (disabled)'}`,
            bg: '#0d1117',
        })
    })
    return Box(
        {
            position: 'absolute',
            top: 4,
            left: 4,
            zIndex: 100,
            borderStyle: 'double',
            borderColor: '#FFFFFF',
            backgroundColor: '#0d1117',
            padding: 1,
            flexDirection: 'column',
        },
        Text({content: 'Hotkeys', fg: '#FFFF00', bg: '#0d1117'}),
        Text({content: '', bg: '#0d1117'}),
        ...rows,
        Text({content: '', bg: '#0d1117'}),
        Text({content: '  any key to dismiss', fg: '#888888', bg: '#0d1117'})
    )
}

export type {EntityRow, FleetViewState, SortMode, StatusFilter}
