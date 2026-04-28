import {type Action, Name} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {type EntityRef, parseEntityRefList, parseInt64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import {assertNotBoth, withValidation} from '../../lib/errors'
import {estimateGroupTravel} from '../../lib/estimate'
import {renderEstimate} from '../../lib/render-estimate'
import {transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

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
        .option(
            '--recharge',
            "chain a recharge task before travel via the contract's recharge:bool parameter"
        )
        .option('--estimate', 'print duration/energy/cargo estimate without submitting')
        .addOption(WAIT_OPTION)
        .addOption(TRACK_OPTION)
        .action(
            async (
                entities: EntityRef[],
                x: bigint,
                y: bigint,
                options: {
                    recharge?: boolean
                    estimate?: boolean
                    wait?: boolean
                    track?: boolean
                }
            ) => {
                assertNotBoth(options, ['estimate', 'wait'], ['estimate', 'track'])
                if (options.estimate) {
                    const est = await withValidation(() =>
                        estimateGroupTravel({
                            entities,
                            target: {x, y},
                            recharge: Boolean(options.recharge),
                        })
                    )
                    console.log(renderEstimate(est))
                    return
                }
                const action = await buildAction({
                    entities,
                    x,
                    y,
                    recharge: Boolean(options.recharge),
                })
                const result = await transact(
                    {action},
                    {description: `Group travel to (${x}, ${y})`}
                )
                await maybeAwaitAndPrint(
                    entities[0].entityType,
                    entities[0].entityId,
                    options,
                    result
                )
            }
        )
}
