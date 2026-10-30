import {Name, UInt64} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseUint64} from '../../lib/args'
import {atomicAssetsContractName, getShipload} from '../../lib/client'
import {getAccountName, transact} from '../../lib/session'

export function buildClaimCommand(): Command {
    return new Command('claim')
        .description('Claim RAM payment for a wrapped asset, releasing the wrap gate')
        .addHelpText(
            'before',
            `Submits ${atomicAssetsContractName}::setrampayer(new_payer=<you>, asset_id). Reassigns the asset's RAM payer to you and fires the logrampayer event that releases the wrap gate.\n` +
                'Requires: you own the asset and are not already its ram_payer.\n'
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli nft claim 1099511627778

Use \`shiploadcli nft\` to list your wrapped assets and their ram_payer.`
        )
        .argument('<asset-id>', 'atomicassets asset id to claim RAM for', parseUint64)
        .action(async (assetId: bigint) => {
            const owner = getAccountName()
            const sl = await getShipload()
            const action = sl.actions.setRamPayer(Name.from(owner), UInt64.from(assetId))
            await transact(
                {action},
                {description: `Claiming RAM payer of wrapped asset ${assetId} for ${owner}`}
            )
        })
}
