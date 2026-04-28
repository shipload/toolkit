import {type Action, Name} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseEntityType, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface TransferOpts {
    sourceType: EntityTypeName
    sourceId: bigint
    destType: EntityTypeName
    destId: bigint
    itemId: bigint
    stats: bigint
    quantity: bigint
}

export async function buildAction(opts: TransferOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.transfer(
        Name.from(opts.sourceType),
        opts.sourceId,
        Name.from(opts.destType),
        opts.destId,
        opts.itemId,
        opts.stats,
        opts.quantity
    )
}

interface TransferCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runTransfer(
    ctx: EntityContext,
    destType: EntityTypeName,
    destId: bigint,
    itemId: bigint,
    stats: bigint,
    quantity: bigint,
    options: TransferCliOptions
): Promise<void> {
    const action = await buildAction({
        sourceType: ctx.entityType,
        sourceId: ctx.entityId,
        destType,
        destId,
        itemId,
        stats,
        quantity,
    })
    const result = await transact(
        {action},
        {
            description: `Transferred ${quantity} of item ${itemId} from ${ctx.entityType}:${ctx.entityId} to ${destType}:${destId}`,
        }
    )
    await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result)
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'transfer',
    description: 'Transfer cargo to another entity (same owner)',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('transfer')
            .description('Transfer cargo to another entity (same owner)')
            .addHelpText(
                'before',
                'Requires: source and destination entities owned by caller; source has the cargo; destination has capacity.\n'
            )
            .argument('<dest-type>', 'destination entity type', parseEntityType)
            .argument('<dest-id>', 'destination entity id', parseUint64)
            .argument('<item-id>', 'item id', parseUint64)
            .argument('<stats>', 'cargo stack discriminator (often 0)', parseUint64)
            .argument('<quantity>', 'quantity', parseUint64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (
                    destType: EntityTypeName,
                    destId: bigint,
                    itemId: bigint,
                    stats: bigint,
                    quantity: bigint,
                    opts: TransferCliOptions
                ) => {
                    await runTransfer(ctx, destType, destId, itemId, stats, quantity, opts)
                }
            ),
}
