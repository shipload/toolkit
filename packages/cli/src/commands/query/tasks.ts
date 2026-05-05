import {
    predictTaskCargoEffects,
    type PredictedCargoAddition,
    type ServerTypes,
    type TaskCargoEffect,
} from '@shipload/sdk'
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
import {completedCount} from '../../lib/snapshot'

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
    cargoEffects: TaskCargoEffect[]
    now: Date
}

function fmtCoords(c: {x: number; y: number; z: number | null} | null | undefined): string {
    if (!c) return '—'
    return `(${c.x}, ${c.y})`
}

function fmtAddition(a: PredictedCargoAddition): string {
    const target =
        a.target.kind === 'existing' ? `#${a.target.rowId.toString()}` : `(${a.target.label})`
    return `${safeItemName(a.item_id)} ×${a.quantity} → ${target}`
}

function fmtCargoCell(effect: TaskCargoEffect | undefined): string {
    if (!effect || effect.additions.length === 0) return ''
    return effect.additions.map(fmtAddition).join('\n')
}

export function render(view: TasksView): string {
    const header = `${renderEntityHeader(view.entity)}\n  ${formatTimeUTC(view.now)}`

    if (!view.schedule || view.schedule.tasks.length === 0) {
        return [header, '', '  No scheduled tasks.'].join('\n')
    }

    const showCargo = view.cargoEffects.some((e) => e.additions.length > 0)

    const head = ['#', 'dest', 'type', 'status', 'duration', 'ends']
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

    const totalTasks = view.schedule.tasks.length
    const completed = completedCount({
        is_idle: view.entity.is_idle,
        schedule: {tasks: view.schedule.tasks},
        pending_tasks: view.pending,
    })
    let cursor = view.schedule.started.getTime()
    for (let i = 0; i < totalTasks; i++) {
        const t = view.schedule.tasks[i]
        const end = new Date(cursor + t.duration * 1000)
        cursor = end.getTime()
        const status = i < completed ? 'done' : i === completed ? 'active' : 'pending'
        const endsLabel = reltime(end, view.now)
        const row: string[] = [
            String(i),
            fmtCoords(t.coordinates),
            formatTaskType(t.type),
            status,
            formatDuration(t.duration),
            endsLabel,
        ]
        if (showCargo) row.push(fmtCargoCell(view.cargoEffects[i]))
        table.push(row)
    }

    const out = [header, '', table.toString()]
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

function additionToJson(a: PredictedCargoAddition): Record<string, unknown> {
    return {
        item_id: a.item_id,
        item_name: safeItemName(a.item_id),
        quantity: a.quantity,
        stats: a.stats.toString(),
        target:
            a.target.kind === 'existing'
                ? {kind: 'existing', row_id: a.target.rowId.toString()}
                : {kind: 'new', label: a.target.label},
    }
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
        cargo_effects: view.cargoEffects.map((e) => ({
            additions: e.additions.map(additionToJson),
        })),
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
    const cargoEffects = predictTaskCargoEffects(
        info.cargo ?? [],
        (info.schedule?.tasks ?? []) as unknown as ServerTypes.task[]
    )
    const view: TasksView = {
        entity: info,
        schedule: info.schedule
            ? {
                  started: new Date(info.schedule.started.toMilliseconds()),
                  tasks: info.schedule.tasks ?? [],
              }
            : null,
        pending: info.pending_tasks ?? [],
        cargoEffects,
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
