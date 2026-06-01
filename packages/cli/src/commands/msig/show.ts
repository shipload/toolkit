import type {Command} from 'commander'
import {client} from '../../lib/client'
import {printProposalActions, readProposal} from '../../lib/msig/read'

export function register(parent: Command): void {
    parent
        .command('show')
        .description('Show a pending msig proposal and its approval status')
        .argument('<proposer>', 'account that created the proposal')
        .argument('<name>', 'proposal name')
        .action(async (proposer: string, name: string) => {
            const view = await readProposal(client, proposer, name)
            if (!view) {
                console.error(`No proposal "${name}" found under ${proposer}.`)
                process.exitCode = 1
                return
            }
            console.log(`Proposal: ${view.proposer} / ${view.name}`)
            console.log(`Tx hash:  ${view.hash}`)
            console.log('Actions:')
            await printProposalActions(client, view.transaction.actions, true)
            const provided = view.providedApprovals.map((l) => l.toString())
            const requested = view.requestedApprovals.map((l) => l.toString())
            console.log(`Approved by: ${provided.join(', ') || '(none yet)'}`)
            console.log(`Still needs: ${requested.join(', ') || '(none — ready to exec)'}`)
        })
}
