import {type Action, UInt8, UInt64} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parseUint64, parseUint8} from '../../lib/args'
import {addProposeOptions} from '../../lib/msig/options'
import {runAdminAction, serverAdminAction} from './index'

export function buildSetWrapCost(itemType: number, tier: number, amount: bigint): Action {
    return serverAdminAction('setwrapcost', {
        item_type: UInt8.from(itemType),
        tier: UInt8.from(tier),
        amount: UInt64.from(amount),
    })
}

export function register(parent: Command): void {
    const cmd = parent
        .command('set-wrap-cost')
        .description('Set the NFT wrap cost for an item type & tier')
        .requiredOption('--item-type <n>', 'item type', parseUint8)
        .requiredOption('--tier <n>', 'tier', parseUint8)
        .requiredOption('--amount <n>', 'cost amount (integer)', parseUint64)
        .action(
            async (opts: {itemType: number; tier: number; amount: bigint}, command: Command) => {
                await runAdminAction(
                    command,
                    buildSetWrapCost(opts.itemType, opts.tier, opts.amount),
                    `Set wrap cost (type ${opts.itemType}, tier ${opts.tier}) = ${opts.amount}`
                )
            }
        )
    addProposeOptions(cmd)
}
