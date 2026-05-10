import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import type {EntityTypeName} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {assertNotBoth, withValidation} from '../../lib/errors'
import {estimateRecharge} from '../../lib/estimate'
import {renderEstimate} from '../../lib/render-estimate'
import {transact} from '../../lib/session'
import {
    AUTO_RESOLVE_OPTION,
    maybeAwaitAndPrint,
    TRACK_OPTION,
    WAIT_OPTION,
    type WaitableOptions,
} from '../../lib/wait'

export interface RechargeOpts {
    entityType: EntityTypeName
    entityId: bigint
}

export async function buildAction(opts: RechargeOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.recharge(opts.entityId)
}

type RechargeCliOptions = WaitableOptions & {estimate?: boolean}

export async function runRecharge(ctx: EntityContext, opts: RechargeCliOptions): Promise<void> {
    assertNotBoth(opts, ['estimate', 'wait'], ['estimate', 'track'])
    if (opts.estimate) {
        const est = await withValidation(() =>
            estimateRecharge({
                entityId: ctx.entityId,
            })
        )
        console.log(renderEstimate(est))
        return
    }
    const action = await buildAction({entityType: ctx.entityType, entityId: ctx.entityId})
    const result = await transact(
        {action},
        {description: `Recharging ${ctx.entityType} ${ctx.entityId}`}
    )
    await maybeAwaitAndPrint(ctx.entityId, opts, result)
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'recharge',
    description: 'Recharge energy for the entity',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('recharge')
            .description('Recharge energy for the entity')
            .addHelpText('before', 'Requires: entity has a generator; energy below capacity.\n')
            .option('--estimate', 'print duration/energy estimate without submitting')
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .addOption(AUTO_RESOLVE_OPTION)
            .action(async (opts: RechargeCliOptions) => {
                await runRecharge(ctx, opts)
            }),
}
