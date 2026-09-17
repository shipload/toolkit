import {Int64, type Action, type Asset, type Name} from '@wharfkit/antelope'
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
    voteready(maxPages: number): Action
}

export interface BallotDeps {
    reads: BallotReads
    actions: BallotActions
    session: SessionLike
}

export interface FundReads {
    getTendable(maxLots: number): Promise<number[]>
    getUncollected(): Promise<{tokenContract: Name; balance: Asset}[]>
    getAcceptedTokens(): Promise<{tokenContract: Name; symbol: Asset.Symbol}[]>
    hasBeneficiaries(): Promise<boolean>
}

export interface FundActions {
    tend(assetIds: number[]): Action
    collect(): Action
    collectFees(): Action
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
    | {kind: 'settled'; due: number; maxPages: number}
    | {kind: 'none-due'; pending: number}

export type TendResult = {kind: 'tended'; assetIds: number[]} | {kind: 'nothing-tendable'}

export type CollectResult =
    | {kind: 'collected'; source: 'platform' | 'market'}
    | {kind: 'nothing-collectable'}

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

export async function settleReadyBallots(deps: BallotDeps, maxPages = 0): Promise<VoteReadyResult> {
    const due = await deps.reads.getVoteReady()
    if (due === 0) return {kind: 'none-due', pending: 0}
    await deps.session.transact({action: deps.actions.voteready(maxPages)})
    return {kind: 'settled', due, maxPages}
}

export async function tendFund(deps: FundDeps, maxLots = 0): Promise<TendResult> {
    const assetIds = await deps.reads.getTendable(maxLots)
    if (assetIds.length === 0) return {kind: 'nothing-tendable'}
    await deps.session.transact({action: deps.actions.tend(assetIds)})
    return {kind: 'tended', assetIds}
}

export async function collectFund(deps: FundDeps): Promise<CollectResult> {
    const balances = (await deps.reads.getUncollected()).filter((row) =>
        row.balance.units.gt(Int64.from(0))
    )
    if (balances.length === 0) return {kind: 'nothing-collectable'}
    const tokens = await deps.reads.getAcceptedTokens()
    const collectable = balances.some((row) =>
        tokens.some(
            (token) =>
                token.tokenContract.equals(row.tokenContract) &&
                token.symbol.equals(row.balance.symbol)
        )
    )
    if (!collectable) return {kind: 'nothing-collectable'}
    // The contract accepts custody without accruing anything when the split is empty.
    if (!(await deps.reads.hasBeneficiaries())) {
        throw new Error(
            'Fund has no beneficiaries; platform collection skipped to preserve uncollected fees'
        )
    }
    await deps.session.transact({action: deps.actions.collect()})
    return {kind: 'collected', source: 'platform'}
}

export async function collectFundFees(deps: FundDeps): Promise<CollectResult> {
    await deps.session.transact({action: deps.actions.collectFees()})
    return {kind: 'collected', source: 'market'}
}
