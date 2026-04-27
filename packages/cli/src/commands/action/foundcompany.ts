import type {Action} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {getShipload} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'

export interface FoundCompanyOpts {
    account: string
    name: string
}

export async function buildAction(opts: FoundCompanyOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.foundCompany(opts.account, opts.name)
}

export function register(program: Command): void {
    program
        .command('foundcompany')
        .description('Create a new company on the platform')
        .addHelpText('before', 'Requires: no existing company for the caller.\n')
        .argument('<name>', 'company name')
        .action(async (name: string) => {
            const action = await buildAction({account: getAccountName(), name})
            await transact({action}, {description: `Founded company "${name}"`})
        })
}
