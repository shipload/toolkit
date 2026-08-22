import {expect, test} from 'bun:test'
import {
    completeReadyCharters,
    runMintReady,
    settleReadyBallots,
    tendFund,
    type BallotDeps,
    type FoundedWorld,
    type FundDeps,
    type InfluenceDeps,
} from './maintenance'

function influenceDeps(opts: {
    getMintReady?: () => Promise<number>
    getCharterReady?: () => Promise<FoundedWorld[]>
}): {deps: InfluenceDeps; sent: string[]} {
    const sent: string[] = []
    const deps: InfluenceDeps = {
        reads: {
            getMintReady: opts.getMintReady ?? (async () => 0),
            getCharterReady: opts.getCharterReady ?? (async () => []),
        },
        actions: {
            mintready: (maxMints) => {
                sent.push(`mintready:${maxMints ?? 'default'}`)
                return {name: 'mintready'} as never
            },
            charterready: (world) => {
                sent.push(`charterready:${world.x},${world.y}`)
                return {name: 'charterready'} as never
            },
        },
        session: {transact: async () => ({})},
    }
    return {deps, sent}
}

function fundDeps(assetIds: number[]): {deps: FundDeps; sent: string[]} {
    const sent: string[] = []
    const deps: FundDeps = {
        reads: {getTendable: async () => assetIds},
        actions: {
            tend: (ids) => {
                sent.push(`tend:${ids.join(',')}`)
                return {name: 'tend'} as never
            },
        },
        session: {transact: async () => ({})},
    }
    return {deps, sent}
}

test('mintready is skipped when no pool is ready', async () => {
    const {deps, sent} = influenceDeps({getMintReady: async () => 0})
    const result = await runMintReady(deps)

    expect(result).toEqual({kind: 'nothing-ready'})
    expect(sent).toEqual([])
})

test('mintready transacts when a pool is ready', async () => {
    const {deps, sent} = influenceDeps({getMintReady: async () => 2})
    const result = await runMintReady(deps)

    expect(result).toEqual({kind: 'minted', ready: 2})
    expect(sent).toEqual(['mintready:default'])
})

test('mintready passes an explicit cap through', async () => {
    const {deps, sent} = influenceDeps({getMintReady: async () => 2})
    await runMintReady(deps, 25)
    expect(sent).toEqual(['mintready:25'])
})

test('charterready transacts for each world the contract reports ready', async () => {
    const worlds = [{x: 2, y: 2}]
    const {deps, sent} = influenceDeps({getCharterReady: async () => worlds})
    const result = await completeReadyCharters(deps)
    expect(result).toEqual({kind: 'completed', worlds: [{x: 2, y: 2}]})
    expect(sent).toEqual(['charterready:2,2'])
})

test('charterready is safe against an empty ready list', async () => {
    const {deps, sent} = influenceDeps({getCharterReady: async () => []})
    expect(await completeReadyCharters(deps)).toEqual({kind: 'nothing-buildable', examined: 0})
    expect(sent).toEqual([])
})

test('charterready honors a per-tick world cap', async () => {
    const worlds = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
    ]
    const {deps, sent} = influenceDeps({getCharterReady: async () => worlds})
    const result = await completeReadyCharters(deps, {maxWorlds: 2})
    expect(result).toEqual({kind: 'completed', worlds: [worlds[0], worlds[1]]})
    expect(sent).toEqual(['charterready:1,1', 'charterready:2,2'])
})

function ballotDeps(due: number): {deps: BallotDeps; sent: string[]} {
    const sent: string[] = []
    const deps: BallotDeps = {
        reads: {getVoteReady: async () => due},
        actions: {
            voteready: (maxBallots) => {
                sent.push(`voteready:${maxBallots}`)
                return {name: 'voteready'} as never
            },
        },
        session: {transact: async () => ({})},
    }
    return {deps, sent}
}

test('voteready does nothing when nothing is due', async () => {
    const {deps, sent} = ballotDeps(0)
    expect(await settleReadyBallots(deps)).toEqual({kind: 'none-due', pending: 0})
    expect(sent).toEqual([])
})

test('voteready settles once a ballot is due', async () => {
    const {deps, sent} = ballotDeps(1)
    expect(await settleReadyBallots(deps)).toEqual({kind: 'settled', due: 1, maxBallots: 0})
    expect(sent).toEqual(['voteready:0'])
})

test('voteready accepts an explicit cap', async () => {
    const {deps, sent} = ballotDeps(1)
    expect(await settleReadyBallots(deps, 5)).toEqual({kind: 'settled', due: 1, maxBallots: 5})
    expect(sent).toEqual(['voteready:5'])
})

test('tend does nothing when the fund has no tendable lots', async () => {
    const {deps, sent} = fundDeps([])
    expect(await tendFund(deps)).toEqual({kind: 'nothing-tendable'})
    expect(sent).toEqual([])
})

test('tend transacts with the tendable asset ids', async () => {
    const {deps, sent} = fundDeps([1, 2, 3])
    expect(await tendFund(deps)).toEqual({kind: 'tended', assetIds: [1, 2, 3]})
    expect(sent).toEqual(['tend:1,2,3'])
})

test('tend accepts an explicit lot cap', async () => {
    const {deps, sent} = fundDeps([1, 2, 3])
    await tendFund(deps, 5)
    expect(sent).toEqual(['tend:1,2,3'])
})
