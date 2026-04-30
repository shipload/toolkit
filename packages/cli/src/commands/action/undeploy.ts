import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {type EntityTypeName, parseEntityType, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface UndeployOpts {
    hostType: EntityTypeName
    hostId: bigint
    targetType: EntityTypeName
    targetId: bigint
}

export async function buildAction(opts: UndeployOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.undeploy(
        {entityType: opts.hostType, entityId: opts.hostId},
        {entityType: opts.targetType, entityId: opts.targetId}
    )
}

interface UndeployCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runUndeploy(
    ctx: EntityContext,
    targetType: EntityTypeName,
    targetId: bigint,
    options: UndeployCliOptions
): Promise<void> {
    await withValidation(async () => {
        const action = await buildAction({
            hostType: ctx.entityType,
            hostId: ctx.entityId,
            targetType,
            targetId,
        })
        const result = await transact(
            {action},
            {
                description: `Undeploying ${targetType}:${targetId} into ${ctx.entityType}:${ctx.entityId}`,
            }
        )
        await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'undeploy',
    description: "Pack a deployed entity back into this entity's cargo",
    appliesTo: ['ship', 'warehouse'],
    build: (ctx) =>
        new Command('undeploy')
            .description("Pack a deployed entity back into this entity's cargo")
            .addHelpText(
                'before',
                'Requires: target at same coords; target empty (cargo + schedule); host has capacity for packed mass.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # ship 1 packs ship 2 (both at the same coords) back into ship 1's cargo
  shiploadcli ship 1 undeploy ship 2
`
            )
            .argument('<target_type>', 'Target entity type (ship|container)', parseEntityType)
            .argument('<target_id>', 'Target entity id', parseUint64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (targetType: EntityTypeName, targetId: bigint, opts: UndeployCliOptions) => {
                    await runUndeploy(ctx, targetType, targetId, opts)
                }
            ),
}
