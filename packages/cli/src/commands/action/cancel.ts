import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseUint32, parseUint64} from '../../lib/args'
import {computeCancelableCount} from '../../lib/cancel-compute'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

export interface CancelOpts {
    entityType: EntityTypeName
    entityId: bigint
    count: bigint
}

export async function buildAction(opts: CancelOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.cancel(opts.entityId, opts.count)
}

interface CancelFlags {
    all?: boolean
    from?: number
}

interface Resolved {
    count: bigint
    rangeHint: string
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
    if (countArg !== undefined) {
        return {count: countArg, rangeHint: ''}
    }
    const snap = await getEntitySnapshot(ctx.entityId)
    const total = snap.schedule?.tasks?.length ?? 0
    if (flags.all) {
        const count = computeCancelableCount(snap, {kind: 'all'})
        if (count === 0n) {
            throw new ValidationError(
                'no cancelable tasks at the schedule tail.',
                `the last pending task is non-cancelable — review with: shiploadcli ${ctx.entityType} ${ctx.entityId} tasks`
            )
        }
        const first = total - Number(count)
        const last = total - 1
        return {count, rangeHint: ` (tasks #${first}–#${last})`}
    }
    const idx = flags.from as number
    const count = computeCancelableCount(snap, {kind: 'from', index: idx})
    const last = total - 1
    return {count, rangeHint: ` (tasks #${idx}–#${last})`}
}

export async function runCancel(
    ctx: EntityContext,
    countArg: bigint | undefined,
    flags: CancelFlags
): Promise<void> {
    const {count, rangeHint} = await resolveCancel(ctx, countArg, flags)
    const action = await buildAction({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        count,
    })
    await transact(
        {action},
        {
            description: `Cancelling ${count} task(s)${rangeHint} for ${ctx.entityType} ${ctx.entityId}`,
        }
    )
}

const HELP_BEFORE = `Forms:
  cancel <count>       cancel <count> tasks from the tail
  cancel --all         cancel every cancelable pending task (stops at first non-cancelable)
  cancel --from <idx>  cancel from task index <idx> (0-indexed) through the tail

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
            .action(async (count: bigint | undefined, opts: CancelFlags) => {
                await runCancel(ctx, count, opts)
            }),
}
