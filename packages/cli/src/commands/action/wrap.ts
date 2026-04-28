import {type Action, Name} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface WrapOpts {
    owner: string
    entityType: EntityTypeName
    entityId: bigint
    cargoId: bigint
    quantity: bigint
}

export async function buildAction(opts: WrapOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.wrap(
        opts.owner,
        Name.from(opts.entityType),
        opts.entityId,
        opts.cargoId,
        opts.quantity
    )
}

interface WrapCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runWrap(
    ctx: EntityContext,
    owner: string,
    cargoId: bigint,
    quantity: bigint,
    options: WrapCliOptions
): Promise<void> {
    const action = await buildAction({
        owner,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        cargoId,
        quantity,
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
                'Requires: deployed entity with cargo; deploy target idle; caller owns both entities.\n'
            )
            .argument('<owner>', 'recipient account name')
            .argument('<cargo-id>', 'source cargo id', parseUint64)
            .argument('<quantity>', 'quantity to wrap', parseUint64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (owner: string, cargoId: bigint, quantity: bigint, opts: WrapCliOptions) => {
                    await runWrap(ctx, owner, cargoId, quantity, opts)
                }
            ),
}
