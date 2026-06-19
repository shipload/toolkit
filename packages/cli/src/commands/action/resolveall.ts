import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {getShipload} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'

export interface ResolveAllOpts {
    owner: string
}

export async function buildAction(opts: ResolveAllOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.resolveall(opts.owner)
}

export function register(program: Command): void {
    program
        .command('resolveall [owner]')
        .description('Resolve every resolvable entity an owner has in one transaction')
        .addHelpText(
            'before',
            'Resolves all entities with completed tasks for the owner (default: your account). All-or-nothing — a very large fleet may exceed the transaction CPU limit.\n'
        )
        .action(async (ownerArg: string | undefined) => {
            const owner = ownerArg ?? getAccountName()
            const action = await buildAction({owner})
            await transact({action}, {description: `Resolving all entities for ${owner}`})
        })
}
