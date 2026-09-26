import type {Action} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {getShipload} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'

export interface ClaimStarterOpts {
    account: string
}

export async function buildAction(opts: ClaimStarterOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.claimStarter(opts.account)
}

export function register(program: Command): void {
    program
        .command('claimstarter')
        .description('Claim the free starter ship (testnet only)')
        .addHelpText(
            'before',
            [
                'Testnet only: this action exists on the Jungle 4 deployment and will not exist on a real network.',
                'Mints a wrapped starter ship to your account. Deploy it to a nexus with `shiploadcli nft deploy`.',
                'Requires: one claim per account. Deploying it needs a joined player.',
                '',
            ].join('\n')
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli claimstarter
  shiploadcli nft                          # find the starter's asset id
  shiploadcli nft deploy <asset-id> <nexus-id>`
        )
        .action(async () => {
            const account = getAccountName()
            const action = await buildAction({account})
            await transact(
                {action},
                {
                    description: `Claiming starter ship for ${account}`,
                    errorHint: (msg) =>
                        msg.includes('already claimed')
                            ? 'Each account gets one starter ship. Run `shiploadcli nft` to find it.'
                            : undefined,
                }
            )
        })
}
