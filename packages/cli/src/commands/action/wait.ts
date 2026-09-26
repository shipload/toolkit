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
        awaitAndPrint(ctx.entityId, {
            timeoutMs: opts.timeout,
            autoResolve: opts.autoResolve,
        })
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'wait',
    description:
        'Block until the entity becomes idle (every queued task completes), auto-resolve completed tasks, then print post-state',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('wait')
            .description(
                'Block until the entity becomes idle (every queued task completes), auto-resolve completed tasks, then print post-state'
            )
            .addOption(TIMEOUT_OPTION)
            .addOption(AUTO_RESOLVE_OPTION)
            .addHelpText(
                'after',
                `
To pace a whole fleet, use the top-level \`shiploadcli wait\`: it returns when any (or with --all, every) entity is available.`
            )
            .action(async (opts: {timeout?: number; autoResolve?: boolean}) => {
                await runWait(ctx, opts)
            }),
}
