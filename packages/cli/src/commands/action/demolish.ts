import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export async function buildAction(ctx: EntityContext): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.demolish({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
    })
}

interface DemolishCliOptions {
    confirm?: boolean
    wait?: boolean
    track?: boolean
}

export async function runDemolish(ctx: EntityContext, options: DemolishCliOptions): Promise<void> {
    await withValidation(async () => {
        if (!options.confirm) {
            throw new ValidationError(
                `demolish is permanent. Add --confirm to proceed. ` +
                    `(modules and cargo must already be removed)`
            )
        }
        const action = await buildAction(ctx)
        const result = await transact(
            {action},
            {description: `Demolishing ${ctx.entityType}:${ctx.entityId} (PERMANENT)`}
        )
        await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'demolish',
    description: 'Permanently destroy this building. Modules and cargo must be removed first.',
    appliesTo: ['warehouse'],
    build: (ctx) =>
        new Command('demolish')
            .description(
                'Permanently destroy this building. PERMANENT — modules and cargo must be removed first.'
            )
            .addHelpText(
                'before',
                'Requires: empty cargo, no modules installed.\nThis is irreversible — the entity is destroyed.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  shiploadcli warehouse 1 demolish --confirm
`
            )
            .option('--confirm', 'Required to actually submit (acknowledges permanence)')
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(async (opts: DemolishCliOptions) => {
                await runDemolish(ctx, opts)
            }),
}
