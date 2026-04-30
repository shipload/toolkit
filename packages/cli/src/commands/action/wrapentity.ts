import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export async function buildAction(ctx: EntityContext): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.wrapEntity({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
    })
}

interface WrapEntityCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runWrapEntity(
    ctx: EntityContext,
    options: WrapEntityCliOptions
): Promise<void> {
    await withValidation(async () => {
        const action = await buildAction(ctx)
        const result = await transact(
            {action},
            {description: `Wrapping ${ctx.entityType}:${ctx.entityId} into NFT`}
        )
        await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'wrapentity',
    description:
        'Wrap this deployed entity into an NFT (must be at a nexus, empty cargo + schedule)',
    appliesTo: ['ship', 'container'],
    build: (ctx) =>
        new Command('wrapentity')
            .description('Wrap this deployed entity into an NFT')
            .addHelpText('before', 'Requires: at a nexus, empty cargo, empty schedule.\n')
            .addHelpText(
                'after',
                `
Example:
  shiploadcli ship 2 wrapentity
`
            )
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(async (opts: WrapEntityCliOptions) => {
                await runWrapEntity(ctx, opts)
            }),
}
