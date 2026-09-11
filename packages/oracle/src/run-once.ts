import type {Action, Checksum256, Name, UInt64} from '@wharfkit/antelope'
import {classifyCloseRace, classifyCommitRace, classifyRevealRace} from './race'

export type CommitOutcome = 'posted' | 'already-committed' | 'window-closed' | 'epoch-closed'
export type RevealOutcome =
    | 'posted'
    | 'already-revealed'
    | 'waiting-for-height'
    | 'just-committed'
    | 'waiting-for-commits'
    | 'waiting-for-finality'
    | 'missing-secret'
    | 'no-commit'
    | 'epoch-finalized'

export type CloseOutcome = 'not-due' | 'posted' | 'failed' | 'raced'

export type TickEta = {kind: 'boundary' | 'finality'; seconds: number}

export interface TickResult {
    target: number
    currentHeight: number
    commit: CommitOutcome
    reveal: RevealOutcome
    close: CloseOutcome
    eta?: TickEta
}

export interface EpochState {
    threshold: number
    finalized: boolean
}

export interface EpochReads {
    getFinalizedEpoch(): Promise<UInt64>
    getCurrentHeight(): Promise<UInt64>
    getTimeRemaining(): Promise<number>
    getCommitsFor(epoch: number): Promise<{oracle_id: Name}[]>
    getRevealsFor(epoch: number): Promise<{oracle_id: Name}[]>
    getEpochState(epoch: number): Promise<EpochState>
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
    const {epochs, oracleId} = deps
    const [finalizedU, currentHeightU] = await Promise.all([
        epochs.getFinalizedEpoch(),
        epochs.getCurrentHeight(),
    ])
    const target = Number(finalizedU) + 1
    const currentHeight = Number(currentHeightU)

    const commits = await epochs.getCommitsFor(target)
    const alreadyCommitted = commits.some((r) => r.oracle_id.equals(oracleId))

    const commit = alreadyCommitted ? 'already-committed' : await postCommit(deps, target)

    const {reveal, eta} = await resolveReveal(deps, target, currentHeight, commits.length, {
        alreadyCommitted,
        commit,
    })

    const close = await resolveClose(deps, target, reveal)

    return {target, currentHeight, commit, reveal, close, eta}
}

async function postCommit(deps: OracleDeps, target: number): Promise<CommitOutcome> {
    const {epochs, actions, session, oracleId, store} = deps
    const reveals = await epochs.getRevealsFor(target)
    if (reveals.length > 0) return 'window-closed'
    const {commit: hash} = store.getOrCreate(target)
    try {
        const res = await session.transact({action: actions.commit(oracleId, target, hash)})
        if (res?.block_num !== undefined) {
            store.recordCommitBlock(target, res.block_num)
        }
        return 'posted'
    } catch (err) {
        const raced = classifyCommitRace(err)
        if (!raced) throw err
        return raced
    }
}

async function resolveClose(
    deps: OracleDeps,
    target: number,
    reveal: RevealOutcome
): Promise<CloseOutcome> {
    if (reveal === 'posted' || reveal === 'waiting-for-height') return 'not-due'
    if (reveal === 'epoch-finalized') return 'not-due'
    const {epochs, actions, session} = deps
    if ((await epochs.getSecondsUntilClose(target)) > 0) return 'not-due'
    try {
        await session.transact({action: actions.closeepoch(target)})
        return 'posted'
    } catch (err) {
        return classifyCloseRace(err) ?? 'failed'
    }
}

async function resolveReveal(
    deps: OracleDeps,
    target: number,
    currentHeight: number,
    commitCount: number,
    status: {alreadyCommitted: boolean; commit: CommitOutcome}
): Promise<{reveal: RevealOutcome; eta?: TickEta}> {
    const {epochs, actions, session, oracleId, store} = deps
    if (status.commit === 'epoch-closed') return {reveal: 'epoch-finalized'}
    if (status.commit === 'window-closed') return {reveal: 'no-commit'}
    if (currentHeight < target) {
        const remaining = await epochs.getTimeRemaining()
        return {
            reveal: 'waiting-for-height',
            eta: {kind: 'boundary', seconds: Math.max(0, Math.round(remaining / 1000))},
        }
    }
    if (!status.alreadyCommitted) return {reveal: 'just-committed'}

    const state = await epochs.getEpochState(target)
    if (state.finalized) return {reveal: 'epoch-finalized'}

    const reveals = await epochs.getRevealsFor(target)
    if (reveals.some((r) => r.oracle_id.equals(oracleId))) return {reveal: 'already-revealed'}

    if (commitCount < state.threshold) return {reveal: 'waiting-for-commits'}

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

    try {
        await session.transact({action: actions.reveal(oracleId, target, secret)})
    } catch (err) {
        const raced = classifyRevealRace(err)
        if (!raced) throw err
        return {reveal: raced}
    }
    return {reveal: 'posted'}
}
