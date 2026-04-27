import {type Action, Int64, Name} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {server} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'

export interface ClaimStarterOpts {
    account: string
    x: number
    y: number
}

export function buildAction(opts: ClaimStarterOpts): Action {
    return server.action('claimstarter', {
        account: Name.from(opts.account),
        x: Int64.from(opts.x),
        y: Int64.from(opts.y),
    })
}

export function register(program: Command): void {
    program
        .command('claimstarter')
        .description('Claim a starter ship (testnet/debug builds only)')
        .addHelpText(
            'before',
            'Requires: joined player with no existing ships; contract built with DEBUG enabled.\n'
        )
        .argument('[x]', 'spawn x coordinate', (v) => Number.parseInt(v, 10), 0)
        .argument('[y]', 'spawn y coordinate', (v) => Number.parseInt(v, 10), 0)
        .action(async (x: number, y: number) => {
            const action = buildAction({account: getAccountName(), x, y})
            await transact(
                {action},
                {description: `Claiming starter ship for ${getAccountName()} at (${x}, ${y})`}
            )
        })
}
