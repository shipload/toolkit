import type {Action, Checksum256, Name, UInt64} from '@wharfkit/antelope'

export type CommitOutcome = 'posted' | 'already-committed'
export type RevealOutcome =
    | 'posted'
    | 'already-revealed'
    | 'waiting-for-height'
    | 'just-committed'
    | 'waiting-for-commits'
    | 'waiting-for-finality'
    | 'missing-secret'

export type CloseOutcome = 'not-due' | 'posted' | 'failed'

export type TickEta = {kind: 'boundary' | 'finality'; seconds: number}

export interface TickResult {
    target: number
    currentHeight: number
    commit: CommitOutcome
    reveal: RevealOutcome
    close: CloseOutcome
    eta?: TickEta
}

export interface EpochReads {
    getFinalizedEpoch(): Promise<UInt64>
    getCurrentHeight(): Promise<UInt64>
    getTimeRemaining(): Promise<number>
    getCommitsFor(epoch: number): Promise<{oracle_id: Name}[]>
    getRevealsFor(epoch: number): Promise<{oracle_id: Name}[]>
    getEpochThreshold(epoch: number): Promise<number>
    getSecondsUntilClose(epoch: number): Promise<number>
    getChainInfo(): Promise<{headBlock: number; libBlock: number}>
}

export interface ActionBuilders {
    commit(oracleId: Name, epoch: number, commit: Checksum256): Action
    reveal(oracleId: Name, epoch: number, reveal: Checksum256): Action
    closeepoch(epoch: number): Action
}

export interface SessionLike {
    transact(args: {action: Action}): Promise<{block_num?: number}>
}

export interface SecretStoreLike {
    getOrCreate(epoch: number): {commit: Checksum256; reveal: Checksum256}
    getReveal(epoch: number): Checksum256 | undefined
    getCommitBlock(epoch: number): number | undefined
    recordCommitBlock(epoch: number, block: number): void
}

export interface OracleDeps {
    epochs: EpochReads
    actions: ActionBuilders
    session: SessionLike
    oracleId: Name
    store: SecretStoreLike
}

export async function runOnce(deps: OracleDeps): Promise<TickResult> {
    const {epochs, actions, session, oracleId, store} = deps
    const [finalizedU, currentHeightU] = await Promise.all([
        epochs.getFinalizedEpoch(),
        epochs.getCurrentHeight(),
    ])
    const target = Number(finalizedU) + 1
    const currentHeight = Number(currentHeightU)

    const commits = await epochs.getCommitsFor(target)
    const alreadyCommitted = commits.some((r) => r.oracle_id.equals(oracleId))

    let commit: CommitOutcome
    if (alreadyCommitted) {
        commit = 'already-committed'
    } else {
        const {commit: hash} = store.getOrCreate(target)
        const res = await session.transact({action: actions.commit(oracleId, target, hash)})
        if (res?.block_num !== undefined) {
            store.recordCommitBlock(target, res.block_num)
        }
        commit = 'posted'
    }

    const {reveal, eta} = await resolveReveal(
        deps,
        target,
        currentHeight,
        commits.length,
        alreadyCommitted
    )

    const close = await resolveClose(deps, target, reveal)

    return {target, currentHeight, commit, reveal, close, eta}
}

async function resolveClose(
    deps: OracleDeps,
    target: number,
    reveal: RevealOutcome
): Promise<CloseOutcome> {
    if (reveal === 'posted' || reveal === 'waiting-for-height') return 'not-due'
    const {epochs, actions, session} = deps
    if ((await epochs.getSecondsUntilClose(target)) > 0) return 'not-due'
    try {
        await session.transact({action: actions.closeepoch(target)})
        return 'posted'
    } catch {
        return 'failed'
    }
}

async function resolveReveal(
    deps: OracleDeps,
    target: number,
    currentHeight: number,
    commitCount: number,
    alreadyCommitted: boolean
): Promise<{reveal: RevealOutcome; eta?: TickEta}> {
    const {epochs, actions, session, oracleId, store} = deps
    if (currentHeight < target) {
        const remaining = await epochs.getTimeRemaining()
        return {
            reveal: 'waiting-for-height',
            eta: {kind: 'boundary', seconds: Math.max(0, Math.round(remaining / 1000))},
        }
    }
    if (!alreadyCommitted) return {reveal: 'just-committed'}

    const reveals = await epochs.getRevealsFor(target)
    if (reveals.some((r) => r.oracle_id.equals(oracleId))) return {reveal: 'already-revealed'}

    const threshold = await epochs.getEpochThreshold(target)
    if (commitCount < threshold) return {reveal: 'waiting-for-commits'}

    const secret = store.getReveal(target)
    if (!secret) return {reveal: 'missing-secret'}

    let block = store.getCommitBlock(target)
    const info = await epochs.getChainInfo()
    if (block === undefined) {
        block = info.headBlock
        store.recordCommitBlock(target, block)
    }
    if (info.libBlock < block) {
        return {
            reveal: 'waiting-for-finality',
            eta: {kind: 'finality', seconds: Math.max(0, Math.ceil((block - info.libBlock) / 2))},
        }
    }

    await session.transact({action: actions.reveal(oracleId, target, secret)})
    return {reveal: 'posted'}
}
