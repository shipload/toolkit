import {Name, UInt64} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseUint64} from '../../lib/args'
import {gameContractName, getShipload, platformContractName} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'
import {TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

interface DeployCliOptions {
    wait?: boolean
    track?: boolean
}

export function buildDeployCommand(): Command {
    return new Command('deploy')
        .description(
            'Deploy a packed-entity NFT as a live entity at the nexus where it was wrapped'
        )
        .addHelpText(
            'before',
            `Submits two actions in one transaction: atomicassets::transfer(to=${platformContractName}, memo="unwrap") + ${gameContractName}::placeentity.\n` +
                "The NFT is burned and a new entity row is emplaced at the NFT's Wrap Nexus. A ship with a generator\n" +
                'spawns at zero energy with a recharge task queued, which you can cancel.\n'
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli nft deploy 1099511700123

Use \`shiploadcli nft\` to list NFTs you own and their asset_ids.`
        )
        .argument('<asset-id>', 'atomicassets asset id to deploy', parseUint64)
        .addOption(WAIT_OPTION)
        .addOption(TRACK_OPTION)
        .action(async (assetId: bigint, _opts: DeployCliOptions) => {
            const owner = getAccountName()
            const sl = await getShipload()

            const actions = sl.actions.unwrapEntityTx(Name.from(owner), UInt64.from(assetId))
            await transact({actions}, {description: `Deploying NFT ${assetId} at its Wrap Nexus`})
        })
}
