import {isPlotBuildable, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseInt64, parseUint16} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface ClaimplotOpts {
    targetItemId: number
    hubId: bigint
    gx: number
    gy: number
}

export async function buildAction(opts: ClaimplotOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.claimplot(opts.targetItemId, {
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
    gx: number,
    gy: number,
    options: ClaimplotCliOptions
): Promise<void> {
    const hubId = ctx.entityId
    await withValidation(async () => {
        if (!isPlotBuildable(targetItemId)) {
            throw new ValidationError(
                `item ${targetItemId} is not plot-buildable (plot is for orbital structures: warehouse, extractor, factory)`
            )
        }
        const action = await buildAction({
            targetItemId,
            hubId,
            gx,
            gy,
        })
        const result = await transact(
            {action},
            {
                description: `Claiming plot for item ${targetItemId} in hub ${hubId} cell (${gx}, ${gy})`,
            }
        )
        await maybeAwaitAndPrint(hubId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'claimplot',
    description: 'Claim a Plot in a cell of this hub for an orbital structure',
    appliesTo: ['hub'],
    build: (ctx) =>
        new Command('claimplot')
            .description('Claim a Plot in a cell of this hub for an orbital structure')
            .addHelpText(
                'before',
                'Requires: you own this hub and cell <gx> <gy> is a free cell in its footprint. ' +
                    'No ship needs to be at the station.\n' +
                    'Creates a new Plot entity immediately in that cell and prints its id. Then unload recipe ' +
                    'inputs into the Plot and run `buildplot` from a ship with an Assembly Arm at the station.\n'
            )
            .addHelpText(
                'after',
                `
Examples:
  # Claim a Warehouse plot in hub 5 at cell (-1, 0)
  shiploadcli hub 5 claimplot 11202 -1 0

  # Then deposit inputs (cargo refs are <item-id>:<stack-id>:<qty>) and build:
  shiploadcli ship 1 unload plot 42 101:0:100000
  shiploadcli ship 1 buildplot 42

Find target item ids via \`shiploadcli recipe <item-id>\` or by browsing \`shiploadcli items\`.`
            )
            .argument('<target-item-id>', 'item id of the structure to build', parseUint16)
            .argument('<gx>', 'footprint cell X offset within the hub', parseInt64)
            .argument('<gy>', 'footprint cell Y offset within the hub', parseInt64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (targetItemId: number, gx: bigint, gy: bigint, opts: ClaimplotCliOptions) => {
                    await runClaimplot(ctx, targetItemId, Number(gx), Number(gy), opts)
                }
            ),
}
