import {isPlotBuildable, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseInt64, parseUint16} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface ClaimplotOpts {
    entityType: EntityTypeName
    entityId: bigint
    targetItemId: number
    hubId: bigint
    gx: number
    gy: number
}

export async function buildAction(opts: ClaimplotOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.claimplot(opts.entityId, opts.targetItemId, {
        hub: opts.hubId,
        gx: opts.gx,
        gy: opts.gy,
    })
}

interface ClaimplotCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runClaimplot(
    ctx: EntityContext,
    targetItemId: number,
    hubId: bigint,
    gx: number,
    gy: number,
    options: ClaimplotCliOptions
): Promise<void> {
    await withValidation(async () => {
        if (!isPlotBuildable(targetItemId)) {
            throw new ValidationError(
                `item ${targetItemId} is not plot-buildable (plot is for orbital structures: warehouse, extractor, factory)`
            )
        }
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            targetItemId,
            hubId,
            gx,
            gy,
        })
        const result = await transact(
            {action},
            {
                description: `Claiming plot for item ${targetItemId} in hub ${hubId} cell (${gx}, ${gy}) via ${ctx.entityType}:${ctx.entityId}`,
            }
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'claimplot',
    description: 'Claim a Plot in a station hub cell for an orbital structure',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('claimplot')
            .description('Claim a Plot in a station hub cell for an orbital structure')
            .addHelpText(
                'before',
                'Requires: this entity has a Crafter module installed, is idle, and the target ' +
                    'cell <gx> <gy> is a free cell in hub <hub-id> footprint.\n' +
                    'Creates a new Plot entity immediately in that cell (capacity = sum of recipe input masses) ' +
                    'and prints its id. Then unload recipe inputs into the Plot and run `buildplot` on the same entity.\n'
            )
            .addHelpText(
                'after',
                `
Examples:
  # Claim a Warehouse plot in hub 5 at cell (-1, 0) using ship 1
  shiploadcli ship 1 claimplot 11 5 -1 0

  # Then deposit inputs (cargo refs are <item-id>:<stack-id>:<qty>) and build:
  shiploadcli ship 1 unload plot 42 101:0:100000
  shiploadcli ship 1 buildplot 42

Find target item ids via \`shiploadcli recipe <item-id>\` or by browsing \`shiploadcli items\`.`
            )
            .argument('<target-item-id>', 'item id of the structure to build', parseUint16)
            .argument('<hub-id>', 'entity id of the station hub to build in', parseInt64)
            .argument('<gx>', 'footprint cell X offset within the hub', parseInt64)
            .argument('<gy>', 'footprint cell Y offset within the hub', parseInt64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (
                    targetItemId: number,
                    hubId: bigint,
                    gx: bigint,
                    gy: bigint,
                    opts: ClaimplotCliOptions
                ) => {
                    await runClaimplot(ctx, targetItemId, hubId, Number(gx), Number(gy), opts)
                }
            ),
}
