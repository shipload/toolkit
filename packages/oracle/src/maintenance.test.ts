import {expect, test} from 'bun:test'
import {
    completeReadyCharters,
    pokeMintReady,
    settleReadyBallots,
    tendFund,
    type BallotDeps,
    type FoundedWorld,
    type FundDeps,
    type InfluenceDeps,
    type PendingBallot,
} from './maintenance'

function influenceDeps(opts: {
    worlds: FoundedWorld[]
    buildable?: (world: FoundedWorld) => boolean
}): {deps: InfluenceDeps; sent: string[]} {
    const sent: string[] = []
    const deps: InfluenceDeps = {
        reads: {
            getFoundedWorlds: async () => opts.worlds,
            getCharter: async (world) => ({
                buildable: opts.buildable ? opts.buildable(world) : false,
            }),
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

function fundDeps(lots: number): {deps: FundDeps; sent: string[]} {
    const sent: string[] = []
    const deps: FundDeps = {
        reads: {getLotCount: async () => lots},
        actions: {
            tend: (maxLots) => {
                sent.push(`tend:${maxLots}`)
                return {name: 'tend'} as never
            },
        },
        session: {transact: async () => ({})},
    }
    return {deps, sent}
}

test('mintready is a blind poke', async () => {
    const {deps, sent} = influenceDeps({worlds: []})
    expect(await pokeMintReady(deps)).toEqual({kind: 'poked', maxMints: undefined})
    expect(sent).toEqual(['mintready:default'])
})

test('mintready passes an explicit cap through', async () => {
    const {deps, sent} = influenceDeps({worlds: []})
    await pokeMintReady(deps, 25)
    expect(sent).toEqual(['mintready:25'])
})

test('charterready skips worlds that would assert', async () => {
    const worlds = [
        {x: 1, y: 1},
        {x: 2, y: 2},
    ]
    const {deps, sent} = influenceDeps({worlds, buildable: (w) => w.x === 2})
    const result = await completeReadyCharters(deps)
    expect(result).toEqual({kind: 'completed', worlds: [{x: 2, y: 2}]})
    expect(sent).toEqual(['charterready:2,2'])
})

test('charterready reports how many worlds it examined when none are buildable', async () => {
    const worlds = [
        {x: 1, y: 1},
        {x: 2, y: 2},
    ]
    const {deps, sent} = influenceDeps({worlds})
    expect(await completeReadyCharters(deps)).toEqual({kind: 'nothing-buildable', examined: 2})
    expect(sent).toEqual([])
})

test('charterready is safe against an empty world set', async () => {
    const {deps, sent} = influenceDeps({worlds: []})
    expect(await completeReadyCharters(deps)).toEqual({kind: 'nothing-buildable', examined: 0})
    expect(sent).toEqual([])
})

test('charterready honors a per-tick world cap', async () => {
    const worlds = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
    ]
    const {deps, sent} = influenceDeps({worlds, buildable: () => true})
    const result = await completeReadyCharters(deps, {maxWorlds: 2})
    expect(result).toEqual({kind: 'completed', worlds: [worlds[0], worlds[1]]})
    expect(sent).toEqual(['charterready:1,1', 'charterready:2,2'])
})

function ballotDeps(opts: {queue: PendingBallot[]; epoch: number}): {
    deps: BallotDeps
    sent: string[]
} {
    const sent: string[] = []
    const deps: BallotDeps = {
        reads: {
            getBallotQueue: async () => opts.queue,
            getCurrentEpoch: async () => opts.epoch,
        },
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

test('voteready does nothing when the ballot queue is empty', async () => {
    const {deps, sent} = ballotDeps({queue: [], epoch: 9})
    expect(await settleReadyBallots(deps)).toEqual({kind: 'no-ballots'})
    expect(sent).toEqual([])
})

test('voteready leaves the current epoch alone', async () => {
    const queue = [
        {x: 1, y: 1, epoch: 9},
        {x: 2, y: 2, epoch: 9},
    ]
    const {deps, sent} = ballotDeps({queue, epoch: 9})
    expect(await settleReadyBallots(deps)).toEqual({kind: 'none-due', pending: 2})
    expect(sent).toEqual([])
})

test('voteready settles once a ballot falls behind the epoch', async () => {
    const queue = [
        {x: 1, y: 1, epoch: 8},
        {x: 2, y: 2, epoch: 9},
    ]
    const {deps, sent} = ballotDeps({queue, epoch: 9})
    expect(await settleReadyBallots(deps)).toEqual({kind: 'settled', due: 1, maxBallots: 0})
    expect(sent).toEqual(['voteready:0'])
})

test('voteready sweeps with the contract default cap', async () => {
    const {deps, sent} = ballotDeps({queue: [{x: 1, y: 1, epoch: 7}], epoch: 9})
    await settleReadyBallots(deps)
    expect(sent).toEqual(['voteready:0'])
})

test('voteready accepts an explicit cap', async () => {
    const {deps, sent} = ballotDeps({queue: [{x: 1, y: 1, epoch: 7}], epoch: 9})
    expect(await settleReadyBallots(deps, 5)).toEqual({kind: 'settled', due: 1, maxBallots: 5})
    expect(sent).toEqual(['voteready:5'])
})

test('tend does nothing when the fund holds no lots', async () => {
    const {deps, sent} = fundDeps(0)
    expect(await tendFund(deps)).toEqual({kind: 'no-lots'})
    expect(sent).toEqual([])
})

test('tend sweeps with the contract default cap', async () => {
    const {deps, sent} = fundDeps(3)
    expect(await tendFund(deps)).toEqual({kind: 'tended', maxLots: 0})
    expect(sent).toEqual(['tend:0'])
})

test('tend accepts an explicit cap', async () => {
    const {deps, sent} = fundDeps(3)
    await tendFund(deps, 5)
    expect(sent).toEqual(['tend:5'])
})
