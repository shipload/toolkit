import {Box, type CliRenderer, type KeyEvent, Text, type VChild} from '@opentui/core'
import {schedule, ServerContract, type ServerTypes} from '@shipload/sdk'
import {TimePoint} from '@wharfkit/antelope'
import {formatDuration, formatTimeUTC} from '../../lib/format'
import {
    laneFront,
    laneLabel,
    laneSectionStatus,
    sortLaneKeysSemantic,
    type LaneFrontState,
    type LaneSectionStatus,
} from '../../lib/lane-presentation'
import {type EntitySnapshot, snapshotTaskTimes} from '../../lib/snapshot'
import type {SnapshotTick} from '../../lib/snapshot-stream'
import {type Hotkey, HotkeyRegistry} from '../hotkeys'
import {renderEntitySummary} from '../primitives/entity-summary'
import {type FooterStatus, renderFooter} from '../primitives/footer'
import {renderProgressBar} from '../primitives/progress-bar'
import {createResolveModal, type ResolveModalHandle} from '../primitives/resolve-modal'
import {GUTTER_WIDTH, renderTaskRow} from '../primitives/task-row'
import type {View} from '../view'

export interface TrackRow {
    laneKey: number
    task: ServerTypes.task
    status: 'done' | 'active' | 'pending'
    completesAt: Date
}

export function trackRows(snap: EntitySnapshot, now: Date): TrackRow[] {
    return schedule.orderedTasks(snap).map((ot) => ({
        laneKey: ot.laneKey,
        task: ot.task,
        status: schedule.laneTaskCompleteOf(snap, ot.laneKey, ot.taskIndex, now)
            ? 'done'
            : schedule.laneTaskInProgressOf(snap, ot.laneKey, ot.taskIndex, now)
              ? 'active'
              : 'pending',
        completesAt: ot.completesAt,
    }))
}

export interface TrackViewCtx {
    entityType: string
    entityId: bigint | number
}

export interface ResolveResult {
    txid: string
    explorerUrl: string
}

export interface TrackEmbed {
    onBack: () => void
    onStepNext: () => void
    onStepPrev: () => void
    label?: string
}

export interface TrackViewOpts {
    ctx: TrackViewCtx
    initialSnapshot: EntitySnapshot
    stream: AsyncGenerator<SnapshotTick, void, void>
    resolveAction: (completedCount: number) => Promise<ResolveResult>
    embed?: TrackEmbed
}

const ROOT_ID = 'track-root'
const PENDING_RESOLVE_TIMEOUT_MS = 8_000
const TIMEZONE_SUFFIX_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i

interface ResolveEvent {
    laneKey: number
    taskIndex: number
}

interface TaskFingerprint {
    laneKey: number
    taskIndex: number
    type: string
    duration: string
    coordinates: string
    cargoLength: number
}

interface ResolvePlan {
    events: ResolveEvent[]
    fingerprints: TaskFingerprint[]
}

interface PendingResolve {
    events: ResolveEvent[]
    fingerprints: TaskFingerprint[]
    appliedAt: number
    baseTaskCount: number
}

interface ViewState {
    tick: SnapshotTick
    status: FooterStatus
    helpOpen: boolean
    modal: ResolveModalHandle | null
    pendingResolve: PendingResolve | null
    laneFilter: number | null
}

interface TrackSection {
    laneKey: number
    label: string
    status: LaneSectionStatus
    front: LaneFrontState
    rows: TrackRow[]
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

function taskDuration_s(task: ServerTypes.task): number {
    const raw = task as {duration?: unknown; duration_s?: unknown}
    return Math.max(0, asNumber(raw.duration_s ?? raw.duration))
}

function valueSignature(value: unknown): string {
    if (value === undefined || value === null) return ''
    return String(value)
}

function coordinatesSignature(value: unknown): string {
    if (!value || typeof value !== 'object') return ''
    const coords = value as {x?: unknown; y?: unknown; z?: unknown}
    return [coords.x, coords.y, coords.z].map(valueSignature).join(',')
}

function taskFingerprint(
    laneKey: number,
    taskIndex: number,
    task: ServerTypes.task
): TaskFingerprint {
    const raw = task as {
        type?: unknown
        duration?: unknown
        duration_s?: unknown
        coordinates?: unknown
        cargo?: unknown[]
    }
    return {
        laneKey,
        taskIndex,
        type: valueSignature(raw.type),
        duration: valueSignature(raw.duration_s ?? raw.duration),
        coordinates: coordinatesSignature(raw.coordinates),
        cargoLength: Array.isArray(raw.cargo) ? raw.cargo.length : 0,
    }
}

function startedMs(started: unknown): number | null {
    if (started instanceof Date) return started.getTime()
    if (typeof started === 'string') {
        const timestamp =
            started.includes('T') && !TIMEZONE_SUFFIX_RE.test(started) ? `${started}Z` : started
        const parsed = Date.parse(timestamp)
        return Number.isFinite(parsed) ? parsed : null
    }
    if (typeof started === 'number') return started
    if (!started || typeof started !== 'object') return null
    if ('toDate' in started && typeof started.toDate === 'function') {
        return started.toDate().getTime()
    }
    if ('toMilliseconds' in started && typeof started.toMilliseconds === 'function') {
        return Number(started.toMilliseconds())
    }
    return null
}

function shiftedStarted(started: unknown, droppedDuration_s: number): unknown {
    if (droppedDuration_s <= 0) return started
    const ms = startedMs(started)
    if (ms === null) return started
    return TimePoint.fromMilliseconds(ms + droppedDuration_s * 1000)
}

function dropCounts(events: ResolveEvent[]): Map<number, number> {
    const dropByLane = new Map<number, number>()
    for (const ev of events) {
        dropByLane.set(ev.laneKey, Math.max(dropByLane.get(ev.laneKey) ?? 0, ev.taskIndex + 1))
    }
    return dropByLane
}

function captureResolvePlan(snap: EntitySnapshot, now: Date = new Date()): ResolvePlan {
    const events = schedule.resolveOrder(snap, now).map((ev) => ({
        laneKey: ev.laneKey,
        taskIndex: ev.taskIndex,
    }))
    const dropByLane = dropCounts(events)
    const fingerprints: TaskFingerprint[] = []
    for (const lane of schedule.getLanes(snap)) {
        const drop = dropByLane.get(lane.laneKey) ?? 0
        for (let taskIndex = 0; taskIndex < drop; taskIndex++) {
            const task = lane.schedule.tasks[taskIndex]
            if (task) fingerprints.push(taskFingerprint(lane.laneKey, taskIndex, task))
        }
    }
    return {events, fingerprints}
}

function fingerprintsMatch(snap: EntitySnapshot, fingerprints: TaskFingerprint[]): boolean {
    const lanesByKey = new Map(schedule.getLanes(snap).map((lane) => [lane.laneKey, lane]))
    return fingerprints.every((expected) => {
        const task = lanesByKey.get(expected.laneKey)?.schedule.tasks[expected.taskIndex]
        return (
            task !== undefined &&
            sameFingerprint(taskFingerprint(expected.laneKey, expected.taskIndex, task), expected)
        )
    })
}

function sameFingerprint(actual: TaskFingerprint, expected: TaskFingerprint): boolean {
    return (
        actual.laneKey === expected.laneKey &&
        actual.taskIndex === expected.taskIndex &&
        actual.type === expected.type &&
        actual.duration === expected.duration &&
        actual.coordinates === expected.coordinates &&
        actual.cargoLength === expected.cargoLength
    )
}

function canApplyPendingResolve(snap: EntitySnapshot, pending: PendingResolve): boolean {
    return (
        schedule.orderedTasks(snap).length === pending.baseTaskCount &&
        fingerprintsMatch(snap, pending.fingerprints)
    )
}

function applyOptimisticResolve(snap: EntitySnapshot, events: ResolveEvent[]): EntitySnapshot {
    const dropByLane = dropCounts(events)
    const lanes = schedule.getLanes(snap).flatMap((l) => {
        const drop = dropByLane.get(l.laneKey) ?? 0
        const droppedDuration_s = l.schedule.tasks
            .slice(0, drop)
            .reduce((sum, task) => sum + taskDuration_s(task), 0)
        const tasks = l.schedule.tasks.slice(drop)
        if (tasks.length === 0) return []
        return [
            ServerContract.Types.lane.from({
                lane_key: l.laneKey,
                schedule: {started: shiftedStarted(l.schedule.started, droppedDuration_s), tasks},
            }),
        ]
    })
    return {...snap, lanes}
}

function initialTick(snap: EntitySnapshot): SnapshotTick {
    const times = snapshotTaskTimes(snap)
    return {
        snap,
        elapsed_s: snap.is_idle ? 0 : times.elapsed_s,
        remaining_s: snap.is_idle ? 0 : times.remaining_s,
        total_s: times.total_s,
        attempt: 0,
        sinceLastFetch_s: 0,
        fetchInterval_s: 5,
    }
}

export function createTrackView(opts: TrackViewOpts): View {
    const state: ViewState = {
        tick: initialTick(opts.initialSnapshot),
        status: {kind: 'ready'},
        helpOpen: false,
        modal: null,
        pendingResolve: null,
        laneFilter: null,
    }
    let resolveExit!: () => void
    const onExit = new Promise<void>((r) => {
        resolveExit = r
    })

    function applyTickFilter(tick: SnapshotTick): SnapshotTick {
        const pending = state.pendingResolve
        if (!pending) return tick
        if (Date.now() - pending.appliedAt > PENDING_RESOLVE_TIMEOUT_MS) {
            state.pendingResolve = null
            return tick
        }
        if (!canApplyPendingResolve(tick.snap, pending)) {
            state.pendingResolve = null
            return tick
        }
        return {...tick, snap: applyOptimisticResolve(tick.snap, pending.events)}
    }

    const embed = opts.embed
    const baseHotkeys: Hotkey[] = [
        {
            key: 'r',
            label: 'resolve',
            enabled: () => resolvableCount(state.tick.snap) > 0 && state.modal === null,
            action: () => {
                const plan = captureResolvePlan(state.tick.snap)
                const events = plan.events
                const count = events.length
                if (count === 0) return
                const baseTaskCount = schedule.orderedTasks(state.tick.snap).length
                const taskWord = count === 1 ? 'task' : 'tasks'
                const ctx = opts.ctx
                state.modal = createResolveModal({
                    title: 'Resolve completed tasks?',
                    body: `This submits an on-chain transaction resolving ${count} completed ${taskWord} for ${ctx.entityType} ${ctx.entityId}.`,
                    confirmLabel: 'OK',
                    cancelLabel: 'Cancel',
                    submittingLabel: `Resolving ${count} ${taskWord}`,
                    successLabel: () =>
                        `Resolved ${count} ${taskWord} for ${ctx.entityType} ${ctx.entityId}.`,
                    onCopyToClipboard: (text) => renderer?.copyToClipboardOSC52?.(text),
                    onConfirm: async () => {
                        const result = await opts.resolveAction(count)
                        const pending: PendingResolve = {
                            events,
                            fingerprints: plan.fingerprints,
                            appliedAt: Date.now(),
                            baseTaskCount,
                        }
                        if (canApplyPendingResolve(state.tick.snap, pending)) {
                            state.pendingResolve = pending
                            state.tick = {
                                ...state.tick,
                                snap: applyOptimisticResolve(state.tick.snap, events),
                            }
                        } else {
                            state.pendingResolve = null
                        }
                        return result
                    },
                    onClose: () => {
                        state.modal = null
                        render()
                    },
                })
                state.modal.onChange(render)
                render()
            },
        },
        {
            key: 'l',
            label: 'lane',
            enabled: () => state.modal === null && semanticLaneKeys(state.tick.snap).length > 0,
            action: () => {
                state.laneFilter = nextLaneFilter(state.tick.snap, state.laneFilter)
                render()
            },
        },
        {
            key: 'a',
            label: 'all',
            enabled: () => state.modal === null,
            action: () => {
                state.laneFilter = null
                render()
            },
        },
        {
            key: '?',
            label: 'help',
            enabled: () => state.modal === null,
            action: () => {
                state.helpOpen = !state.helpOpen
                render()
            },
        },
    ]
    if (embed) {
        baseHotkeys.push(
            {
                key: 'escape',
                label: 'back',
                enabled: () => state.modal === null,
                action: () => embed.onBack(),
            },
            {
                key: 'tab',
                label: 'next',
                enabled: () => state.modal === null,
                action: () => embed.onStepNext(),
            },
            {
                key: 'tab',
                shift: true,
                label: 'prev',
                enabled: () => state.modal === null,
                action: () => embed.onStepPrev(),
            },
            {
                key: '`',
                label: 'console',
                enabled: () => true,
                action: () => {
                    renderer?.console?.toggle()
                },
            }
        )
    } else {
        baseHotkeys.push(
            {
                key: 'q',
                label: 'quit',
                enabled: () => state.modal?.state.kind !== 'submitting',
                action: () => resolveExit(),
            },
            {
                key: '`',
                label: 'console',
                enabled: () => true,
                action: () => {
                    renderer?.console?.toggle()
                },
            }
        )
    }
    const keys = new HotkeyRegistry<Hotkey>(baseHotkeys)

    let renderer: CliRenderer | null = null
    let consumed = false

    function interceptKey(key: KeyEvent): boolean {
        if (!state.modal) return false
        state.modal.handleKey({name: String(key.name ?? '')})
        return true
    }

    function render(): void {
        if (!renderer) return
        const root = renderer.root as unknown as {
            add: (n: VChild) => void
            remove: (id: string) => void
        }
        try {
            root.remove(ROOT_ID)
        } catch {}
        root.add(layout(state, opts.ctx, keys, embed))
    }

    async function consume(): Promise<void> {
        try {
            for await (const tick of opts.stream) {
                state.tick = applyTickFilter(tick)
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
            if (renderer) {
                const root = renderer.root as unknown as {remove: (id: string) => void}
                try {
                    root.remove(ROOT_ID)
                } catch {}
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
    }
}

function layout(
    state: ViewState,
    ctx: TrackViewCtx,
    keys: HotkeyRegistry<Hotkey>,
    embed?: TrackEmbed
): VChild {
    const headerExtra: VChild[] = embed?.label ? [Text({content: embed.label, fg: '#888888'})] : []
    const panelChildren: VChild[] = [
        renderEntitySummary({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            snap: state.tick.snap,
            elapsed_s: state.tick.elapsed_s,
        }),
        ...headerExtra,
        Text({content: ''}),
        Box({flexDirection: 'column'}, ...laneBody(state.tick, state.laneFilter)),
    ]
    const panel = Box(
        {
            borderStyle: 'rounded',
            borderColor: '#666666',
            padding: 1,
            flexDirection: 'column',
            width: '100%',
            flexGrow: 1,
        },
        ...panelChildren
    )
    const footer = renderFooter(keys.hints(), state.status, {
        sinceLastFetch_s: state.tick.sinceLastFetch_s,
    })
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

function resolvableCount(snap: EntitySnapshot, now: Date = new Date()): number {
    return captureResolvePlan(snap, now).events.length
}

function semanticLaneKeys(snap: EntitySnapshot): number[] {
    return sortLaneKeysSemantic(schedule.getLanes(snap).map((lane) => lane.laneKey))
}

function nextLaneFilter(snap: EntitySnapshot, current: number | null): number | null {
    const keys = semanticLaneKeys(snap)
    if (keys.length === 0) return null
    if (current === null) return keys[0] ?? null
    const currentIndex = keys.indexOf(current)
    if (currentIndex < 0) return keys[0] ?? null
    return currentIndex === keys.length - 1 ? null : (keys[currentIndex + 1] ?? null)
}

function laneSections(snap: EntitySnapshot, now: Date, laneFilter: number | null): TrackSection[] {
    const lanes = schedule.getLanes(snap)
    const lanesByKey = new Map(lanes.map((lane) => [lane.laneKey, lane]))
    const keys = semanticLaneKeys(snap)
    const visibleKeys = laneFilter !== null && keys.includes(laneFilter) ? [laneFilter] : keys
    return visibleKeys.map((laneKey) => {
        const lane = lanesByKey.get(laneKey)!
        return {
            laneKey,
            label: laneLabel(snap, laneKey, {compact: true}),
            status: laneSectionStatus(lane, now),
            front: laneFront(lane.schedule, now),
            rows: lane.schedule.tasks.map((task, taskIndex) => ({
                laneKey,
                task,
                status: schedule.laneTaskCompleteOf(snap, laneKey, taskIndex, now)
                    ? 'done'
                    : schedule.laneTaskInProgressOf(snap, laneKey, taskIndex, now)
                      ? 'active'
                      : 'pending',
                completesAt: schedule.laneCompletesAt(lane.schedule, taskIndex),
            })),
        }
    })
}

function laneBody(t: SnapshotTick, laneFilter: number | null): VChild[] {
    const now = new Date()
    const sections = laneSections(t.snap, now, laneFilter)
    const lines: VChild[] = []

    if (sections.length === 0) {
        lines.push(Text({content: '  no lane schedules', fg: '#888888'}))
    }

    for (const section of sections) {
        if (lines.length > 0) lines.push(Text({content: ''}))
        lines.push(sectionHeader(section))
        lines.push(...sectionProgress(section))
        if (section.rows.length === 0) {
            lines.push(Text({content: '  no queued tasks', fg: '#888888'}))
            continue
        }
        for (const row of section.rows) {
            lines.push(renderLaneTask(section.label, row))
        }
    }

    const completed = resolvableCount(t.snap, now)
    if (completed > 0) {
        lines.push(Text({content: ''}))
        lines.push(
            Text({
                content: `  ${completed} task(s) ready to resolve for ${t.snap.type} ${t.snap.id}.`,
                fg: '#FFCC00',
            })
        )
    }

    const refreshIn = Math.max(0, Math.ceil(t.fetchInterval_s - t.sinceLastFetch_s))
    lines.push(Text({content: ''}))
    lines.push(Text({content: `  Refresh in ${refreshIn}s.`, fg: '#888888'}))
    return lines
}

function sectionHeader(section: TrackSection): VChild {
    const suffix =
        section.front.status === 'waiting'
            ? ` · starts in ${formatDuration(section.front.startsIn_s)}`
            : section.front.status === 'active'
              ? ` · ${formatDuration(section.front.remaining_s)} remaining`
              : ''
    const fg =
        section.status === 'ready to resolve'
            ? '#FFCC00'
            : section.status === 'waiting'
              ? '#888888'
              : undefined
    return Text({content: `  ${section.label} · ${section.status}${suffix}`, fg})
}

function sectionProgress(section: TrackSection): VChild[] {
    if (section.front.status !== 'active') return []
    const remainingLabel = formatDuration(section.front.remaining_s)
    const barIndent = ' '.repeat(GUTTER_WIDTH + 2)
    return [
        Text({
            content: `${barIndent}${renderProgressBar(section.front.progress, 28)} ${remainingLabel} remaining`,
        }),
    ]
}

function renderLaneTask(laneTag: string, row: TrackRow): VChild {
    const duration =
        row.status === 'done'
            ? `${laneTag}  done`
            : `${laneTag}  ${formatDuration(Number(row.task.duration ?? 0))}`
    return renderTaskRow({
        prefix: row.status === 'done' ? '  ✓ ' : row.status === 'active' ? '  ▶ ' : '    ',
        task: row.task,
        duration,
        completionTime: formatTimeUTC(row.completesAt),
        fg: row.status === 'done' ? '#00FF66' : row.status === 'pending' ? '#888888' : undefined,
    })
}

function helpOverlay(keys: HotkeyRegistry<Hotkey>): VChild {
    const rows: VChild[] = keys.all().map((h) =>
        Text({
            content: `  ${h.key.padEnd(4)}${h.label}${h.enabled() ? '' : '  (disabled)'}`,
            bg: '#0d1117',
        })
    )
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
