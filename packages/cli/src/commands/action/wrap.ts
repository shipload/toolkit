import {cargoItem, type ServerTypes, type Shipload} from '@shipload/sdk'
import {type Action, Name} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseUint64} from '../../lib/args'
import {parseModulesJson} from '../../lib/cargo-build'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface WrapOpts {
    owner: string
    entityType: EntityTypeName
    entityId: bigint
    nexusId: bigint
    itemId: bigint
    stackId: bigint
    quantity: bigint
    modules?: ServerTypes.module_entry[]
}

export async function buildAction(opts: WrapOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const item = cargoItem(
        {
            item_id: Number(opts.itemId),
            stats: opts.stackId,
            modules: opts.modules ?? [],
        },
        opts.quantity
    )
    return sl.actions.wrap(opts.owner, Name.from(opts.entityType), opts.entityId, opts.nexusId, [
        item,
    ])
}

interface WrapCliOptions {
    wait?: boolean
    track?: boolean
    modules?: string
}

export async function runWrap(
    ctx: EntityContext,
    owner: string,
    nexusId: bigint,
    itemId: bigint,
    stackId: bigint,
    quantity: bigint,
    options: WrapCliOptions
): Promise<void> {
    const action = await buildAction({
        owner,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        nexusId,
        itemId,
        stackId,
        quantity,
        modules: parseModulesJson(options.modules),
    })
    const result = await transact(
        {action},
        {description: `Wrapping ${quantity} cargo for ${owner}`}
    )
    await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result)
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'wrap',
    description: 'Wrap cargo into an NFT for the specified owner',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('wrap')
            .description('Wrap cargo into an NFT for the specified owner')
            .addHelpText(
                'before',
                'Requires: deployed entity at a nexus with cargo; caller owns the entity.\n' +
                    'Cargo is identified by (item-id, stack-id) — packed-entity stacks may also need --modules.\n'
            )
            .argument('<owner>', 'recipient account name')
            .argument('<nexus-id>', 'nexus id (entity must be at this nexus)', parseUint64)
            .argument('<item-id>', 'item id', parseUint64)
            .argument('<stack-id>', 'cargo stack id (often 0)', parseUint64)
            .argument('<quantity>', 'quantity to wrap', parseUint64)
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
                    owner: string,
                    nexusId: bigint,
                    itemId: bigint,
                    stackId: bigint,
                    quantity: bigint,
                    opts: WrapCliOptions
                ) => {
                    await runWrap(ctx, owner, nexusId, itemId, stackId, quantity, opts)
                }
            ),
}
