import {type Action, PermissionLevel} from '@wharfkit/antelope'
import type {ServerContract} from '@shipload/sdk'
import type {Command} from 'commander'
import {client, gameContractName, getShipload, server} from '../../lib/client'
import {checkLine} from '../../lib/format'
import {readProposeOptions} from '../../lib/msig/options'
import {type TransactResult, transact} from '../../lib/session'
import * as addOracle from './add-oracle'
import {MembershipAbort, type RegistrySnapshot} from './membership'
import * as offboardOracle from './offboard-oracle'
import * as onboardOracle from './onboard-oracle'
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

/** Broadcast several admin actions as one transaction, or as one eosio.msig proposal. */
export async function runAdminActions(
    command: Command,
    actions: Action[],
    description: string
): Promise<TransactResult> {
    return transact({actions}, {description, propose: readProposeOptions(command.opts())})
}

/** Read everything the oracle membership commands preflight against. */
export async function readRegistry(handle: string): Promise<RegistrySnapshot> {
    const shipload = await getShipload()
    const [stateRow, oracles, threshold, account] = await Promise.all([
        server.table('state').get(),
        shipload.epochs.getOracles(),
        shipload.epochs.getThreshold(),
        client.v1.chain.get_account(gameContractName),
    ]).catch((err: Error) => {
        throw new MembershipAbort(
            checkLine('Checking chain', `could not read ${gameContractName} (${err.message})`),
            'Nothing was sent.'
        )
    })
    const perm = account.permissions.find((p) => String(p.perm_name) === handle)
    return {
        contract: gameContractName,
        epoch: stateRow ? Number(stateRow.epoch) : 0,
        oracles: oracles.map((o) => String(o.id)),
        threshold,
        permissionKeys: perm ? perm.required_auth.keys.map((k) => String(k.key)) : undefined,
    }
}

/** Print a refusal and set a failing exit code. */
export function reportAbort(err: MembershipAbort): void {
    if (err.line) console.log(err.line)
    console.log('')
    console.error(err.advice)
    process.exitCode = 1
}

export function register(program: Command): void {
    const parent = program
        .command('admin')
        .description('Contract administration actions (propose with --propose)')
    onboardOracle.register(parent)
    offboardOracle.register(parent)
    setThreshold.register(parent)
    setWrapCost.register(parent)
    setWrapFee.register(parent)
    addOracle.register(parent)
    removeOracle.register(parent)
}
