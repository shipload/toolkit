import {cargoItem, type ServerTypes, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {
    ALL_ENTITY_TYPES,
    type EntityTypeName,
    parseCargoInput,
    parseEntityType,
    parseUint64,
} from '../../lib/args'
import {parseModulesJson} from '../../lib/cargo-build'
import type {ParsedCargoInput} from '../../lib/cargo-resolve'
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
    modules?: ServerTypes.module_entry[]
}

export async function buildAction(opts: TransferOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const item = cargoItem(
        {
            item_id: Number(opts.itemId),
            stats: opts.stackId,
            modules: opts.modules ?? [],
        },
        opts.quantity
    )
    return sl.actions.transfer(opts.sourceId, opts.destId, [item])
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
    input: ParsedCargoInput,
    options: TransferCliOptions
): Promise<void> {
    const action = await buildAction({
        sourceType: ctx.entityType,
        sourceId: ctx.entityId,
        destType,
        destId,
        itemId: BigInt(input.itemId),
        stackId: input.stackId,
        quantity: BigInt(input.quantity),
        modules: parseModulesJson(options.modules),
    })
    const result = await transact(
        {action},
        {
            description: `Transferred ${input.quantity} of item ${input.itemId} from ${ctx.entityType}:${ctx.entityId} to ${destType}:${destId}`,
        }
    )
    await maybeAwaitAndPrint(ctx.entityId, options, result)
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
                    'Cargo is identified by <item-id>:<stack-id>:<qty> — packed-entity stacks may also need --modules.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # Transfer 100 of item 5 (stack 0) from ship 1 to warehouse 2
  shiploadcli ship 1 transfer warehouse 2 5:0:100

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`
            )
            .argument('<dest-type>', 'destination entity type', parseEntityType)
            .argument('<dest-id>', 'destination entity id', parseUint64)
            .argument('<input>', '<item-id>:<stack-id>:<qty> — cargo to transfer.', parseCargoInput)
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
                    input: ParsedCargoInput,
                    opts: TransferCliOptions
                ) => {
                    await runTransfer(ctx, destType, destId, input, opts)
                }
            ),
}
