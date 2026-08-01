import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {requireConfirm} from '../../lib/validate'

export async function buildAction(ctx: EntityContext): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.abandonplot(ctx.entityId)
}

interface AbandonplotCliOptions {
    confirm?: boolean
}

export async function runAbandonplot(
    ctx: EntityContext,
    options: AbandonplotCliOptions
): Promise<void> {
    await withValidation(async () => {
        requireConfirm(
            options,
            'abandon',
            'only an empty plot with no scheduled build can be abandoned'
        )
        const action = await buildAction(ctx)
        await transact(
            {action},
            {description: `Abandoning plot:${ctx.entityId} (PERMANENT — frees the station cell)`}
        )
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'abandon',
    description: 'Remove this empty plot and free its station cell.',
    appliesTo: ['plot'],
    build: (ctx) =>
        new Command('abandon')
            .description('Remove this empty plot and free its station cell. PERMANENT.')
            .addHelpText(
                'before',
                'Requires: no deposits, no scheduled build, no in-flight transfer.\nDeposited components are committed — a plot with deposits cannot be abandoned.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  shiploadcli plot 42 abandon --confirm
`
            )
            .option('--confirm', 'Required to actually submit (acknowledges permanence)')
            .action(async (opts: AbandonplotCliOptions) => {
                await runAbandonplot(ctx, opts)
            }),
}
