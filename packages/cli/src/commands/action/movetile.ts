import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {type EntityTypeName, parseInt64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'

export interface MovetileOpts {
    entityType: EntityTypeName
    entityId: bigint
    fromGx: number
    fromGy: number
    toGx: number
    toGy: number
}

export async function buildAction(opts: MovetileOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.movetile(opts.entityId, opts.fromGx, opts.fromGy, opts.toGx, opts.toGy)
}

export async function runMovetile(
    ctx: EntityContext,
    fromGx: number,
    fromGy: number,
    toGx: number,
    toGy: number
): Promise<void> {
    await withValidation(async () => {
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            fromGx,
            fromGy,
            toGx,
            toGy,
        })
        await transact(
            {action},
            {
                description: `Moved tile (${fromGx},${fromGy}) -> (${toGx},${toGy}) in hub ${ctx.entityId}.`,
            }
        )
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'movetile',
    description: 'Move a structure to a different cell within this hub footprint',
    appliesTo: ['hub'],
    build: (ctx) =>
        new Command('movetile')
            .description('Move a structure to a different cell within this hub footprint')
            .addHelpText(
                'after',
                `
Example:
  # move the structure at cell (-1,-1) to the free cell (0,1) in hub 5
  shiploadcli hub 5 movetile -1 -1 0 1

Find cell coordinates with \`shiploadcli hub <id> cluster\`.`
            )
            .argument('<from-gx>', 'source cell X offset', parseInt64)
            .argument('<from-gy>', 'source cell Y offset', parseInt64)
            .argument('<to-gx>', 'destination cell X offset', parseInt64)
            .argument('<to-gy>', 'destination cell Y offset', parseInt64)
            .action(async (fromGx: bigint, fromGy: bigint, toGx: bigint, toGy: bigint) => {
                await runMovetile(ctx, Number(fromGx), Number(fromGy), Number(toGx), Number(toGy))
            }),
}
