import {type Action, Name} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {addProposeOptions} from '../../lib/msig/options'
import {runAdminAction, serverAdminAction} from './index'

export function buildRemoveOracle(oracleId: string): Action {
    return serverAdminAction('removeoracle', {oracle_id: Name.from(oracleId)})
}

export function register(parent: Command): void {
    const cmd = parent
        .command('remove-oracle')
        .description('Unregister an oracle from the quorum')
        .argument('<oracle-id>', 'oracle account/handle to remove')
        .action(async (oracleId: string, _o, command: Command) => {
            await runAdminAction(command, buildRemoveOracle(oracleId), `Remove oracle ${oracleId}`)
        })
    addProposeOptions(cmd)
}
