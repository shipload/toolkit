import {type Action, UInt8} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parseUint8} from '../../lib/args'
import {addProposeOptions} from '../../lib/msig/options'
import {runAdminAction, serverAdminAction} from './index'

export function buildSetThreshold(threshold: number): Action {
    return serverAdminAction('setthreshold', {threshold: UInt8.from(threshold)})
}

export function register(parent: Command): void {
    const cmd = parent
        .command('set-threshold')
        .description('Set the M-of-N oracle reveal quorum threshold')
        .argument('<n>', 'threshold value', parseUint8)
        .action(async (n: number, _o, command: Command) => {
            await runAdminAction(command, buildSetThreshold(n), `Set oracle threshold to ${n}`)
        })
    addProposeOptions(cmd)
}
