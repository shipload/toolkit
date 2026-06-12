import {readFile} from 'node:fs/promises'
import type {Command} from 'commander'
import {transactStrict} from '../../lib/session'
import {manifestFromJSON} from '../../lib/snapshot-manifest'

function shiftTimestamp(value: string, seconds: number): string {
    const ms = new Date(`${value}Z`).getTime() + seconds * 1000
    return new Date(ms).toISOString().replace('Z', '').split('.')[0]
}

function shiftScheduleTimestamps(rawSchedule: unknown, seconds: number): unknown {
    if (!rawSchedule || typeof rawSchedule !== 'object' || seconds === 0) return rawSchedule
    const sched = rawSchedule as {started?: string; tasks?: Array<Record<string, unknown>>}
    if (!Array.isArray(sched.tasks)) return rawSchedule
    const out: Record<string, unknown> = {...sched}
    if (typeof sched.started === 'string') out.started = shiftTimestamp(sched.started, seconds)
    out.tasks = sched.tasks.map((task) => {
        const t: Record<string, unknown> = {...task}
        for (const key of ['started_at', 'ends_at'] as const) {
            if (typeof t[key] === 'string') t[key] = shiftTimestamp(t[key] as string, seconds)
        }
        return t
    })
    return out
}

const BATCH_SIZE = 50

export type RestoreTable =
    | 'state'
    | 'nftconfig'
    | 'player'
    | 'entity'
    | 'cargo'
    | 'entitygroup'
    | 'reserve'

export type RestoreStepName =
    | 'wipe'
    | 'importstate'
    | 'setnftcfg'
    | 'importplayer'
    | 'importentity'
    | 'importcargo'
    | 'importgroup'
    | 'importreserve'

export interface RestoreStep {
    name: RestoreStepName
    table?: RestoreTable
}

const RESTORE_TABLES: readonly RestoreTable[] = [
    'state',
    'nftconfig',
    'player',
    'entity',
    'cargo',
    'entitygroup',
    'reserve',
]

const RESTORE_STEPS: readonly RestoreStep[] = [
    {name: 'importstate', table: 'state'},
    {name: 'setnftcfg', table: 'nftconfig'},
    {name: 'importplayer', table: 'player'},
    {name: 'importentity', table: 'entity'},
    {name: 'importcargo', table: 'cargo'},
    {name: 'importgroup', table: 'entitygroup'},
    {name: 'importreserve', table: 'reserve'},
]

interface PendingAction {
    name: string
    data: Record<string, unknown>
}

function buildAction(target: string, name: string, data: Record<string, unknown>) {
    return {
        account: target,
        name,
        authorization: [{actor: target, permission: 'active'}],
        data,
    }
}

async function pushAction(
    target: string,
    name: string,
    data: Record<string, unknown>
): Promise<void> {
    await transactStrict({actions: [buildAction(target, name, data)]})
}

async function pushBatched(target: string, actions: PendingAction[]): Promise<void> {
    for (let i = 0; i < actions.length; i += BATCH_SIZE) {
        const chunk = actions.slice(i, i + BATCH_SIZE)
        await transactStrict({
            actions: chunk.map((a) => buildAction(target, a.name, a.data)),
        })
    }
}

export function parseRestoreTables(raw?: string): Set<RestoreTable> {
    if (!raw) return new Set(RESTORE_TABLES)

    const parsed = raw
        .split(',')
        .map((table) => table.trim())
        .filter(Boolean)
    if (parsed.length === 0) throw new Error('--tables must name at least one table')

    const out = new Set<RestoreTable>()
    for (const table of parsed) {
        if (!RESTORE_TABLES.includes(table as RestoreTable)) {
            throw new Error(`unknown restore table: ${table}`)
        }
        out.add(table as RestoreTable)
    }
    return out
}

export function buildRestoreSteps(opts: {
    tables: Set<RestoreTable>
    skipWipe: boolean
}): RestoreStep[] {
    const filtered = opts.tables.size !== RESTORE_TABLES.length
    if (filtered && !opts.skipWipe) {
        throw new Error('--tables requires --skip-wipe')
    }

    const steps: RestoreStep[] = []
    if (!opts.skipWipe) steps.push({name: 'wipe'})
    for (const step of RESTORE_STEPS) {
        if (step.table && opts.tables.has(step.table)) steps.push(step)
    }
    return steps
}

export function registerSubcommand(tools: Command): void {
    tools
        .command('restore')
        .description('Replay a snapshot manifest onto a target contract')
        .argument('<file>', 'snapshot manifest JSON file')
        .option('--target <account>', 'target contract account (default: manifest sourceContract)')
        .option(
            '--time-offset <seconds>',
            'shift all schedule timestamps by N seconds (positive = into the future)',
            (v) => Number(v),
            0
        )
        .option('--skip-wipe', 'do not wipe the target before restoring (for incremental ops)')
        .option(
            '--tables <names>',
            'comma-separated table list to restore: state,nftconfig,player,entity,cargo,entitygroup,reserve'
        )
        .action(
            async (
                file: string,
                opts: {target?: string; timeOffset: number; skipWipe?: boolean; tables?: string}
            ) => {
                const text = await readFile(file, 'utf8')
                const manifest = manifestFromJSON(text)
                const target = opts.target ?? manifest.sourceContract
                const offset = opts.timeOffset
                const tables = parseRestoreTables(opts.tables)
                const steps = buildRestoreSteps({tables, skipWipe: !!opts.skipWipe})
                const stepNames = new Set(steps.map((step) => step.name))

                console.log(`Restoring snapshot ${file} → ${target}`)
                console.log(
                    `  state.epoch=${manifest.state.epoch}, players=${manifest.players.length}, entities=${manifest.entities.length}, cargo=${manifest.cargo.length}`
                )

                if (stepNames.has('wipe')) {
                    console.log('Step 1: wipe')
                    await pushAction(target, 'wipe', {})
                }

                if (stepNames.has('importstate')) {
                    console.log('Step 2: importstate')
                    await pushAction(target, 'importstate', {row: manifest.state})
                }

                if (stepNames.has('setnftcfg')) {
                    console.log(`Step 3: setnftcfg × ${manifest.nftconfig.length}`)
                    await pushBatched(
                        target,
                        manifest.nftconfig.map((cfg) => ({
                            name: 'setnftcfg',
                            data: {
                                item_id: cfg.item_id,
                                template_id: cfg.template_id,
                                schema_name: cfg.schema_name,
                            },
                        }))
                    )
                }

                if (stepNames.has('importplayer')) {
                    console.log(`Step 4: importplayer × ${manifest.players.length}`)
                    await pushBatched(
                        target,
                        manifest.players.map((p) => ({
                            name: 'importplayer',
                            data: {owner: p.owner},
                        }))
                    )
                }

                if (stepNames.has('importentity')) {
                    console.log(`Step 5: importentity × ${manifest.entities.length}`)
                    await pushBatched(
                        target,
                        manifest.entities.map((e) => {
                            const row = e as Record<string, unknown>
                            const lanes = Array.isArray(row.lanes)
                                ? (row.lanes as Array<Record<string, unknown>>).map((l) => ({
                                      ...l,
                                      schedule: shiftScheduleTimestamps(l.schedule, offset),
                                  }))
                                : row.lanes
                            return {name: 'importentity', data: {row: {...e, lanes}}}
                        })
                    )
                }

                if (stepNames.has('importcargo')) {
                    console.log(`Step 6: importcargo × ${manifest.cargo.length}`)
                    await pushBatched(
                        target,
                        manifest.cargo.map((c) => ({name: 'importcargo', data: {row: c}}))
                    )
                }

                if (stepNames.has('importgroup')) {
                    console.log(`Step 7: importgroup × ${manifest.entitygroups.length}`)
                    await pushBatched(
                        target,
                        manifest.entitygroups.map((g) => ({name: 'importgroup', data: {row: g}}))
                    )
                }

                if (stepNames.has('importreserve')) {
                    const reserveActions = manifest.reserves.flatMap((scope) =>
                        scope.rows.map((r) => ({
                            name: 'importreserve',
                            data: {epoch_scope: scope.scope, row: r},
                        }))
                    )
                    console.log(
                        `Step 8: importreserve × ${reserveActions.length} across ${manifest.reserves.length} scopes`
                    )
                    await pushBatched(target, reserveActions)
                }

                console.log('Restore complete.')
            }
        )
}
