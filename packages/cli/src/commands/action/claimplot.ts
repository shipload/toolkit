import {isPlotBuildable, ServerTypes, type Shipload} from '@shipload/sdk'
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
    x: bigint
    y: bigint
}

export async function buildAction(opts: ClaimplotOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const coords = ServerTypes.coordinates.from({x: opts.x, y: opts.y})
    return sl.actions.claimplot(opts.entityId, opts.targetItemId, coords)
}

interface ClaimplotCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runClaimplot(
    ctx: EntityContext,
    targetItemId: number,
    x: bigint,
    y: bigint,
    options: ClaimplotCliOptions
): Promise<void> {
    await withValidation(async () => {
        if (!isPlotBuildable(targetItemId)) {
            throw new ValidationError(
                `item ${targetItemId} is not plot-buildable (plot is for planetary structures: warehouse, extractor, factory)`
            )
        }
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            targetItemId,
            x,
            y,
        })
        const result = await transact(
            {action},
            {
                description: `Claiming plot for item ${targetItemId} at (${x}, ${y}) via ${ctx.entityType}:${ctx.entityId}`,
            }
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'claimplot',
    description: 'Claim a Plot at coords for a planetary structure (warehouse/extractor/factory)',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('claimplot')
            .description(
                'Claim a Plot at coords for a planetary structure (warehouse/extractor/factory)'
            )
            .addHelpText(
                'before',
                'Requires: this entity has a Crafter module installed, is at <x> <y>, ' +
                    'and <x> <y> is a planet.\n' +
                    'On resolve, a new Plot entity is created at <x> <y> with capacity = sum of recipe input masses. ' +
                    'Then transfer recipe inputs into the Plot and run `buildplot` on the same entity.\n'
            )
            .addHelpText(
                'after',
                `
Examples:
  # Claim a Warehouse plot at (-7, 9) using ship 1 (must be at those coords)
  shiploadcli ship 1 claimplot 11 -7 9

  # Then deposit inputs (cargo refs are <item-id>:<stack-id>:<qty>) and build:
  shiploadcli ship 1 transfer plot 42 101:0:100000
  shiploadcli ship 1 buildplot 42

Find target item ids via \`shiploadcli recipe <item-id>\` or by browsing \`shiploadcli items\`.`
            )
            .argument('<target-item-id>', 'item id of the structure to build', parseUint16)
            .argument('<x>', 'plot X coordinate (entity must be at these coords)', parseInt64)
            .argument('<y>', 'plot Y coordinate (entity must be at these coords)', parseInt64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (targetItemId: number, x: bigint, y: bigint, opts: ClaimplotCliOptions) => {
                    await runClaimplot(ctx, targetItemId, x, y, opts)
                }
            ),
}
