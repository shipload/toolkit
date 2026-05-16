import type {ServerTypes} from '@shipload/sdk'
import {type Action, Name} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {type EntityRef, parseEntityRefList, parseInt64} from '../../lib/args'
import {decideUseRecharge} from '../../lib/auto-recharge'
import {getShipload} from '../../lib/client'
import {renderEntityFull} from '../../lib/entity-header'
import {assertNotBoth, withValidation} from '../../lib/errors'
import {estimateGroupTravel} from '../../lib/estimate'
import {renderIssues} from '../../lib/feasibility'
import {renderEstimate} from '../../lib/render-estimate'
import {resolveGroupCompleted} from '../../lib/resolve-prompt'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {
    AUTO_RESOLVE_OPTION,
    maybeAwaitAndPrint,
    TRACK_OPTION,
    WAIT_OPTION,
    type WaitableOptions,
} from '../../lib/wait'

export interface GroupTravelOpts {
    entities: EntityRef[]
    x: bigint
    y: bigint
    recharge: boolean
}

export async function buildAction(opts: GroupTravelOpts): Promise<Action> {
    const shipload = await getShipload()
    const refs = opts.entities.map((e) => ({
        entityType: Name.from(e.entityType),
        entityId: e.entityId,
    }))
    return shipload.actions.grouptravel(refs, {x: opts.x, y: opts.y}, opts.recharge)
}

export function register(program: Command): void {
    program
        .command('grouptravel')
        .description('Travel multiple entities together (e.g., ship:1,container:2)')
        .addHelpText(
            'before',
            'Requires: all participants idle and at the same origin; lead ship has enough thrust for combined mass.\n'
        )
        .argument('<entities>', 'comma-separated entity refs (type:id)', parseEntityRefList)
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
        .action(
            async (
                entities: EntityRef[],
                x: bigint,
                y: bigint,
                options: WaitableOptions & {
                    recharge?: boolean
                    autoRecharge?: boolean
                    estimate?: boolean
                    force?: boolean
                }
            ) => {
                assertNotBoth(options, ['estimate', 'wait'], ['estimate', 'track'])
                const rechargeRequested = Boolean(options.recharge)
                const est = await withValidation(() =>
                    estimateGroupTravel({
                        entities,
                        target: {x, y},
                        recharge: rechargeRequested,
                    })
                )
                if (options.estimate) {
                    const body = renderEstimate(est)
                    const issues = est.feasibility.issues
                    console.log(issues.length > 0 ? `${renderIssues(issues)}\n${body}` : body)
                    return
                }
                const useRecharge = await decideUseRecharge({
                    rechargeRequested,
                    autoRecharge: Boolean(options.autoRecharge),
                    baseEstimate: est,
                    reestimateWithRecharge: () =>
                        estimateGroupTravel({
                            entities,
                            target: {x, y},
                            recharge: true,
                        }),
                })
                if (!useRecharge && !est.feasibility.ok) {
                    console.error(renderIssues(est.feasibility.issues))
                    if (!options.force) process.exit(1)
                }
                const action = await buildAction({
                    entities,
                    x,
                    y,
                    recharge: useRecharge,
                })
                const result = await transact(
                    {action},
                    {description: `Group travel to (${x}, ${y})`}
                )
                const shouldRender = Boolean(options.wait || options.track)
                await maybeAwaitAndPrint(
                    entities[0].entityId,
                    {wait: options.wait, track: options.track, autoResolve: false},
                    result
                )
                if (shouldRender) {
                    const snaps = await Promise.all(
                        entities.slice(1).map((ref) => getEntitySnapshot(ref.entityId))
                    )
                    for (const snap of snaps) {
                        console.log(renderEntityFull(snap as unknown as ServerTypes.entity_info))
                    }
                }
                const wantsAutoResolve = options.autoResolve ?? shouldRender
                if (wantsAutoResolve && shouldRender) {
                    await resolveGroupCompleted(entities)
                }
            }
        )
}
