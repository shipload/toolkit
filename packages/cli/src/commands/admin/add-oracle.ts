import {type Action, Name} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {addProposeOptions} from '../../lib/msig/options'
import {runAdminAction, serverAdminAction} from './index'

export function buildAddOracle(oracleId: string): Action {
    return serverAdminAction('addoracle', {oracle_id: Name.from(oracleId)})
}

export function register(parent: Command): void {
    const cmd = parent
        .command('add-oracle')
        .description('Register a new oracle in the commit/reveal quorum')
        .argument('<oracle-id>', 'oracle account/handle to add')
        .action(async (oracleId: string, _o, command: Command) => {
            await runAdminAction(command, buildAddOracle(oracleId), `Add oracle ${oracleId}`)
        })
    addProposeOptions(cmd)
}
