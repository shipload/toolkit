import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface BuildplotOpts {
    entityType: EntityTypeName
    entityId: bigint
    plotId: bigint
}

export async function buildAction(opts: BuildplotOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.buildplot(opts.entityId, opts.plotId)
}

interface BuildplotCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runBuildplot(
    ctx: EntityContext,
    plotId: bigint,
    options: BuildplotCliOptions
): Promise<void> {
    await withValidation(async () => {
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            plotId,
        })
        const result = await transact(
            {action},
            {
                description: `Building plot ${plotId} via ${ctx.entityType}:${ctx.entityId}`,
            }
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'buildplot',
    description: 'Finalize a Plot into its target structure once all recipe inputs are deposited',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('buildplot')
            .description(
                'Finalize a Plot into its target structure once all recipe inputs are deposited'
            )
            .addHelpText(
                'before',
                "Requires: this entity has a Crafter module, is at the Plot's coords, " +
                    'owns the Plot, and the Plot has every recipe input fully deposited.\n' +
                    'Duration scales with total input mass; energy cost is 0. ' +
                    'On resolve, the Plot row mutates in place into the target structure (same entity id).\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # Finalize plot 42 using ship 1 (ship 1 must be at the plot's coords)
  shiploadcli ship 1 buildplot 42

If the chain rejects with PLOT_NOT_FULL, inspect the Plot's cargo:
  shiploadcli plot 42`
            )
            .argument('<plot-id>', 'id of the Plot entity to finalize', parseUint64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(async (plotId: bigint, opts: BuildplotCliOptions) => {
                await runBuildplot(ctx, plotId, opts)
            }),
}
