import type {Command} from 'commander'
import {client} from '../../lib/client'
import {getMsigContract} from '../../lib/msig/contract'
import {getSession, transact} from '../../lib/session'

export function register(parent: Command): void {
    parent
        .command('cancel')
        .description('Cancel a msig proposal you created (or any expired proposal)')
        .argument('<proposer>', 'account that created the proposal')
        .argument('<name>', 'proposal name')
        .action(async (proposer: string, name: string) => {
            const session = getSession()
            const msig = await getMsigContract(client)
            const action = msig.action(
                'cancel',
                {proposer, proposal_name: name, canceler: session.actor},
                {authorization: [session.permissionLevel]}
            )
            await transact({action}, {description: `Cancelled proposal ${proposer}/${name}`})
        })
}
