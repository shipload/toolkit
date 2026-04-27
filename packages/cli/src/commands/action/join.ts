import type {Action} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {getShipload} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'

export interface JoinOpts {
    account: string
}

export async function buildAction(opts: JoinOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.join(opts.account)
}

export function register(program: Command): void {
    program
        .command('join')
        .description('Join the Shipload game')
        .addHelpText('before', 'Requires: company registered; not yet joined.\n')
        .action(async () => {
            const account = getAccountName()
            const action = await buildAction({account})
            await transact({action}, {description: `Joining game as ${account}`})
        })
}
