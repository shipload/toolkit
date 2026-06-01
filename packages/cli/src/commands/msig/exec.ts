import type {Command} from 'commander'
import {client} from '../../lib/client'
import {getMsigContract} from '../../lib/msig/contract'
import {getSession, transact} from '../../lib/session'

export function register(parent: Command): void {
    parent
        .command('exec')
        .description('Execute a msig proposal once it has enough approvals')
        .argument('<proposer>', 'account that created the proposal')
        .argument('<name>', 'proposal name')
        .action(async (proposer: string, name: string) => {
            const session = getSession()
            const msig = await getMsigContract(client)
            const action = msig.action(
                'exec',
                {proposer, proposal_name: name, executer: session.actor},
                {authorization: [session.permissionLevel]}
            )
            await transact({action}, {description: `Executed proposal ${proposer}/${name}`})
        })
}
