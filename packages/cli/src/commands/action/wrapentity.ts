import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {getAccountName, transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export async function buildAction(
    ctx: EntityContext,
    owner: string,
    nexusId: bigint
): Promise<Action[]> {
    const shipload = await getShipload()
    return shipload.actions.wrapEntity(owner, ctx.entityId, nexusId)
}

interface WrapEntityCliOptions {
    wait?: boolean
    track?: boolean
}

export async function runWrapEntity(
    ctx: EntityContext,
    nexusId: bigint,
    options: WrapEntityCliOptions
): Promise<void> {
    await withValidation(async () => {
        const owner = getAccountName()
        const actions = await buildAction(ctx, owner, nexusId)
        const result = await transact(
            {actions},
            {description: `Wrapping ${ctx.entityType}:${ctx.entityId} into NFT`}
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'wrapentity',
    description:
        'Wrap this deployed entity into an NFT (must be at a nexus, empty cargo + schedule)',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('wrapentity')
            .description('Wrap this deployed entity into an NFT')
            .addHelpText('before', 'Requires: at a nexus, empty cargo, empty schedule.\n')
            .addHelpText(
                'after',
                `
Example:
  shiploadcli ship 2 wrapentity 5
`
            )
            .argument('<nexus-id>', 'nexus id (entity must be at this nexus)', parseUint64)
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(async (nexusId: bigint, opts: WrapEntityCliOptions) => {
                await runWrapEntity(ctx, nexusId, opts)
            }),
}
