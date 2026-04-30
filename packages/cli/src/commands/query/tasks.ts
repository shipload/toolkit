import type {ServerTypes} from '@shipload/sdk'
import Table from 'cli-table3'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES} from '../../lib/args'
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

interface Task {
    type: number
    duration: number
    cancelable: number
    entitygroup?: number | null
    coordinates?: {x: number; y: number; z: number | null} | null
    energy_cost?: number | null
}

interface TasksView {
    entity: ServerTypes.entity_info
    schedule: {started: Date; tasks: Task[]} | null
    pending: Task[]
    now: Date
}

function fmtCoords(c: {x: number; y: number; z: number | null} | null | undefined): string {
    if (!c) return '—'
    return `(${c.x}, ${c.y})`
}

export function render(view: TasksView): string {
    const header = `${renderEntityHeader(view.entity)}\n  ${formatTimeUTC(view.now)}`

    if (!view.schedule || view.schedule.tasks.length === 0) {
        return [header, '', '  No scheduled tasks.'].join('\n')
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
        head: ['#', 'dest', 'type', 'status', 'duration', 'ends'],
        colAligns: ['left', 'left', 'left', 'left', 'left', 'left'],
    })

    let cursor = view.schedule.started.getTime()
    let doneCount = 0
    for (let i = 0; i < view.schedule.tasks.length; i++) {
        const t = view.schedule.tasks[i]
        const start = new Date(cursor)
        const end = new Date(cursor + t.duration * 1000)
        cursor = end.getTime()
        const status = view.now >= end ? 'done' : view.now >= start ? 'active' : 'pending'
        if (status === 'done') doneCount++
        const endsLabel = reltime(end, view.now)
        table.push([
            String(i),
            fmtCoords(t.coordinates),
            formatTaskType(t.type),
            status,
            formatDuration(t.duration),
            endsLabel,
        ])
    }

    const out = [header, '', table.toString()]
    if (doneCount > 0) {
        out.push(
            '',
            formatResolveHint(String(view.entity.type), BigInt(view.entity.id.toString()), doneCount),
        )
    }
    return out.join('\n')
}

function viewToJson(view: TasksView): Record<string, unknown> {
    return {
        type: String(view.entity.type),
        id: BigInt(view.entity.id.toString()),
        schedule: view.schedule
            ? {
                  started: view.schedule.started.toISOString(),
                  tasks: view.schedule.tasks,
              }
            : null,
        pending: view.pending,
        now: view.now.toISOString(),
    }
}

export async function runTasks(ctx: EntityContext, opts: {json?: boolean}): Promise<void> {
    const info = (await server.readonly('getentity', {
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
    })) as unknown as ServerTypes.entity_info & {
        schedule?: {started: {toMilliseconds(): number}; tasks: Task[]}
        pending_tasks?: Task[]
    }
    const view: TasksView = {
        entity: info,
        schedule: info.schedule
            ? {
                  started: new Date(info.schedule.started.toMilliseconds()),
                  tasks: info.schedule.tasks ?? [],
              }
            : null,
        pending: info.pending_tasks ?? [],
        now: new Date(),
    }
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
