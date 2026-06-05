import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, parseUint64} from '../../lib/args'
import {safeItemName} from '../../lib/cargo-table'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface WrapOpts {
    owner: string
    entityId: bigint
    nexusId: bigint
    cargoId: bigint
    quantity: bigint
    claimRam?: boolean
}

export async function buildAction(opts: WrapOpts, shipload?: Shipload): Promise<Action[]> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.wrap(opts.owner, opts.entityId, opts.nexusId, opts.cargoId, opts.quantity, {
        claimRam: opts.claimRam,
    })
}

interface WrapCliOptions {
    wait?: boolean
    track?: boolean
    claimRam?: boolean
}

export async function runWrap(
    ctx: EntityContext,
    owner: string,
    nexusId: bigint,
    cargoId: bigint,
    quantity: bigint,
    options: WrapCliOptions
): Promise<void> {
    const actions = await buildAction({
        owner,
        entityId: ctx.entityId,
        nexusId,
        cargoId,
        quantity,
        claimRam: options.claimRam,
    })
    const result = await transact(
        {actions},
        {
            description: `Wrapping ${quantity} of cargo ${cargoId} for ${owner}`,
            errorHint: async (msg) => {
                if (
                    !msg.includes('cargo') &&
                    !msg.includes('nexus') &&
                    !msg.includes('wrap') &&
                    !msg.includes('quantity')
                ) {
                    return undefined
                }
                let resolvedName: string | undefined
                try {
                    const snap = await getEntitySnapshot(ctx.entityId)
                    const row = snap.cargo.find((c) => c.id === cargoId)
                    if (row) resolvedName = safeItemName(Number(row.item_id))
                } catch {}
                const label = resolvedName
                    ? `${quantity}× ${resolvedName} (cargo row ${cargoId})`
                    : `${quantity} units from cargo row ${cargoId}`
                return `tried to wrap ${label} for ${owner} at nexus ${nexusId}`
            },
        }
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
            .option(
                '--claim-ram',
                'Force-bundle the atomicassets setlastpayer RAM claim into the wrap (on by default when the configured atomicassets account is non-canonical)'
            )
            .option(
                '--no-claim-ram',
                'Skip the bundled setlastpayer RAM claim, leaving the wrap gate set until the NFT is consumed or burned'
            )
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
