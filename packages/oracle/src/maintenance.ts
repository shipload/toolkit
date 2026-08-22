import type {Action} from '@wharfkit/antelope'
import type {SessionLike} from './run-once'

export interface FoundedWorld {
    x: number
    y: number
}

export interface InfluenceReads {
    getMintReady(): Promise<number>
    getCharterReady(): Promise<FoundedWorld[]>
}

export interface InfluenceActions {
    mintready(maxMints?: number): Action
    charterready(world: FoundedWorld): Action
}

export interface InfluenceDeps {
    reads: InfluenceReads
    actions: InfluenceActions
    session: SessionLike
}

export interface BallotReads {
    getVoteReady(): Promise<number>
}

export interface BallotActions {
    voteready(maxBallots: number): Action
}

export interface BallotDeps {
    reads: BallotReads
    actions: BallotActions
    session: SessionLike
}

export interface FundReads {
    getTendable(maxLots: number): Promise<number[]>
}

export interface FundActions {
    tend(assetIds: number[]): Action
}

export interface FundDeps {
    reads: FundReads
    actions: FundActions
    session: SessionLike
}

export type MintReadyResult =
    | {kind: 'minted'; ready: number; maxMints?: number}
    | {kind: 'nothing-ready'}

export type CharterReadyResult =
    | {kind: 'completed'; worlds: FoundedWorld[]}
    | {kind: 'nothing-buildable'; examined: number}

export type VoteReadyResult =
    | {kind: 'settled'; due: number; maxBallots: number}
    | {kind: 'none-due'; pending: number}

export type TendResult = {kind: 'tended'; assetIds: number[]} | {kind: 'nothing-tendable'}

export async function runMintReady(
    deps: InfluenceDeps,
    maxMints?: number
): Promise<MintReadyResult> {
    const ready = await deps.reads.getMintReady()
    if (ready === 0) return {kind: 'nothing-ready'}
    await deps.session.transact({action: deps.actions.mintready(maxMints)})
    return {kind: 'minted', ready, maxMints}
}

export async function completeReadyCharters(
    deps: InfluenceDeps,
    opts: {maxWorlds?: number} = {}
): Promise<CharterReadyResult> {
    const ready = await deps.reads.getCharterReady()
    if (ready.length === 0) {
        return {kind: 'nothing-buildable', examined: 0}
    }
    const limit = opts.maxWorlds ?? ready.length
    const completed: FoundedWorld[] = []
    for (const world of ready.slice(0, limit)) {
        await deps.session.transact({action: deps.actions.charterready(world)})
        completed.push(world)
    }
    return {kind: 'completed', worlds: completed}
}

export async function settleReadyBallots(
    deps: BallotDeps,
    maxBallots = 0
): Promise<VoteReadyResult> {
    const due = await deps.reads.getVoteReady()
    if (due === 0) return {kind: 'none-due', pending: 0}
    await deps.session.transact({action: deps.actions.voteready(maxBallots)})
    return {kind: 'settled', due, maxBallots}
}

export async function tendFund(deps: FundDeps, maxLots = 0): Promise<TendResult> {
    const assetIds = await deps.reads.getTendable(maxLots)
    if (assetIds.length === 0) return {kind: 'nothing-tendable'}
    await deps.session.transact({action: deps.actions.tend(assetIds)})
    return {kind: 'tended', assetIds}
}
