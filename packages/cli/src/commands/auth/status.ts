import type {API} from '@wharfkit/antelope'
import {Command} from 'commander'
import {client} from '../../lib/client'
import {loadConfig} from '../../lib/config'
import {authorityHasKey} from '../../lib/auth/authority'
import {hasKeyFile, readKeyFile} from '../../lib/auth/keyfile'
import {isWildcardLink} from '../../lib/auth/plan'

function reportTier(
    account: API.v1.AccountObject,
    permission: string,
    contract: string,
    ourKey: string | undefined
): string[] {
    const lines: string[] = []
    const perm = account.permissions.find(
        (p: API.v1.AccountPermission) => String(p.perm_name) === permission
    )
    if (!perm) {
        lines.push(`${permission}: missing (no such permission on chain)`)
        return lines
    }
    lines.push(`${permission}: exists, parent ${perm.parent}`)
    if (ourKey) {
        const hasKey = authorityHasKey(perm.required_auth, ourKey)
        lines.push(`${permission}: ${hasKey ? 'holds' : 'does not hold'} our local signing key`)
    } else {
        lines.push(`${permission}: no local signing key to check against`)
    }
    if (perm.linked_actions === undefined) {
        lines.push(
            `${permission}: link to ${contract} could not be verified (nodeos did not report linked_actions)`
        )
    } else {
        const linked = perm.linked_actions.some(
            (l: API.v1.AccountLinkedAction) => String(l.account) === contract && isWildcardLink(l)
        )
        lines.push(`${permission}: ${linked ? 'linked' : 'not linked'} to ${contract}`)
    }
    return lines
}

export function register(parent: Command): void {
    const cmd = new Command('status')
        .description('Report whether the game and platform restricted permissions are set up')
        .addHelpText('before', 'Precondition: `actor` is set in config.ini.\n')
        .addHelpText('after', '\nExample: shiploadcli auth status\n')
        .action(async () => {
            const config = loadConfig()
            let account: API.v1.AccountObject
            try {
                account = await client.v1.chain.get_account(config.actor)
            } catch (err) {
                console.log(`${config.actor}: not found on chain (${(err as Error).message})`)
                process.exitCode = 1
                return
            }
            const ourKey = hasKeyFile(config.actor)
                ? String(readKeyFile(config.actor).toPublic())
                : undefined
            if (!ourKey) console.log('No local signing key found; run `shiploadcli auth create`.')
            console.log()
            for (const line of reportTier(account, 'shipload', config.gameContract, ourKey))
                console.log(line)
            console.log()
            for (const line of reportTier(account, 'shipload.nex', config.platformContract, ourKey))
                console.log(line)
        })
    parent.addCommand(cmd)
}
