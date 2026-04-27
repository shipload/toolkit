import {Box, type CliRenderer, type KeyEvent, Text, type VChild} from '@opentui/core'
import type {ServerTypes} from '@shipload/sdk'
import {
    formatCargoUsage,
    formatCoords,
    formatDuration,
    formatTimeUTC,
    projectEnergy,
} from '../../lib/format'
import type {EntitySnapshot} from '../../lib/snapshot'
import type {SnapshotTick} from '../../lib/snapshot-stream'
import {type Hotkey, HotkeyRegistry} from '../hotkeys'
import {renderField} from '../primitives/field'
import {type FooterStatus, renderFooter} from '../primitives/footer'
import {renderHeader} from '../primitives/header'
import {renderProgressBar} from '../primitives/progress-bar'
import {renderTaskRow} from '../primitives/task-row'
import type {View} from '../view'

export interface TrackViewCtx {
    entityType: string
    entityId: bigint | number
}

export interface ResolveResult {
    txid: string
    explorerUrl: string
}

export interface TrackViewOpts {
    ctx: TrackViewCtx
    initialSnapshot: EntitySnapshot
    stream: AsyncGenerator<SnapshotTick, void, void>
    resolveAction: (completedCount: number) => Promise<ResolveResult>
}

const ROOT_ID = 'track-root'
const MODAL_BG = '#0d1117'
const PENDING_RESOLVE_TIMEOUT_MS = 8_000

type ModalState =
    | {kind: 'none'}
    | {kind: 'confirm-resolve'; count: number; selection: 'ok' | 'cancel'}
    | {kind: 'submitting'; label: string}
    | {
          kind: 'success'
          txid: string
          explorerUrl: string
          resolvedCount: number
          copiedAt?: number
      }
    | {kind: 'error'; message: string}

const COPIED_FLASH_MS = 2000

interface PendingResolve {
    count: number
    appliedAt: number
    baseTaskCount: number
}

interface ViewState {
    tick: SnapshotTick
    status: FooterStatus
    helpOpen: boolean
    modal: ModalState
    pendingResolve: PendingResolve | null
}

function completedCount(snap: EntitySnapshot): number {
    const all = snap.schedule?.tasks?.length ?? 0
    if (snap.is_idle) return all
    // Busy: schedule.tasks = [done..., active, ...pending]
    const pending = snap.pending_tasks?.length ?? 0
    return Math.max(0, all - pending - 1)
}

function applyOptimisticResolve(snap: EntitySnapshot, count: number): EntitySnapshot {
    const tasks = snap.schedule?.tasks ?? []
    const remaining = tasks.slice(count)
    return {
        ...snap,
        schedule: snap.schedule ? {...snap.schedule, tasks: remaining} : snap.schedule,
    }
}

function initialTick(snap: EntitySnapshot): SnapshotTick {
    return {
        snap,
        elapsed_s: snap.is_idle ? 0 : Number(snap.current_task_elapsed ?? 0),
        remaining_s: snap.is_idle ? 0 : Number(snap.current_task_remaining ?? 0),
        total_s: Number(snap.current_task_elapsed ?? 0) + Number(snap.current_task_remaining ?? 0),
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
        modal: {kind: 'none'},
        pendingResolve: null,
    }
    let resolveExit!: () => void
    const onExit = new Promise<void>((r) => {
        resolveExit = r
    })

    async function executeResolve(count: number): Promise<void> {
        state.modal = {kind: 'submitting', label: `Resolving ${count} task(s)`}
        render()
        try {
            const result = await opts.resolveAction(count)
            const baseTaskCount = state.tick.snap.schedule?.tasks?.length ?? 0
            state.pendingResolve = {
                count,
                appliedAt: Date.now(),
                baseTaskCount,
            }
            state.tick = {...state.tick, snap: applyOptimisticResolve(state.tick.snap, count)}
            state.modal = {
                kind: 'success',
                txid: result.txid,
                explorerUrl: result.explorerUrl,
                resolvedCount: count,
            }
        } catch (err) {
            state.modal = {
                kind: 'error',
                message: err instanceof Error ? err.message : String(err),
            }
        }
        render()
    }

    function applyTickFilter(tick: SnapshotTick): SnapshotTick {
        const pending = state.pendingResolve
        if (!pending) return tick
        if (Date.now() - pending.appliedAt > PENDING_RESOLVE_TIMEOUT_MS) {
            state.pendingResolve = null
            return tick
        }
        const incoming = tick.snap.schedule?.tasks?.length ?? 0
        if (incoming !== pending.baseTaskCount) {
            // Chain returned post-resolve data; trust it.
            state.pendingResolve = null
            return tick
        }
        return {...tick, snap: applyOptimisticResolve(tick.snap, pending.count)}
    }

    const keys = new HotkeyRegistry<Hotkey>([
        {
            key: 'r',
            label: 'resolve',
            enabled: () => completedCount(state.tick.snap) > 0 && state.modal.kind === 'none',
            action: () => {
                const count = completedCount(state.tick.snap)
                if (count === 0) return
                state.modal = {kind: 'confirm-resolve', count, selection: 'ok'}
                render()
            },
        },
        {
            key: '?',
            label: 'help',
            enabled: () => state.modal.kind === 'none',
            action: () => {
                state.helpOpen = !state.helpOpen
                render()
            },
        },
        {
            key: 'q',
            label: 'quit',
            enabled: () => true,
            action: () => resolveExit(),
        },
        {
            key: '`',
            label: 'console',
            enabled: () => true,
            action: () => {
                renderer?.console?.toggle()
            },
        },
    ])

    let renderer: CliRenderer | null = null
    let consumed = false

    function interceptKey(key: KeyEvent): boolean {
        if (state.modal.kind === 'none') return false
        const m = state.modal
        if (m.kind === 'submitting') {
            // Block all input while in flight.
            return true
        }
        if (m.kind === 'confirm-resolve') {
            if (key.name === 'left' || key.name === 'right' || key.name === 'tab') {
                m.selection = m.selection === 'ok' ? 'cancel' : 'ok'
                render()
                return true
            }
            if (key.name === 'escape') {
                state.modal = {kind: 'none'}
                render()
                return true
            }
            if (key.name === 'return') {
                if (m.selection === 'ok') {
                    void executeResolve(m.count)
                } else {
                    state.modal = {kind: 'none'}
                    render()
                }
                return true
            }
            return true
        }
        if (m.kind === 'success') {
            if (key.name === 'c') {
                renderer?.copyToClipboardOSC52?.(m.explorerUrl)
                m.copiedAt = Date.now()
                render()
                setTimeout(() => {
                    if (state.modal.kind === 'success' && state.modal.copiedAt === m.copiedAt) {
                        render()
                    }
                }, COPIED_FLASH_MS)
                return true
            }
        }
        if (key.name === 'return' || key.name === 'escape' || key.name === 'space') {
            state.modal = {kind: 'none'}
            render()
        }
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
        root.add(layout(state, opts.ctx, keys))
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

function layout(state: ViewState, ctx: TrackViewCtx, keys: HotkeyRegistry<Hotkey>): VChild {
    const panelChildren: VChild[] = [
        renderHeader({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            entityName: state.tick.snap.entity_name,
            sinceLastFetch_s: state.tick.sinceLastFetch_s,
        }),
        Text({content: ''}),
        statsRow(state.tick),
        Text({content: ''}),
        Box(
            {flexDirection: 'column'},
            ...(state.tick.snap.is_idle ? idleBody(state.tick) : busyBody(state.tick))
        ),
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
    const footer = renderFooter(keys.hints(), state.status)
    const rootChildren: VChild[] = [panel, footer]
    if (state.helpOpen && state.modal.kind === 'none') {
        rootChildren.push(helpOverlay(keys))
    }
    if (state.modal.kind !== 'none') {
        rootChildren.push(renderModal(state.modal, ctx))
    }
    return Box(
        {id: ROOT_ID, flexDirection: 'column', width: '100%', height: '100%'},
        ...rootChildren
    )
}

function statsRow(t: {snap: EntitySnapshot; elapsed_s: number}): VChild {
    const cells: string[] = []
    if (t.snap.coordinates) {
        cells.push(`◷ ${formatCoords(t.snap.coordinates as ServerTypes.coordinates)}`)
    }
    const energyStr = energySummary(t)
    if (energyStr) cells.push(energyStr)
    const cargoStr = cargoSummary(t.snap)
    if (cargoStr) cells.push(cargoStr)
    return Text({content: cells.join('    ')})
}

function energySummary(t: {snap: EntitySnapshot; elapsed_s: number}): string | null {
    if (t.snap.energy === undefined) return null
    const stored = Number(t.snap.energy)
    if (!t.snap.generator) return renderField({icon: '⚡', value: String(stored)})
    const cap = Number(t.snap.generator.capacity)
    const recharge = Number(t.snap.generator.recharge)
    if (t.snap.is_idle || !recharge) {
        return renderField({icon: '⚡', value: `${stored}/${cap}`})
    }
    const projected = projectEnergy(stored, cap, recharge, 0, t.elapsed_s)
    return renderField({icon: '⚡', value: `${projected}/${cap}`})
}

function cargoSummary(snap: EntitySnapshot): string | null {
    if (snap.cargomass === undefined) return null
    const cap = snap.capacity !== undefined ? Number(snap.capacity) : undefined
    return `cargo ${formatCargoUsage(Number(snap.cargomass), cap)}`
}

function busyBody(t: SnapshotTick): VChild[] {
    const all = (t.snap.schedule?.tasks ?? []) as ServerTypes.task[]
    const pendingCount = (t.snap.pending_tasks ?? []).length
    const activeIdx = Math.max(0, all.length - pendingCount - 1)
    const done = all.slice(0, activeIdx)
    const active = all[activeIdx] ?? t.snap.current_task
    const pending = all.slice(activeIdx + 1)

    const lines: VChild[] = []
    for (const task of done) {
        lines.push(renderTaskRow({prefix: '  ✓ ', task, suffix: 'done', fg: '#00FF66'}))
    }
    if (active) {
        lines.push(
            renderTaskRow({
                prefix: '  ▶ ',
                task: active,
                suffix: formatDuration(Number(active.duration ?? 0)),
            })
        )
    }
    const remainingLabel = formatDuration(Math.max(0, Math.ceil(t.remaining_s)))
    const ratio = t.total_s > 0 ? t.elapsed_s / t.total_s : 0
    lines.push(
        Text({
            content: `  ${renderProgressBar(ratio, 28)} ${remainingLabel} remaining`,
        })
    )

    if (pending.length > 0) {
        lines.push(Text({content: ''}))
        lines.push(Text({content: '  Queued', fg: '#888888'}))
        for (const task of pending) {
            lines.push(
                renderTaskRow({
                    prefix: '    ',
                    task,
                    suffix: formatDuration(Number(task.duration ?? 0)),
                    fg: '#888888',
                })
            )
        }
        const totalRemaining_s =
            Math.max(0, t.remaining_s) +
            pending.reduce((acc, p) => acc + Number(p.duration ?? 0), 0)
        const finishesAt = new Date(Date.now() + totalRemaining_s * 1000)
        lines.push(
            Text({
                content: `  ETA: ${formatDuration(Math.ceil(totalRemaining_s))} · finishes at ${formatTimeUTC(finishesAt)}`,
                fg: '#888888',
            })
        )
    }
    return lines
}

function idleBody(t: SnapshotTick): VChild[] {
    const completed = t.snap.schedule?.tasks?.length ?? 0
    const refreshIn = Math.max(0, Math.ceil(t.fetchInterval_s - t.sinceLastFetch_s))
    const lines: VChild[] = [Text({content: '  ◌ idle'})]
    if (completed > 0) {
        lines.push(Text({content: ''}))
        lines.push(
            Text({
                content: `  ${completed} task(s) awaiting resolve.   Press [r] to resolve.`,
                fg: '#FFCC00',
            })
        )
    }
    lines.push(Text({content: ''}))
    lines.push(Text({content: `  Refresh in ${refreshIn}s.`, fg: '#888888'}))
    return lines
}

function renderModal(modal: Exclude<ModalState, {kind: 'none'}>, ctx: TrackViewCtx): VChild {
    let body: VChild
    switch (modal.kind) {
        case 'confirm-resolve':
            body = confirmResolveBody(modal, ctx)
            break
        case 'submitting':
            body = submittingBody(modal)
            break
        case 'success':
            body = successBody(modal, ctx)
            break
        case 'error':
            body = errorBody(modal)
            break
    }
    // Full-screen overlay that centers the modal box in the middle of the terminal.
    return Box(
        {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            justifyContent: 'center',
            alignItems: 'center',
        },
        Box(
            {
                width: 64,
                borderStyle: 'double',
                borderColor: '#FFFFFF',
                backgroundColor: MODAL_BG,
                padding: 1,
                flexDirection: 'column',
            },
            body
        )
    )
}

function confirmResolveBody(
    modal: {count: number; selection: 'ok' | 'cancel'},
    ctx: TrackViewCtx
): VChild {
    const taskWord = modal.count === 1 ? 'task' : 'tasks'
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: 'Resolve completed tasks?', fg: '#FFFF00', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({
            content: `This submits an on-chain transaction resolving ${modal.count} ${taskWord} for ${ctx.entityType} ${ctx.entityId}.`,
            bg: MODAL_BG,
        }),
        Text({content: '', bg: MODAL_BG}),
        Box(
            {flexDirection: 'row', justifyContent: 'center', backgroundColor: MODAL_BG},
            modalButton('OK', modal.selection === 'ok'),
            Text({content: '    ', bg: MODAL_BG}),
            modalButton('Cancel', modal.selection === 'cancel')
        ),
        Text({content: '', bg: MODAL_BG}),
        Text({
            content: '  ←/→ or Tab to switch · Enter to confirm · Esc to cancel',
            fg: '#888888',
            bg: MODAL_BG,
        })
    )
}

function submittingBody(modal: {label: string}): VChild {
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: '⏳  Submitting transaction...', fg: '#FFCC00', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: `  ${modal.label}.`, bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: '  Awaiting chain confirmation.', fg: '#888888', bg: MODAL_BG})
    )
}

function successBody(
    modal: {
        txid: string
        explorerUrl: string
        resolvedCount: number
        copiedAt?: number
    },
    ctx: TrackViewCtx
): VChild {
    const taskWord = modal.resolvedCount === 1 ? 'task' : 'tasks'
    const copyHint =
        modal.copiedAt !== undefined && Date.now() - modal.copiedAt < COPIED_FLASH_MS
            ? '  ✓ copied to clipboard'
            : '  c to copy URL · Enter / Esc / Space to dismiss'
    const copyHintColor =
        modal.copiedAt !== undefined && Date.now() - modal.copiedAt < COPIED_FLASH_MS
            ? '#00FF66'
            : '#888888'
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: '✓ Transaction confirmed', fg: '#00FF66', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({
            content: `  Resolved ${modal.resolvedCount} ${taskWord} for ${ctx.entityType} ${ctx.entityId}.`,
            bg: MODAL_BG,
        }),
        Text({content: '', bg: MODAL_BG}),
        Text({content: '  View on explorer:', fg: '#888888', bg: MODAL_BG}),
        Text({content: `  ${modal.explorerUrl}`, fg: '#88CCFF', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: copyHint, fg: copyHintColor, bg: MODAL_BG})
    )
}

function errorBody(modal: {message: string}): VChild {
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: '✗ Transaction failed', fg: '#FF5555', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: `  ${modal.message}`, bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({
            content: '  Enter / Esc / Space to dismiss',
            fg: '#888888',
            bg: MODAL_BG,
        })
    )
}

function modalButton(label: string, focused: boolean): VChild {
    if (focused) {
        return Text({
            content: ` ▶ ${label} ◀ `,
            fg: '#0d1117',
            bg: '#FFCC00',
        })
    }
    return Text({content: `   ${label}   `, fg: '#888888', bg: MODAL_BG})
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
