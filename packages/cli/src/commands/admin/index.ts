import {type Action, PermissionLevel} from '@wharfkit/antelope'
import type {ServerContract} from '@shipload/sdk'
import type {Command} from 'commander'
import {gameContractName, server} from '../../lib/client'
import {readProposeOptions} from '../../lib/msig/options'
import {transact} from '../../lib/session'
import * as addOracle from './add-oracle'
import * as removeOracle from './remove-oracle'
import * as setThreshold from './set-threshold'
import * as setWrapCost from './set-wrap-cost'
import * as setWrapFee from './set-wrap-fee'

/** Default authority for governance actions: the server contract account itself. */
export function contractAuthority(): PermissionLevel {
    return PermissionLevel.from(`${gameContractName}@active`)
}

/** Build a server-contract action authorized by the contract account. */
export function serverAdminAction<T extends ServerContract.ActionNames>(
    name: T,
    data: ServerContract.ActionNameParams[T]
): Action {
    return server.action(name, data, {authorization: [contractAuthority()]})
}

/** Broadcast an admin action — or, with --propose, wrap it in an eosio.msig proposal. */
export async function runAdminAction(
    command: Command,
    action: Action,
    description: string
): Promise<void> {
    await transact({action}, {description, propose: readProposeOptions(command.opts())})
}

export function register(program: Command): void {
    const parent = program
        .command('admin')
        .description('Contract administration actions (propose with --propose)')
    addOracle.register(parent)
    removeOracle.register(parent)
    setThreshold.register(parent)
    setWrapCost.register(parent)
    setWrapFee.register(parent)
}
