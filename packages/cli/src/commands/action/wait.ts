import {Command} from 'commander'
import {ALL_ENTITY_TYPES} from '../../lib/args'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {AUTO_RESOLVE_OPTION, awaitAndPrint, TIMEOUT_OPTION} from '../../lib/wait'

export async function runWait(
    ctx: EntityContext,
    opts: {timeout?: number; autoResolve?: boolean}
): Promise<void> {
    await withValidation(() =>
        awaitAndPrint(ctx.entityType, ctx.entityId, {
            timeoutMs: opts.timeout,
            autoResolve: opts.autoResolve,
        })
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'wait',
    description: "Block until the entity's active task ends, then print post-state",
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('wait')
            .description("Block until the entity's active task ends, then print post-state")
            .addOption(TIMEOUT_OPTION)
            .addOption(AUTO_RESOLVE_OPTION)
            .action(async (opts: {timeout?: number; autoResolve?: boolean}) => {
                await runWait(ctx, opts)
            }),
}
