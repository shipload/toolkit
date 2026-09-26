import {type API, PermissionLevel} from '@wharfkit/antelope'
import {Command} from 'commander'
import {chain, client} from '../../lib/client'
import {ConfigError, findConfigFile} from '../../lib/config'
import {writeConfigKeys} from '../../lib/config-write'
import {buildSigningLink} from '../../lib/auth/signing-link'
import {loadOrCreateKey} from '../../lib/auth/keyfile'
import {EOSIO_AUTH_ABI} from '../../lib/auth/actions'
import {planPermissionLink} from '../../lib/auth/plan'

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

export function register(parent: Command): void {
    const cmd = new Command('create')
        .description('Generate a restricted signing key linked to the game contract')
        .addHelpText(
            'before',
            'Precondition: config.ini has an `actor` set (run `shiploadcli init` first if not).\n' +
                'A player who puts their own full-permission key in config can skip this.\n'
        )
        .argument('[actor]', 'account to create the key for, if config.ini does not have one yet')
        .addHelpText('after', '\nExample: shiploadcli auth create\n')
        .action(async (actorArg: string | undefined) => {
            const {fileData, source} = findConfigFile()
            const actor = actorArg ?? fileData.actor
            if (!actor) {
                throw new ConfigError(
                    `No actor to create a key for. Pass one as an argument, or set 'actor' in ${source}.`
                )
            }
            const gameContract = fileData.gameContract ?? 'eon.shipload'

            const {key, path, reused} = loadOrCreateKey(actor)
            const pubkey = key.toPublic()
            console.log(
                reused
                    ? `Reusing the existing signing key at ${path}.`
                    : `Generated a new signing key at ${path} (mode 0600).`
            )
            console.log(`Public key: ${pubkey}`)
            console.log()

            const account = await tryGetAccount(actor)
            const authorization = [PermissionLevel.from(`${actor}@active`)]
            const plan = planPermissionLink({
                actor,
                permission: 'shipload',
                parent: 'active',
                contract: gameContract,
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
                    abiLookup
                )
                console.log()
                console.log('Sign this with your wallet to finish setup:')
                console.log()
                console.log(url)
                console.log()
                for (const line of summary) console.log(line)
            }

            const configUpdates: Record<string, string> = {server_permission: 'shipload'}
            if (!fileData.actor) configUpdates.actor = actor
            writeConfigKeys(source, configUpdates)
            console.log()
            console.log(`Wrote server_permission = shipload to ${source}.`)
        })
    parent.addCommand(cmd)
}
