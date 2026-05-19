import {readFile} from 'node:fs/promises'
import type {Command} from 'commander'
import {transactStrict} from '../../lib/session'
import {manifestFromJSON} from '../../lib/snapshot-manifest'

function shiftScheduleTimestamps(rawSchedule: unknown, seconds: number): unknown {
    if (!rawSchedule || typeof rawSchedule !== 'object' || seconds === 0) return rawSchedule
    const sched = rawSchedule as {tasks?: Array<Record<string, unknown>>}
    if (!Array.isArray(sched.tasks)) return rawSchedule
    return {
        ...sched,
        tasks: sched.tasks.map((task) => {
            const out: Record<string, unknown> = {...task}
            for (const key of ['started_at', 'ends_at'] as const) {
                if (typeof out[key] === 'string') {
                    const ms = new Date(out[key] as string).getTime() + seconds * 1000
                    out[key] = new Date(ms).toISOString().replace('Z', '').split('.')[0]
                }
            }
            return out
        }),
    }
}

const BATCH_SIZE = 50

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
        .action(
            async (
                file: string,
                opts: {target?: string; timeOffset: number; skipWipe?: boolean}
            ) => {
                const text = await readFile(file, 'utf8')
                const manifest = manifestFromJSON(text)
                const target = opts.target ?? manifest.sourceContract
                const offset = opts.timeOffset

                console.log(`Restoring snapshot ${file} → ${target}`)
                console.log(
                    `  state.epoch=${manifest.state.epoch}, players=${manifest.players.length}, entities=${manifest.entities.length}, cargo=${manifest.cargo.length}`
                )

                if (!opts.skipWipe) {
                    console.log('Step 1: wipe')
                    await pushAction(target, 'wipe', {})
                }

                console.log('Step 2: importstate')
                await pushAction(target, 'importstate', {row: manifest.state})

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

                console.log(`Step 4: importplayer × ${manifest.players.length}`)
                await pushBatched(
                    target,
                    manifest.players.map((p) => ({
                        name: 'importplayer',
                        data: {owner: p.owner},
                    }))
                )

                console.log(`Step 5: importentity × ${manifest.entities.length}`)
                await pushBatched(
                    target,
                    manifest.entities.map((e) => ({
                        name: 'importentity',
                        data: {
                            row: {
                                ...e,
                                schedule: shiftScheduleTimestamps(
                                    (e as Record<string, unknown>).schedule,
                                    offset
                                ),
                            },
                        },
                    }))
                )

                console.log(`Step 6: importcargo × ${manifest.cargo.length}`)
                await pushBatched(
                    target,
                    manifest.cargo.map((c) => ({name: 'importcargo', data: {row: c}}))
                )

                console.log(`Step 7: importgroup × ${manifest.entitygroups.length}`)
                await pushBatched(
                    target,
                    manifest.entitygroups.map((g) => ({name: 'importgroup', data: {row: g}}))
                )

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

                console.log('Restore complete.')
            }
        )
}
