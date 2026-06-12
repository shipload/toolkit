import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {
    ALL_ENTITY_TYPES,
    type EntityTypeName,
    parseUint8,
    parseUint32,
    parseUint64,
} from '../../lib/args'
import {computeCancelableCount} from '../../lib/cancel-compute'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {getEntityRow, laneSnapshot, lanesWithPendingTasks} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

export interface CancelOpts {
    entityType: EntityTypeName
    entityId: bigint
    laneKey: number
    count: bigint
}

export async function buildAction(opts: CancelOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.cancel(opts.entityId, opts.laneKey, opts.count)
}

interface CancelFlags {
    all?: boolean
    from?: number
    lane?: number
}

interface Resolved {
    laneKey: number
    count: bigint
    rangeHint: string
}

// Pick the lane to cancel from: explicit --lane, else the sole lane with pending tasks.
function selectLane(
    ctx: EntityContext,
    row: Awaited<ReturnType<typeof getEntityRow>>,
    flags: CancelFlags
): number {
    const active = lanesWithPendingTasks(row, new Date())
    if (flags.lane !== undefined) {
        return flags.lane
    }
    if (active.length === 0) {
        throw new ValidationError(
            'no pending tasks to cancel.',
            `review with: shiploadcli ${ctx.entityType} ${ctx.entityId} tasks`
        )
    }
    if (active.length > 1) {
        const keys = active.map((l) => l.laneKey).join(', ')
        throw new ValidationError(
            `entity has pending tasks on multiple lanes (${keys}) — pass --lane <key> to choose one.`
        )
    }
    return active[0].laneKey
}

async function resolveCancel(
    ctx: EntityContext,
    countArg: bigint | undefined,
    flags: CancelFlags
): Promise<Resolved> {
    const provided =
        (countArg !== undefined ? 1 : 0) + (flags.all ? 1 : 0) + (flags.from !== undefined ? 1 : 0)
    if (provided === 0) {
        throw new ValidationError(
            'specify exactly one of: <count>, --all, or --from <idx>',
            'cancel 3   |   cancel --all   |   cancel --from 4'
        )
    }
    if (provided > 1) {
        throw new ValidationError('<count>, --all, and --from are mutually exclusive — pick one')
    }
    const now = new Date()
    const row = await getEntityRow(ctx.entityId)
    const laneKey = selectLane(ctx, row, flags)
    if (countArg !== undefined) {
        return {laneKey, count: countArg, rangeHint: ''}
    }
    const view = laneSnapshot(row, laneKey, now)
    const total = view.tasks.length
    if (flags.all) {
        const count = computeCancelableCount(view, {kind: 'all'})
        if (count === 0n) {
            throw new ValidationError(
                'no cancelable tasks at the lane tail.',
                `the last pending task is non-cancelable — review with: shiploadcli ${ctx.entityType} ${ctx.entityId} tasks`
            )
        }
        const first = total - Number(count)
        const last = total - 1
        return {laneKey, count, rangeHint: ` (tasks #${first}–#${last})`}
    }
    const idx = flags.from as number
    const count = computeCancelableCount(view, {kind: 'from', index: idx})
    const last = total - 1
    return {laneKey, count, rangeHint: ` (tasks #${idx}–#${last})`}
}

export async function runCancel(
    ctx: EntityContext,
    countArg: bigint | undefined,
    flags: CancelFlags
): Promise<void> {
    const {laneKey, count, rangeHint} = await resolveCancel(ctx, countArg, flags)
    const action = await buildAction({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        laneKey,
        count,
    })
    await transact(
        {action},
        {
            description: `Cancelling ${count} task(s)${rangeHint} on lane ${laneKey} for ${ctx.entityType} ${ctx.entityId}`,
        }
    )
}

const HELP_BEFORE = `Forms:
  cancel <count>       cancel <count> tasks from the tail
  cancel --all         cancel every cancelable pending task (stops at first non-cancelable)
  cancel --from <idx>  cancel from task index <idx> (0-indexed) through the tail

Lane: defaults to the entity's sole active lane; pass --lane <key> when several lanes are busy.
Requires: pending task that is cancelable.
`

export const SUBCOMMAND: EntitySubcommand = {
    name: 'cancel',
    description: 'Cancel pending tasks (by count, --all, or --from <idx>)',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('cancel')
            .description('Cancel pending tasks (by count, --all, or --from <idx>)')
            .addHelpText('before', HELP_BEFORE)
            .argument('[count]', 'number of tasks to cancel (from the tail)', parseUint64)
            .option('--all', 'cancel every cancelable pending task')
            .option(
                '--from <idx>',
                'cancel from task index (0-indexed) through the tail',
                parseUint32
            )
            .option('--lane <key>', 'worker lane to cancel from (0 = mobility)', parseUint8)
            .action(async (count: bigint | undefined, opts: CancelFlags) => {
                await runCancel(ctx, count, opts)
            }),
}
