import {type Action, Name} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'

export interface ResolveOpts {
    entityType: EntityTypeName
    entityId: bigint
    count?: bigint
}

export async function buildAction(opts: ResolveOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.resolve(opts.entityId, Name.from(opts.entityType), opts.count)
}

export async function runResolve(ctx: EntityContext, opts: {count?: bigint}): Promise<void> {
    const action = await buildAction({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        count: opts.count,
    })
    await transact({action}, {description: `Resolving ${ctx.entityType} ${ctx.entityId}`})
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'resolve',
    description: 'Resolve completed tasks for the entity',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('resolve')
            .description('Resolve completed tasks for the entity')
            .addHelpText('before', 'Requires: entity with completed tasks.\n')
            .option(
                '--count <n>',
                'number of tasks to resolve (default: all completed)',
                parseUint64
            )
            .action(async (opts: {count?: bigint}) => {
                await runResolve(ctx, opts)
            }),
}
