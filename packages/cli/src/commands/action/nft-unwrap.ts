import {Name, UInt64} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import {getAccountName, getSession, transact} from '../../lib/session'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

const ATOMICASSETS_ACCOUNT = 'atomicassets'
const SERVER_ACCOUNT = 'shipload.gm'

interface UnwrapCliOptions {
    wait?: boolean
    track?: boolean
}

export function buildUnwrapCommand(): Command {
    return new Command('unwrap')
        .description("Deposit an NFT into a host entity's cargo")
        .addHelpText(
            'before',
            'Submits two actions in one transaction: atomicassets::transfer(memo="unwrap") + shipload.gm::unwrapnft.\n' +
                'Requires: caller owns the host entity; host has loaders; capacity headroom for the unwrapped mass.\n'
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli nft unwrap 1099511700123 6

Use \`shiploadcli nft\` to list NFTs and \`shiploadcli ship <id>\` / \`shiploadcli warehouse <id>\` to inspect hosts.`
        )
        .argument('<asset-id>', 'atomicassets asset id to unwrap', parseUint64)
        .argument('<host-id>', 'host entity id receiving the cargo', parseUint64)
        .addOption(WAIT_OPTION)
        .addOption(TRACK_OPTION)
        .action(async (assetId: bigint, hostId: bigint, opts: UnwrapCliOptions) => {
            const owner = getAccountName()
            const session = getSession()
            const sl = await getShipload()

            const transferAction = {
                account: ATOMICASSETS_ACCOUNT,
                name: 'transfer',
                authorization: [{actor: session.actor, permission: session.permission}],
                data: {
                    from: owner,
                    to: SERVER_ACCOUNT,
                    asset_ids: [UInt64.from(assetId)],
                    memo: 'unwrap',
                },
            }
            const unwrapnftAction = sl.actions.unwrapnft(
                Name.from(owner),
                UInt64.from(assetId),
                UInt64.from(hostId)
            )
            const result = await transact(
                {actions: [transferAction, unwrapnftAction]},
                {description: `Unwrapping NFT ${assetId} into host ${hostId}`}
            )
            await maybeAwaitAndPrint(hostId, opts, result)
        })
}
