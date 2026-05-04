import {cargoItem, type Shipload} from '@shipload/sdk'
import {type Action, Name} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
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
    stackId: bigint
    quantity: bigint
    modules?: unknown[]
}

export async function buildAction(opts: TransferOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const item = cargoItem(
        {
            item_id: Number(opts.itemId),
            stats: opts.stackId,
            modules: (opts.modules ?? []) as never,
        },
        opts.quantity
    )
    return sl.actions.transfer(
        Name.from(opts.sourceType),
        opts.sourceId,
        Name.from(opts.destType),
        opts.destId,
        [item]
    )
}

interface TransferCliOptions {
    wait?: boolean
    track?: boolean
    modules?: string
}

export async function runTransfer(
    ctx: EntityContext,
    destType: EntityTypeName,
    destId: bigint,
    itemId: bigint,
    stackId: bigint,
    quantity: bigint,
    options: TransferCliOptions
): Promise<void> {
    const modules = options.modules ? JSON.parse(options.modules) : []
    const action = await buildAction({
        sourceType: ctx.entityType,
        sourceId: ctx.entityId,
        destType,
        destId,
        itemId,
        stackId,
        quantity,
        modules,
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
                'Requires: source and destination entities owned by caller; source has the cargo; destination has capacity.\n' +
                    'Cargo is identified by (item-id, stack-id) — packed-entity stacks may also need --modules.\n'
            )
            .argument('<dest-type>', 'destination entity type', parseEntityType)
            .argument('<dest-id>', 'destination entity id', parseUint64)
            .argument('<item-id>', 'item id', parseUint64)
            .argument('<stack-id>', 'cargo stack id (often 0)', parseUint64)
            .argument('<quantity>', 'quantity', parseUint64)
            .addOption(
                new Option(
                    '--modules <json>',
                    'modules vector for packed entities (JSON array, default [])'
                )
            )
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (
                    destType: EntityTypeName,
                    destId: bigint,
                    itemId: bigint,
                    stackId: bigint,
                    quantity: bigint,
                    opts: TransferCliOptions
                ) => {
                    await runTransfer(ctx, destType, destId, itemId, stackId, quantity, opts)
                }
            ),
}
