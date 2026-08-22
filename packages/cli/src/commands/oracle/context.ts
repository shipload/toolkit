import {
    cleanOldestReserveScope,
    completeReadyCharters,
    runMintReady,
    runOnce,
    settleReadyBallots,
    tendFund,
    SecretStore,
    type BallotDeps,
    type CharterReadyResult,
    type CleanResult,
    type FundDeps,
    type InfluenceDeps,
    type MaintenanceDeps,
    type MintReadyResult,
    type OracleDeps,
    type SessionLike,
    type TendResult,
    type TickResult,
    type VoteReadyResult,
} from '@shipload/oracle'
import {FundContract} from '@shipload/sdk'
import {Name, PrivateKey, UInt32, UInt64, type PublicKey} from '@wharfkit/antelope'
import {Session} from '@wharfkit/session'
import {WalletPluginPrivateKey} from '@wharfkit/wallet-plugin-privatekey'
import {chain, client, fundContractName, gameContractName, getShipload} from '../../lib/client'
import {loadOracleConfig, type OracleConfig} from '../../lib/config'
import {ValidationError} from '../../lib/validate'

export interface OracleContext {
    cfg: OracleConfig
    deps: OracleDeps
    maintenance: MaintenanceDeps
    influence: InfluenceDeps
    ballots: BallotDeps
    fund: FundDeps
    store: SecretStore
    close(): void
}

function wrapSession(rawSession: Session): SessionLike {
    return {
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
}

async function verifyOraclePermission(cfg: OracleConfig): Promise<void> {
    let pub: PublicKey
    try {
        pub = PrivateKey.from(cfg.privateKey).toPublic()
    } catch {
        throw new ValidationError(
            'The oracle private_key in your config is not a valid Antelope key.',
            'Regenerate it with `shiploadcli oracle keygen`, or fix the [oracle] private_key value.'
        )
    }
    let account: Awaited<ReturnType<typeof client.v1.chain.get_account>>
    try {
        account = await client.v1.chain.get_account(cfg.actor)
    } catch (err) {
        console.warn(
            `${new Date().toISOString()} warning: could not verify ${cfg.actor}@${cfg.permission} (${(err as Error).message}); proceeding`
        )
        return
    }
    const perm = account.permissions.find((p) => String(p.perm_name) === cfg.permission)
    if (!perm) {
        throw new ValidationError(
            `Permission ${cfg.actor}@${cfg.permission} does not exist on chain.`,
            'Create the permission and wire your oracle key (updateauth + linkauth the commit/reveal/cleanrsvp actions), then run `shiploadcli oracle status` to confirm.'
        )
    }
    if (!perm.required_auth.keys.some((k) => k.key.equals(pub))) {
        throw new ValidationError(
            `Oracle key ${pub} is not wired to ${cfg.actor}@${cfg.permission}.`,
            'Add the key with updateauth (and linkauth the commit/reveal/cleanrsvp actions), then run `shiploadcli oracle status` to confirm.'
        )
    }
}

export async function buildOracleContext(): Promise<OracleContext> {
    const cfg = loadOracleConfig()
    await verifyOraclePermission(cfg)
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
    const session = wrapSession(rawSession)
    const rawFundSession = new Session(
        {
            chain,
            actor: fundContractName,
            permission: cfg.handle,
            walletPlugin: new WalletPluginPrivateKey(cfg.privateKey),
        },
        {fetch}
    )
    const fundSession = wrapSession(rawFundSession)
    const fundContract = new FundContract.Contract({client, account: Name.from(fundContractName)})
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
    const influence: InfluenceDeps = {
        reads: {
            getMintReady: () => shipload.influence.getMintReady(),
            getCharterReady: async () =>
                (await shipload.influence.getCharterReady()).map((w) => ({x: w.x, y: w.y})),
        },
        actions: {
            mintready: (maxMints) => shipload.actions.mintready(maxMints),
            charterready: (world) => shipload.actions.charterready({x: world.x, y: world.y}),
        },
        session,
    }
    const ballots: BallotDeps = {
        reads: {
            getVoteReady: () => shipload.influence.getVoteReady(),
        },
        actions: {
            voteready: (maxBallots) => shipload.actions.voteready(maxBallots),
        },
        session,
    }
    const fund: FundDeps = {
        reads: {
            getTendable: async (maxLots) => {
                const ids = (await fundContract.readonly('gettendable', {
                    max_lots: UInt32.from(maxLots),
                })) as UInt64[]
                return ids.map(Number)
            },
        },
        actions: {
            tend: (assetIds) =>
                fundContract.action('tend', {
                    asset_ids: assetIds.map((id) => UInt64.from(id)),
                }),
        },
        session: fundSession,
    }
    return {cfg, deps, maintenance, influence, ballots, fund, store, close: () => store.close()}
}

export async function tickOnce(ctx: OracleContext): Promise<TickResult> {
    return runOnce(ctx.deps)
}

export async function cleanOnce(ctx: OracleContext, maxRows: number): Promise<CleanResult> {
    return cleanOldestReserveScope(ctx.maintenance, maxRows)
}

export async function mintReadyOnce(
    ctx: OracleContext,
    maxMints?: number
): Promise<MintReadyResult> {
    return runMintReady(ctx.influence, maxMints)
}

export async function completeReadyChartersOnce(
    ctx: OracleContext,
    opts: {maxWorlds?: number} = {}
): Promise<CharterReadyResult> {
    return completeReadyCharters(ctx.influence, opts)
}

export async function settleReadyBallotsOnce(
    ctx: OracleContext,
    maxBallots = 0
): Promise<VoteReadyResult> {
    return settleReadyBallots(ctx.ballots, maxBallots)
}

export async function tendFundOnce(ctx: OracleContext, maxLots = 0): Promise<TendResult> {
    return tendFund(ctx.fund, maxLots)
}
