import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'

export interface RefrshEntityOpts {
    entityType: EntityTypeName
    entityId: bigint
}

export async function buildAction(opts: RefrshEntityOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.refrshentity(opts.entityId)
}

export async function runRefrshEntity(ctx: EntityContext): Promise<void> {
    const action = await buildAction({entityType: ctx.entityType, entityId: ctx.entityId})
    await transact({action}, {description: `Refreshing ${ctx.entityType} ${ctx.entityId}`})
}

const HELP_BEFORE =
    'Recompute the cached capabilities and cargo mass on an entity. ' +
    "Run it when an entity's stats look stale after a contract update: its numbers no longer match what its modules should give. " +
    'Anyone can call it; the entity must be idle.\n'

function buildSubcommand(name: string, description: string): EntitySubcommand {
    return {
        name,
        description,
        appliesTo: ALL_ENTITY_TYPES,
        build: (ctx) =>
            new Command(name)
                .description(description)
                .addHelpText('before', HELP_BEFORE)
                .action(async () => {
                    await runRefrshEntity(ctx)
                }),
    }
}

export const SUBCOMMAND: EntitySubcommand = buildSubcommand(
    'refrshentity',
    'Refresh cached capabilities and cargomass on the entity'
)

export const SUBCOMMAND_REFRESHENTITY_ALIAS: EntitySubcommand = buildSubcommand(
    'refreshentity',
    'Refresh cached capabilities and cargomass on the entity (alias of refrshentity)'
)
