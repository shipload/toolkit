import {schedule, taskCargoChanges, type ServerTypes, type TaskCargoChange} from '@shipload/sdk'
import Table from 'cli-table3'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES} from '../../lib/args'
import {safeItemName} from '../../lib/cargo-table'
import {server} from '../../lib/client'
import {renderEntityHeader} from '../../lib/entity-header'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {
    formatDuration,
    formatOutput,
    formatResolveHint,
    formatTaskType,
    formatTimeUTC,
    reltime,
} from '../../lib/format'
import {
    laneFront,
    laneLabel,
    laneSectionStatus,
    sortLaneKeysSemantic,
    type LaneFrontState,
    type LaneSectionStatus,
} from '../../lib/lane-presentation'

interface TaskRow {
    displayIndex: number
    laneKey: number
    laneLabel: string
    localIndex: number
    task: ServerTypes.task
    status: 'done' | 'active' | 'pending'
    endsAt: Date
}

interface TaskSection {
    laneKey: number
    laneLabel: string
    status: LaneSectionStatus
    front: LaneFrontState
    rows: TaskRow[]
}

interface TasksView {
    entity: ServerTypes.entity_info
    rows: TaskRow[]
    sections: TaskSection[]
    now: Date
}

function pendingTasksOf(entity: ServerTypes.entity_info, now: Date): ServerTypes.task[] {
    return schedule
        .orderedTasks(entity)
        .filter(
            (ot) =>
                !schedule.laneTaskCompleteOf(entity, ot.laneKey, ot.taskIndex, now) &&
                !schedule.laneTaskInProgressOf(entity, ot.laneKey, ot.taskIndex, now)
        )
        .map((ot) => ot.task)
}

function buildTaskRowAt(
    entity: ServerTypes.entity_info,
    laneKey: number,
    localIndex: number,
    task: ServerTypes.task,
    endsAt: Date,
    displayIndex: number,
    now: Date
): TaskRow {
    const done = schedule.laneTaskCompleteOf(entity, laneKey, localIndex, now)
    const active = schedule.laneTaskInProgressOf(entity, laneKey, localIndex, now)
    return {
        displayIndex,
        laneKey,
        laneLabel: laneLabel(entity, laneKey),
        localIndex,
        task,
        status: done ? 'done' : active ? 'active' : 'pending',
        endsAt,
    }
}

export function buildTasksView(entity: ServerTypes.entity_info, now: Date): TasksView {
    const rows: TaskRow[] = schedule
        .orderedTasks(entity)
        .map((ot, i) =>
            buildTaskRowAt(entity, ot.laneKey, ot.taskIndex, ot.task, ot.completesAt, i, now)
        )
    const lanes = schedule.getLanes(entity)
    const lanesByKey = new Map(lanes.map((lane) => [lane.laneKey, lane]))
    const sections: TaskSection[] = sortLaneKeysSemantic(lanes.map((lane) => lane.laneKey)).map(
        (laneKey) => {
            const lane = lanesByKey.get(laneKey)!
            return {
                laneKey,
                laneLabel: laneLabel(entity, laneKey),
                status: laneSectionStatus(lane, now),
                front: laneFront(lane.schedule, now),
                rows: lane.schedule.tasks.map((task, localIndex) =>
                    buildTaskRowAt(
                        entity,
                        laneKey,
                        localIndex,
                        task,
                        schedule.laneCompletesAt(lane.schedule, localIndex),
                        localIndex,
                        now
                    )
                ),
            }
        }
    )
    return {entity, rows, sections, now}
}

function fmtCoords(c: {x: unknown; y: unknown} | null | undefined): string {
    if (!c) return '—'
    return `(${c.x}, ${c.y})`
}

function fmtChange(c: TaskCargoChange): string {
    const arrow = c.direction === 'in' ? '↓' : '↑'
    return `${arrow} ${safeItemName(c.item_id)} ×${c.quantity} · stack ${c.stats.toString()}`
}

function fmtCargoCell(changes: TaskCargoChange[] | undefined): string {
    if (!changes || changes.length === 0) return ''
    return changes.map(fmtChange).join('\n')
}

function formatSectionHeader(section: TaskSection): string {
    const suffix =
        section.front.status === 'waiting'
            ? ` · starts in ${formatDuration(section.front.startsIn_s)}`
            : section.front.status === 'active'
              ? ` · ${formatDuration(section.front.remaining_s)} remaining`
              : ''
    return `${section.laneLabel} · ${section.status}${suffix}`
}

function taskTable(rows: TaskRow[], now: Date, showCargo: boolean): string {
    const head = ['idx', 'dest', 'type', 'status', 'duration', 'ends']
    const colAligns: ('left' | 'right')[] = ['left', 'left', 'left', 'left', 'left', 'left']
    if (showCargo) {
        head.push('cargo')
        colAligns.push('left')
    }

    const table = new Table({
        chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '  ',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: '  ',
        },
        style: {head: [], border: []},
        head,
        colAligns,
    })

    for (const row of rows) {
        const r: string[] = [
            String(row.localIndex),
            fmtCoords(row.task.coordinates),
            formatTaskType(Number(row.task.type)),
            row.status,
            formatDuration(Number(row.task.duration)),
            reltime(row.endsAt, now),
        ]
        if (showCargo) r.push(fmtCargoCell(taskCargoChanges(row.task)))
        table.push(r)
    }

    return table.toString()
}

function frontToJson(front: LaneFrontState): Record<string, unknown> {
    return {
        status: front.status,
        active_index: front.activeIndex,
        starts_in_s: front.startsIn_s,
        remaining_s: front.remaining_s,
        total_remaining_s: front.totalRemaining_s,
        progress: front.progress,
    }
}

function rowToJson(r: TaskRow): Record<string, unknown> {
    return {
        lane_key: r.laneKey,
        idx: r.localIndex,
        type: Number(r.task.type.toString()),
        status: r.status,
        ends: r.endsAt.toISOString(),
    }
}

function changeToJson(c: TaskCargoChange): Record<string, unknown> {
    return {
        direction: c.direction,
        item_id: c.item_id,
        item_name: safeItemName(c.item_id),
        quantity: c.quantity,
        stack_id: c.stats.toString(),
    }
}

function startedToIso(started: {toDate(): Date}): string {
    return started.toDate().toISOString()
}

export function render(view: TasksView): string {
    const header = `${renderEntityHeader(view.entity)}\n  ${formatTimeUTC(view.now)}`

    if (view.rows.length === 0) {
        return [header, '', '  No scheduled tasks.'].join('\n')
    }

    const showCargo = view.rows.some((r) => taskCargoChanges(r.task).length > 0)

    const completed = schedule.resolveOrder(view.entity, view.now).length
    const out = [header]
    for (const section of view.sections) {
        out.push(
            '',
            `  ${formatSectionHeader(section)}`,
            taskTable(section.rows, view.now, showCargo)
        )
    }
    if (completed > 0) {
        out.push(
            '',
            formatResolveHint(
                String(view.entity.type),
                BigInt(view.entity.id.toString()),
                completed
            )
        )
    }
    return out.join('\n')
}

export function viewToJson(view: TasksView): Record<string, unknown> {
    const mobility = schedule.mobilityLane(view.entity)
    return {
        type: String(view.entity.type),
        id: BigInt(view.entity.id.toString()),
        schedule: mobility
            ? {started: startedToIso(mobility.schedule.started), tasks: mobility.schedule.tasks}
            : null,
        pending: pendingTasksOf(view.entity, view.now),
        cargo_changes: mobility
            ? mobility.schedule.tasks.map((task) => taskCargoChanges(task).map(changeToJson))
            : [],
        lanes: schedule.getLanes(view.entity).map((l) => ({
            lane_key: l.laneKey,
            started: startedToIso(l.schedule.started),
            tasks: l.schedule.tasks,
        })),
        rows: view.rows.map(rowToJson),
        sections: view.sections.map((section) => ({
            lane_key: section.laneKey,
            lane_label: section.laneLabel,
            status: section.status,
            front: frontToJson(section.front),
            rows: section.rows.map(rowToJson),
        })),
        now: view.now.toISOString(),
    }
}

export async function runTasks(ctx: EntityContext, opts: {json?: boolean}): Promise<void> {
    const info = (await server.readonly('getentity', {
        entity_id: ctx.entityId,
    })) as unknown as ServerTypes.entity_info
    const view = buildTasksView(info, new Date())
    if (opts.json) {
        console.log(formatOutput(viewToJson(view), {json: true}, () => ''))
    } else {
        console.log(render(view))
    }
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'tasks',
    description: 'Show scheduled and pending tasks for the entity',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('tasks')
            .description('Show scheduled and pending tasks for the entity')
            .option('--json', 'emit JSON instead of formatted text')
            .action(async (opts: {json?: boolean}) => {
                await runTasks(ctx, opts)
            }),
}
