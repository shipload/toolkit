import type {Action} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {getShipload} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'

export interface FoundCompanyOpts {
    account: string
}

export async function buildAction(opts: FoundCompanyOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.foundCompany(opts.account, '')
}

export function register(program: Command): void {
    program
        .command('foundcompany')
        .description('Create a new company on the platform')
        .addHelpText('before', 'Requires: no existing company for the caller.\n')
        .action(async () => {
            const action = await buildAction({account: getAccountName()})
            await transact({action}, {description: 'Founded company'})
        })
}
