import {Name, UInt64} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseUint64} from '../../lib/args'
import {gameContractName, getShipload} from '../../lib/client'
import {getAccountName, getSession, transact} from '../../lib/session'
import {TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

const ATOMICASSETS_ACCOUNT = 'atomicassets'
const SERVER_ACCOUNT = gameContractName

interface DeployCliOptions {
    wait?: boolean
    track?: boolean
}

export function buildDeployCommand(): Command {
    return new Command('deploy')
        .description('Deploy a packed-entity NFT directly to a nexus as a live entity')
        .addHelpText(
            'before',
            `Submits two actions in one transaction: atomicassets::transfer(memo="deploy") + ${SERVER_ACCOUNT}::deploynft.\n` +
                "The NFT is burned, a new entity row is emplaced at the NFT's wrap origin, and TASK_TRAVEL + TASK_RECHARGE\n" +
                'are queued to deliver the entity to the target nexus and recharge it to full.\n'
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli nft deploy 1099511700123 42

Use \`shiploadcli nft\` to list NFTs you own and their asset_ids.`
        )
        .argument('<asset-id>', 'atomicassets asset id to deploy', parseUint64)
        .argument('<nexus-id>', 'destination nexus id', parseUint64)
        .addOption(WAIT_OPTION)
        .addOption(TRACK_OPTION)
        .action(async (assetId: bigint, nexusId: bigint, _opts: DeployCliOptions) => {
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
                    memo: 'deploy',
                },
            }
            const deploynftAction = sl.actions.deploynft(
                Name.from(owner),
                UInt64.from(assetId),
                UInt64.from(nexusId)
            )
            await transact(
                {actions: [transferAction, deploynftAction]},
                {description: `Deploying NFT ${assetId} at nexus ${nexusId}`}
            )
        })
}
