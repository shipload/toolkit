import {cargoItem, type ServerTypes, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseCargoInput, parseUint64} from '../../lib/args'
import {parseModulesJson} from '../../lib/cargo-build'
import type {ParsedCargoInput} from '../../lib/cargo-resolve'
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
    return sl.actions.wrap(opts.owner, opts.entityId, opts.nexusId, [item])
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
    input: ParsedCargoInput,
    options: WrapCliOptions
): Promise<void> {
    const action = await buildAction({
        owner,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        nexusId,
        itemId: BigInt(input.itemId),
        stackId: input.stackId,
        quantity: BigInt(input.quantity),
        modules: parseModulesJson(options.modules),
    })
    const result = await transact(
        {action},
        {description: `Wrapping ${input.quantity} cargo for ${owner}`}
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
                'Requires: deployed entity at a nexus with cargo; caller owns the entity.\n' +
                    'Cargo is identified by <item-id>:<stack-id>:<qty> — packed-entity stacks may also need --modules.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # Wrap 5 of item 7 (stack 0) into an NFT for alice
  shiploadcli ship 1 wrap alice 99 7:0:5

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`
            )
            .argument('<owner>', 'recipient account name')
            .argument('<nexus-id>', 'nexus id (entity must be at this nexus)', parseUint64)
            .argument('<input>', '<item-id>:<stack-id>:<qty> — cargo to wrap.', parseCargoInput)
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
                    input: ParsedCargoInput,
                    opts: WrapCliOptions
                ) => {
                    await runWrap(ctx, owner, nexusId, input, opts)
                }
            ),
}
