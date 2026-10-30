import {Name, UInt64} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseUint64} from '../../lib/args'
import {gameContractName, getShipload, platformContractName} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

interface UnwrapCliOptions {
    wait?: boolean
    track?: boolean
}

export function buildUnwrapCommand(): Command {
    return new Command('unwrap')
        .description("Deposit a wrapped item into a host entity's cargo")
        .addHelpText(
            'before',
            `Submits two actions in one transaction: atomicassets::transfer(to=${platformContractName}, memo="unwrap") + ${gameContractName}::placecargo.\n` +
                'Requires: caller owns the host ship or warehouse; host is at the Wrap Nexus where the item was wrapped; capacity headroom for the unwrapped mass.\n'
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli nft unwrap 1099511700123 6

Use \`shiploadcli nft\` to list wrapped assets and \`shiploadcli ship <id>\` / \`shiploadcli warehouse <id>\` to inspect hosts.`
        )
        .argument('<asset-id>', 'atomicassets asset id to unwrap', parseUint64)
        .argument('<host-id>', 'host entity id receiving the cargo', parseUint64)
        .addOption(WAIT_OPTION)
        .addOption(TRACK_OPTION)
        .action(async (assetId: bigint, hostId: bigint, opts: UnwrapCliOptions) => {
            const owner = getAccountName()
            const sl = await getShipload()

            const actions = sl.actions.unwrapCargoTx(
                Name.from(owner),
                UInt64.from(assetId),
                UInt64.from(hostId)
            )
            const result = await transact(
                {actions},
                {description: `Unwrapping wrapped asset ${assetId} into host ${hostId}`}
            )
            await maybeAwaitAndPrint(hostId, opts, result)
        })
}
