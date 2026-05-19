import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface WrapOpts {
    owner: string
    entityId: bigint
    nexusId: bigint
    cargoId: bigint
    quantity: bigint
}

export async function buildAction(opts: WrapOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.wrap(opts.owner, opts.entityId, opts.nexusId, opts.cargoId, opts.quantity)
}

interface WrapCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runWrap(
    ctx: EntityContext,
    owner: string,
    nexusId: bigint,
    cargoId: bigint,
    quantity: bigint,
    options: WrapCliOptions
): Promise<void> {
    const action = await buildAction({
        owner,
        entityId: ctx.entityId,
        nexusId,
        cargoId,
        quantity,
    })
    const result = await transact(
        {action},
        {description: `Wrapping ${quantity} of cargo ${cargoId} for ${owner}`}
    )
    await maybeAwaitAndPrint(ctx.entityId, options, result)
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
                'Requires: deployed entity at a nexus with loaders; caller owns the entity.\n' +
                    'Cargo is identified by its cargo-id (row primary key). Mints instantly.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # Wrap 5 units of cargo row 42 into an NFT for alice at nexus 3
  shiploadcli ship 1 wrap alice 3 42 5

Use \`shiploadcli ship N cargo\` to list cargo rows with their ids.`
            )
            .argument('<owner>', 'recipient account name')
            .argument(
                '<nexus-id>',
                'nexus entity id where the wrapping entity is located',
                parseUint64
            )
            .argument('<cargo-id>', 'cargo row id (primary key from the cargo table)', parseUint64)
            .argument('<quantity>', 'amount to wrap', parseUint64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (
                    owner: string,
                    nexusId: bigint,
                    cargoId: bigint,
                    quantity: bigint,
                    opts: WrapCliOptions
                ) => {
                    await runWrap(ctx, owner, nexusId, cargoId, quantity, opts)
                }
            ),
}
