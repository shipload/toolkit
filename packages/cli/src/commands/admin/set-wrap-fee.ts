import {type Action, Name, UInt16} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parseUint16} from '../../lib/args'
import {addProposeOptions} from '../../lib/msig/options'
import {runAdminAction, serverAdminAction} from './index'

export function buildSetWrapFee(feePct: number, feeAccount: string): Action {
    return serverAdminAction('setwrapfee', {
        fee_pct: UInt16.from(feePct),
        fee_account: Name.from(feeAccount),
    })
}

export function register(parent: Command): void {
    const cmd = parent
        .command('set-wrap-fee')
        .description('Set the NFT wrap fee percentage and recipient account')
        .requiredOption('--fee-pct <n>', 'fee in basis points / contract units', parseUint16)
        .requiredOption('--fee-account <name>', 'account that receives the fee')
        .action(async (opts: {feePct: number; feeAccount: string}, command: Command) => {
            await runAdminAction(
                command,
                buildSetWrapFee(opts.feePct, opts.feeAccount),
                `Set wrap fee = ${opts.feePct} → ${opts.feeAccount}`
            )
        })
    addProposeOptions(cmd)
}
