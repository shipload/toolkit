import {existsSync} from 'node:fs'
import {SecretStore} from '@shipload/oracle'
import type {Command} from 'commander'
import {getChainId} from '../../lib/client'
import {loadOracleConfig} from '../../lib/config'
import {requireConfirm} from '../../lib/validate'

export function describeClear(storedChainIds: string[], rows: number, path: string): string {
    const tag = storedChainIds.length > 0 ? storedChainIds.join(', ') : 'no chain'
    return `clears ${rows} stored secret(s) tagged for ${tag} at ${path}; the beacon generates a new one on its next commit`
}

export function register(parent: Command): void {
    parent
        .command('reset')
        .description("Clear this oracle's stored commit/reveal secrets")
        .option('--confirm', 'confirm the reset', false)
        .action(async (opts: {confirm?: boolean}) => {
            const cfg = loadOracleConfig()
            if (!existsSync(cfg.storePath)) {
                console.log(`No secret store at ${cfg.storePath}. Nothing to reset.`)
                return
            }
            let chainId = ''
            try {
                chainId = await getChainId()
            } catch {
                chainId = ''
            }
            const store = new SecretStore(cfg.storePath, chainId)
            const before = store.describe()
            if (before.rows === 0) {
                store.close()
                console.log(`${cfg.storePath} has no stored secrets. Nothing to reset.`)
                return
            }
            requireConfirm(
                opts,
                'reset',
                describeClear(before.storedChainIds, before.rows, cfg.storePath)
            )
            store.reset()
            store.close()
            console.log(`Cleared ${before.rows} stored secret(s) at ${cfg.storePath}.`)
            console.log('Run `shiploadcli oracle status` to confirm, then start the beacon.')
        })
}
