import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseInt64} from '../../lib/args'
import {decideUseRecharge} from '../../lib/auto-recharge'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {assertNotBoth, withValidation} from '../../lib/errors'
import {estimateTravel} from '../../lib/estimate'
import {renderIssues} from '../../lib/feasibility'
import {renderEstimate, renderTravelSummary} from '../../lib/render-estimate'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {
    AUTO_RESOLVE_OPTION,
    maybeAwaitAndPrint,
    TRACK_OPTION,
    WAIT_OPTION,
    type WaitableOptions,
} from '../../lib/wait'

export interface TravelOpts {
    shipId: bigint
    x: bigint
    y: bigint
    recharge: boolean
}

export async function buildAction(opts: TravelOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.travel(opts.shipId, {x: opts.x, y: opts.y}, opts.recharge)
}

type TravelCliOptions = WaitableOptions & {
    recharge?: boolean
    autoRecharge?: boolean
    estimate?: boolean
    force?: boolean
}

export async function runTravel(
    ctx: EntityContext,
    x: bigint,
    y: bigint,
    options: TravelCliOptions
): Promise<void> {
    assertNotBoth(options, ['estimate', 'wait'], ['estimate', 'track'])
    const rechargeRequested = Boolean(options.recharge)
    const snap = await getEntitySnapshot(ctx.entityId)
    const est = await withValidation(() =>
        estimateTravel({
            entityId: ctx.entityId,
            target: {x, y},
            snapshot: snap,
            recharge: rechargeRequested,
        })
    )
    const summary = est.travel ? renderTravelSummary(est.travel, ctx.entityId) : null
    if (options.estimate) {
        const body = summary ?? renderEstimate(est)
        const issues = est.feasibility.issues
        console.log(issues.length > 0 ? `${renderIssues(issues)}\n${body}` : body)
        return
    }
    const useRecharge = await decideUseRecharge({
        rechargeRequested,
        autoRecharge: Boolean(options.autoRecharge),
        baseEstimate: est,
        reestimateWithRecharge: () =>
            estimateTravel({
                entityId: ctx.entityId,
                target: {x, y},
                snapshot: snap,
                recharge: true,
            }),
    })
    if (!useRecharge && !est.feasibility.ok) {
        console.error(renderIssues(est.feasibility.issues))
        if (!options.force) process.exit(1)
    }
    const action = await buildAction({
        shipId: ctx.entityId,
        x,
        y,
        recharge: useRecharge,
    })
    const result = await transact(
        {action},
        {description: summary ?? `Ship ${ctx.entityId} → (${x}, ${y})`}
    )
    if (!result.txid) return
    await maybeAwaitAndPrint(ctx.entityId, options, result)
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'travel',
    description: 'Travel the ship to coordinates',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('travel')
            .description('Travel the ship to coordinates')
            .addHelpText(
                'before',
                'Requires: idle ship; sufficient energy for flight; destination within map bounds.\n'
            )
            .argument('<x>', 'destination x', parseInt64)
            .argument('<y>', 'destination y', parseInt64)
            .option('--recharge', 'recharge to full energy before travelling')
            .option(
                '--auto-recharge',
                'recharge before travelling only when projected energy is insufficient (--recharge always recharges)'
            )
            .option('--estimate', 'print duration/energy/cargo estimate without submitting')
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .addOption(AUTO_RESOLVE_OPTION)
            .option('--force', 'submit despite failed feasibility checks (advanced)')
            .action(async (x: bigint, y: bigint, opts: TravelCliOptions) => {
                await runTravel(ctx, x, y, opts)
            }),
}
