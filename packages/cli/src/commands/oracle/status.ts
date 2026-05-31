import {existsSync} from 'node:fs'
import {SecretStore} from '@shipload/oracle'
import {PrivateKey, type PublicKey} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {client, gameContractName, getShipload, platform, server} from '../../lib/client'
import {hasOracleConfig, loadOracleConfig} from '../../lib/config'
import {renderStatus, type OraclePersonal, type OracleRow, type OracleStatusView} from './format'

function epochHeight(startMs: number, epochSeconds: number, nowMs: number): number {
    return Math.floor((nowMs - startMs) / (Math.max(1, epochSeconds) * 1000)) + 1
}

async function isKeyWired(actor: string, permission: string, pubkey: PublicKey): Promise<boolean> {
    try {
        const account = await client.v1.chain.get_account(actor)
        const perm = account.permissions.find((p) => String(p.perm_name) === permission)
        if (!perm) return false
        return perm.required_auth.keys.some((k) => k.key.equals(pubkey))
    } catch {
        return false
    }
}

async function loadPersonal(
    target: number | undefined,
    registeredHandles: string[]
): Promise<OraclePersonal | undefined> {
    if (!hasOracleConfig()) return undefined
    const cfg = loadOracleConfig()
    let pubkey = '(invalid private_key in config)'
    let keyWired = false
    try {
        const pub = PrivateKey.from(cfg.privateKey).toPublic()
        pubkey = String(pub)
        keyWired = await isKeyWired(cfg.actor, cfg.permission, pub)
    } catch {}
    let secretStored = false
    if (target !== undefined && existsSync(cfg.storePath)) {
        const store = new SecretStore(cfg.storePath)
        secretStored = store.getReveal(target) !== undefined
        store.close()
    }
    return {
        handle: cfg.handle,
        pubkey,
        keyWired,
        registered: registeredHandles.includes(cfg.handle),
        secretStored,
        storePath: cfg.storePath,
    }
}

export function register(parent: Command): void {
    parent
        .command('status')
        .description("Show the oracle quorum launch checklist and all oracles' commit/reveal state")
        .action(async () => {
            const shipload = await getShipload()
            const [stateR, gameR, oraclesR, thresholdR] = await Promise.allSettled([
                (async () => server.table('state').get())(),
                (async () => platform.table('games').get(gameContractName))(),
                shipload.epochs.getOracles(),
                shipload.epochs.getThreshold(),
            ])

            const stateRow = stateR.status === 'fulfilled' ? stateR.value : undefined
            const gameRow = gameR.status === 'fulfilled' ? gameR.value : undefined
            const quorumDeployed = oraclesR.status === 'fulfilled'
            const oracles = oraclesR.status === 'fulfilled' ? oraclesR.value : []
            const threshold = thresholdR.status === 'fulfilled' ? thresholdR.value : 0

            const stateInitialized = stateRow !== undefined
            const enabled = stateRow ? Boolean(stateRow.enabled) : false
            const epoch = stateRow ? Number(stateRow.epoch) : undefined
            const target = epoch !== undefined ? epoch + 1 : undefined
            const gameStarted = epoch !== undefined && epoch >= 1

            let epochClockSet = false
            let currentHeight: number | undefined
            if (gameRow) {
                epochClockSet = true
                currentHeight = epochHeight(
                    gameRow.config.start.toMilliseconds(),
                    Number(gameRow.config.epochtime),
                    Date.now()
                )
            }

            let committed = new Set<string>()
            let revealed = new Set<string>()
            if (quorumDeployed && target !== undefined) {
                const [commitsR, revealsR] = await Promise.allSettled([
                    shipload.epochs.getCommitsFor(target),
                    shipload.epochs.getRevealsFor(target),
                ])
                if (commitsR.status === 'fulfilled') {
                    committed = new Set(commitsR.value.map((c) => String(c.oracle_id)))
                }
                if (revealsR.status === 'fulfilled') {
                    revealed = new Set(revealsR.value.map((r) => String(r.oracle_id)))
                }
            }
            const rows: OracleRow[] = oracles.map((o) => ({
                handle: String(o.id),
                committed: committed.has(String(o.id)),
                revealed: revealed.has(String(o.id)),
            }))

            const view: OracleStatusView = {
                serverAccount: gameContractName,
                stateInitialized,
                enabled,
                epoch,
                gameStarted,
                epochClockSet,
                currentHeight,
                target,
                quorumDeployed,
                threshold,
                oracles: rows,
            }
            const mine = await loadPersonal(
                target,
                oracles.map((o) => String(o.id))
            )
            if (mine) view.mine = mine
            console.log(renderStatus(view))
        })
}
