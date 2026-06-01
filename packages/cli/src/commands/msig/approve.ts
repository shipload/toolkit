import type {Command} from 'commander'
import {client} from '../../lib/client'
import {getMsigContract} from '../../lib/msig/contract'
import {printProposalActions, readProposal} from '../../lib/msig/read'
import {confirm} from '../../lib/prompt'
import {getSession, transact} from '../../lib/session'

export function register(parent: Command): void {
    parent
        .command('approve')
        .description('Approve a pending msig proposal with the current account')
        .argument('<proposer>', 'account that created the proposal')
        .argument('<name>', 'proposal name')
        .option('--yes', 'skip the confirmation prompt')
        .action(async (proposer: string, name: string, opts: {yes?: boolean}) => {
            const view = await readProposal(client, proposer, name)
            if (!view) {
                console.error(`No proposal "${name}" found under ${proposer}.`)
                process.exitCode = 1
                return
            }
            console.log(`Approving ${proposer} / ${name}:`)
            await printProposalActions(client, view.transaction.actions)
            if (!(await confirm('Approve this proposal?', opts.yes))) {
                console.error('Aborted.')
                process.exitCode = 1
                return
            }
            const session = getSession()
            const msig = await getMsigContract(client)
            const action = msig.action(
                'approve',
                {
                    proposer,
                    proposal_name: name,
                    level: session.permissionLevel,
                    proposal_hash: view.hash,
                },
                {authorization: [session.permissionLevel]}
            )
            await transact({action}, {description: `Approved proposal ${proposer}/${name}`})
        })
}
