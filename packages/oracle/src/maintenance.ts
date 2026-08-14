import type {Action} from '@wharfkit/antelope'
import type {SessionLike} from './run-once'

export interface FoundedWorld {
    x: number
    y: number
}

export interface CharterState {
    buildable: boolean
}

export interface InfluenceReads {
    getFoundedWorlds(): Promise<FoundedWorld[]>
    getCharter(world: FoundedWorld): Promise<CharterState>
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

export interface FundReads {
    getLotCount(): Promise<number>
}

export interface FundActions {
    tend(maxLots: number): Action
}

export interface FundDeps {
    reads: FundReads
    actions: FundActions
    session: SessionLike
}

export type MintReadyResult = {kind: 'poked'; maxMints?: number}

export type CharterReadyResult =
    | {kind: 'completed'; worlds: FoundedWorld[]}
    | {kind: 'nothing-buildable'; examined: number}

export type TendResult = {kind: 'tended'; maxLots: number} | {kind: 'no-lots'}

export async function pokeMintReady(
    deps: InfluenceDeps,
    maxMints?: number
): Promise<MintReadyResult> {
    await deps.session.transact({action: deps.actions.mintready(maxMints)})
    return {kind: 'poked', maxMints}
}

export async function completeReadyCharters(
    deps: InfluenceDeps,
    opts: {maxWorlds?: number} = {}
): Promise<CharterReadyResult> {
    const worlds = await deps.reads.getFoundedWorlds()
    const completed: FoundedWorld[] = []
    const limit = opts.maxWorlds ?? worlds.length

    for (const world of worlds) {
        if (completed.length >= limit) break
        const charter = await deps.reads.getCharter(world)
        if (!charter.buildable) continue
        await deps.session.transact({action: deps.actions.charterready(world)})
        completed.push(world)
    }

    if (completed.length === 0) {
        return {kind: 'nothing-buildable', examined: worlds.length}
    }
    return {kind: 'completed', worlds: completed}
}

export async function tendFund(deps: FundDeps, maxLots = 0): Promise<TendResult> {
    const lots = await deps.reads.getLotCount()
    if (lots === 0) return {kind: 'no-lots'}
    await deps.session.transact({action: deps.actions.tend(maxLots)})
    return {kind: 'tended', maxLots}
}
