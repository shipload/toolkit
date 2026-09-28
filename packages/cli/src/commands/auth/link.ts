import {type API, PermissionLevel} from '@wharfkit/antelope'
import {Command} from 'commander'
import {chain, client} from '../../lib/client'
import {loadConfig} from '../../lib/config'
import {writeConfigKeys} from '../../lib/config-write'
import {EOSIO_AUTH_ABI} from '../../lib/auth/actions'
import {loadOrCreateKey} from '../../lib/auth/keyfile'
import {planPermissionLink} from '../../lib/auth/plan'
import {buildSigningLink} from '../../lib/auth/signing-link'

async function tryGetAccount(actor: string): Promise<API.v1.AccountObject | undefined> {
    try {
        return await client.v1.chain.get_account(actor)
    } catch {
        return undefined
    }
}

function abiLookup(account: string) {
    return account === 'eosio' ? EOSIO_AUTH_ABI : undefined
}

function registerPlatform(parent: Command): void {
    const cmd = new Command('platform')
        .description('Opt in a second restricted permission linked to the platform contract')
        .addHelpText('before', 'Precondition: `shiploadcli auth create` has run at least once.\n')
        .addHelpText('after', '\nExample: shiploadcli auth link platform\n')
        .action(async () => {
            const config = loadConfig()
            const {key, path, reused} = loadOrCreateKey(config.actor)
            console.log(
                reused
                    ? `Using the existing signing key at ${path}.`
                    : `Generated a new signing key at ${path} (mode 0600).`
            )
            const pubkey = key.toPublic()

            const account = await tryGetAccount(config.actor)
            const authorization = [PermissionLevel.from(`${config.actor}@active`)]
            const plan = planPermissionLink({
                actor: config.actor,
                permission: 'shipload.nex',
                parent: 'active',
                contract: config.platformContract,
                pubkey,
                account,
                authorization,
            })
            for (const message of plan.messages) console.log(message)

            const actions = [plan.updateAuth, plan.linkAuth].filter((a) => a !== undefined)
            if (actions.length > 0) {
                const {url, summary} = await buildSigningLink(
                    chain.id.toString(),
                    actions,
                    abiLookup,
                    config.webappUrl
                )
                console.log()
                console.log('Sign this with your wallet to finish setup:')
                console.log()
                console.log(url)
                console.log()
                for (const line of summary) console.log(line)
            }

            writeConfigKeys(config.source, {platform_permission: 'shipload.nex'})
            console.log()
            console.log(`Wrote platform_permission = shipload.nex to ${config.source}.`)
        })
    parent.addCommand(cmd)
}

export function register(parent: Command): void {
    const cmd = new Command('link').description('Link a restricted permission to a second contract')
    registerPlatform(cmd)
    parent.addCommand(cmd)
}
