import {type API, PermissionLevel, type Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {chain, client} from '../../lib/client'
import {loadConfig} from '../../lib/config'
import {writeConfigKeys} from '../../lib/config-write'
import {
    buildDeleteAuth,
    buildUnlinkAuth,
    buildUpdateAuth,
    EOSIO_AUTH_ABI,
} from '../../lib/auth/actions'
import {isAuthorityEmpty, removeKeyFromAuthority} from '../../lib/auth/authority'
import {hasKeyFile, readKeyFile} from '../../lib/auth/keyfile'
import {buildSigningLink} from '../../lib/auth/signing-link'

function abiLookup(account: string) {
    return account === 'eosio' ? EOSIO_AUTH_ABI : undefined
}

function planGameTierRevoke(
    account: API.v1.AccountObject,
    actor: string,
    contract: string,
    ourKey: string,
    authorization: PermissionLevel[]
): {actions: Action[]; messages: string[]} {
    const messages: string[] = []
    const perm = account.permissions.find(
        (p: API.v1.AccountPermission) => String(p.perm_name) === 'shipload'
    )
    if (!perm) {
        messages.push("Permission 'shipload' does not exist; nothing to revoke.")
        return {actions: [], messages}
    }
    const reduced = removeKeyFromAuthority(perm.required_auth, ourKey)
    if (reduced.keys.length === perm.required_auth.keys.length) {
        messages.push("Our key is not in 'shipload'; nothing to remove.")
        return {actions: [], messages}
    }
    if (isAuthorityEmpty(reduced)) {
        return {
            actions: [
                buildUnlinkAuth({account: actor, code: contract, type: ''}, authorization),
                buildDeleteAuth({account: actor, permission: 'shipload'}, authorization),
            ],
            messages,
        }
    }
    return {
        actions: [
            buildUpdateAuth(
                {account: actor, permission: 'shipload', parent: perm.parent, auth: reduced},
                authorization
            ),
        ],
        messages,
    }
}

function planPlatformTierRevoke(
    account: API.v1.AccountObject,
    actor: string,
    contract: string,
    authorization: PermissionLevel[]
): {actions: Action[]; messages: string[]} {
    const messages: string[] = []
    const perm = account.permissions.find(
        (p: API.v1.AccountPermission) => String(p.perm_name) === 'shipload.nex'
    )
    if (!perm) {
        messages.push("Permission 'shipload.nex' does not exist; nothing to revoke.")
        return {actions: [], messages}
    }
    return {
        actions: [
            buildUnlinkAuth({account: actor, code: contract, type: ''}, authorization),
            buildDeleteAuth({account: actor, permission: 'shipload.nex'}, authorization),
        ],
        messages,
    }
}

export function register(parent: Command): void {
    const cmd = new Command('revoke')
        .description("Remove this CLI's restricted permissions, keeping the local key file")
        .addHelpText('before', 'Precondition: `shiploadcli auth create` has run at least once.\n')
        .addHelpText('after', '\nExample: shiploadcli auth revoke\n')
        .action(async () => {
            const config = loadConfig()
            if (!hasKeyFile(config.actor)) {
                console.log(`No local signing key for ${config.actor}; nothing to revoke.`)
                return
            }
            const ourKey = String(readKeyFile(config.actor).toPublic())
            const account = await client.v1.chain.get_account(config.actor)
            const authorization = [PermissionLevel.from(`${config.actor}@active`)]

            const game = planGameTierRevoke(
                account,
                config.actor,
                config.gameContract,
                ourKey,
                authorization
            )
            const platform = planPlatformTierRevoke(
                account,
                config.actor,
                config.platformContract,
                authorization
            )
            for (const message of [...game.messages, ...platform.messages]) console.log(message)

            const actions = [...game.actions, ...platform.actions]
            if (actions.length > 0) {
                const {url, summary} = await buildSigningLink(
                    chain.id.toString(),
                    actions,
                    abiLookup,
                    config.webappUrl
                )
                console.log()
                console.log('Sign this with your wallet to finish revoking:')
                console.log()
                console.log(url)
                console.log()
                for (const line of summary) console.log(line)
            }

            writeConfigKeys(config.source, {platform_permission: undefined})
            console.log()
            console.log(
                `Cleared platform_permission from ${config.source}. The local key file was kept.`
            )
        })
    parent.addCommand(cmd)
}
