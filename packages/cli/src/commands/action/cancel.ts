import {type Action, Name} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'

export interface CancelOpts {
    entityType: EntityTypeName
    entityId: bigint
    count: bigint
}

export async function buildAction(opts: CancelOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.cancel(opts.entityId, opts.count, Name.from(opts.entityType))
}

export async function runCancel(ctx: EntityContext, count: bigint): Promise<void> {
    const action = await buildAction({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        count,
    })
    await transact(
        {action},
        {description: `Cancelling ${count} task(s) for ${ctx.entityType} ${ctx.entityId}`}
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'cancel',
    description: 'Cancel pending tasks (count required)',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('cancel')
            .description('Cancel pending tasks (count required)')
            .addHelpText('before', 'Requires: pending task that is cancelable.\n')
            .argument('<count>', 'number of tasks to cancel', parseUint64)
            .action(async (count: bigint) => {
                await runCancel(ctx, count)
            }),
}
