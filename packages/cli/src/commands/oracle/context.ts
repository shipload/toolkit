import {
    cleanOldestReserveScope,
    runOnce,
    SecretStore,
    type CleanResult,
    type MaintenanceDeps,
    type OracleDeps,
    type SessionLike,
    type TickResult,
} from '@shipload/oracle'
import {Name} from '@wharfkit/antelope'
import {Session} from '@wharfkit/session'
import {WalletPluginPrivateKey} from '@wharfkit/wallet-plugin-privatekey'
import {chain, client, gameContractName, getShipload} from '../../lib/client'
import {loadOracleConfig, type OracleConfig} from '../../lib/config'

export interface OracleContext {
    cfg: OracleConfig
    deps: OracleDeps
    maintenance: MaintenanceDeps
    store: SecretStore
    close(): void
}

export async function buildOracleContext(): Promise<OracleContext> {
    const cfg = loadOracleConfig()
    const shipload = await getShipload()
    const rawSession = new Session(
        {
            chain,
            actor: cfg.actor,
            permission: cfg.permission,
            walletPlugin: new WalletPluginPrivateKey(cfg.privateKey),
        },
        {fetch}
    )
    const session: SessionLike = {
        transact: async ({action}) => {
            const result = await rawSession.transact({action})
            const processed = (result.response as {processed?: {block_num?: number}} | undefined)
                ?.processed
            return {
                block_num:
                    processed?.block_num !== undefined ? Number(processed.block_num) : undefined,
            }
        },
    }
    const store = new SecretStore(cfg.storePath)
    const oracleId = Name.from(cfg.handle)
    const deps: OracleDeps = {
        epochs: {
            getFinalizedEpoch: () => shipload.epochs.getFinalizedEpoch(true),
            getCurrentHeight: () => shipload.epochs.getCurrentHeight(),
            getCommitsFor: (epoch) => shipload.epochs.getCommitsFor(epoch),
            getRevealsFor: (epoch) => shipload.epochs.getRevealsFor(epoch),
            getEpochThreshold: async (epoch) => {
                const row = await shipload.epochs.getEpochRow(epoch)
                return row ? Number(row.threshold) : 0
            },
            getChainInfo: async () => {
                const info = await client.v1.chain.get_info()
                return {
                    headBlock: Number(info.head_block_num),
                    libBlock: Number(info.last_irreversible_block_num),
                }
            },
        },
        actions: {
            commit: (id, epoch, commit) => shipload.actions.commit(id, epoch, commit),
            reveal: (id, epoch, reveal) => shipload.actions.reveal(id, epoch, reveal),
        },
        session,
        oracleId,
        store,
    }
    const maintenance: MaintenanceDeps = {
        reads: {
            getFinalizedEpoch: () => shipload.epochs.getFinalizedEpoch(true),
            getReserveScopes: async () => {
                const res = await client.v1.chain.get_table_by_scope({
                    code: gameContractName,
                    table: 'reserve',
                    limit: 1000,
                })
                return res.rows.map((r) => ({
                    epoch: Number(r.scope.value.toString()),
                    count: Number(r.count),
                }))
            },
        },
        actions: {
            cleanrsvp: (epoch, maxRows) => shipload.actions.cleanrsvp(epoch, maxRows),
        },
        session,
    }
    return {cfg, deps, maintenance, store, close: () => store.close()}
}

export async function tickOnce(ctx: OracleContext): Promise<TickResult> {
    return runOnce(ctx.deps)
}

export async function cleanOnce(ctx: OracleContext, maxRows: number): Promise<CleanResult> {
    return cleanOldestReserveScope(ctx.maintenance, maxRows)
}
