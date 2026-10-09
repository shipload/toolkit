import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parseInt64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import {ValidationError} from '../../lib/validate'
import {getAccountName, transact} from '../../lib/session'

export interface CollectOpts {
    player: string
    location?: {x: bigint; y: bigint}
}

export async function buildActions(opts: CollectOpts, shipload?: Shipload): Promise<Action[]> {
    const sl = shipload ?? (await getShipload())
    if (opts.location) return sl.shares.collect(opts.player, opts.location)
    return sl.shares.collectAll(opts.player)
}

export function register(program: Command): void {
    program
        .command('collect [x] [y]')
        .description("Collect your share of a world's scrap production into your SCRAP balance")
        .addHelpText(
            'before',
            'With coordinates, collects one world; without, collects every world with SCRAP ready. Opens your SCRAP balance first when it has none, which needs a wallet signature.\n'
        )
        .action(async (xArg: string | undefined, yArg: string | undefined) => {
            if ((xArg === undefined) !== (yArg === undefined)) {
                throw new ValidationError('give both x and y, or neither to collect every world')
            }
            const player = getAccountName()
            const location =
                xArg !== undefined && yArg !== undefined
                    ? {x: parseInt64(xArg), y: parseInt64(yArg)}
                    : undefined
            const actions = await buildActions({player, location})
            if (actions.length === 0) {
                console.log('No SCRAP is ready to collect.')
                return
            }
            const where = location ? `at ${location.x}, ${location.y}` : 'from every world'
            await transact({actions}, {description: `Collecting ${player}'s SCRAP ${where}`})
        })
}
