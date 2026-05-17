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
    'Recompute cached capabilities and cargomass on an entity. ' +
    'Use after a contract setcode that changes capability formulas — your displayed numbers will refresh to current contract math. ' +
    'Anyone can call; entity must be idle.\n'

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
