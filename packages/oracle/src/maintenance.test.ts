import {expect, test} from 'bun:test'
import {Asset, Name} from '@wharfkit/antelope'
import {
    completeReadyCharters,
    runMintReady,
    settleReadyBallots,
    tendFund,
    collectFund,
    collectFundFees,
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
        reads: {
            getTendable: async () => assetIds,
            getUncollected: async () => [
                {tokenContract: Name.from('scrap.gm'), balance: Asset.from('10 SCRAP')},
            ],
            getAcceptedTokens: async () => [
                {tokenContract: Name.from('scrap.gm'), symbol: Asset.Symbol.from('0,SCRAP')},
            ],
            hasBeneficiaries: async () => true,
        },
        actions: {
            tend: (ids) => {
                sent.push(`tend:${ids.join(',')}`)
                return {name: 'tend'} as never
            },
            collect: () => {
                sent.push('collect')
                return {name: 'collect'} as never
            },
            collectFees: () => {
                sent.push('collectfees')
                return {name: 'collectfees'} as never
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
            voteready: (maxPages) => {
                sent.push(`voteready:${maxPages}`)
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
    expect(await settleReadyBallots(deps)).toEqual({kind: 'settled', due: 1, maxPages: 0})
    expect(sent).toEqual(['voteready:0'])
})

test('voteready accepts an explicit cap', async () => {
    const {deps, sent} = ballotDeps(1)
    expect(await settleReadyBallots(deps, 5)).toEqual({kind: 'settled', due: 1, maxPages: 5})
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

test('collect transacts the platform pull', async () => {
    const {deps, sent} = fundDeps([])
    expect(await collectFund(deps)).toEqual({kind: 'collected', source: 'platform'})
    expect(sent).toEqual(['collect'])
})

test('collectfees transacts the market pull', async () => {
    const {deps, sent} = fundDeps([])
    expect(await collectFundFees(deps)).toEqual({kind: 'collected', source: 'market'})
    expect(sent).toEqual(['collectfees'])
})

test('collect and collectfees do not read the tendable list', async () => {
    let reads = 0
    const {deps} = fundDeps([])
    const counting = {
        ...deps,
        reads: {
            ...deps.reads,
            getTendable: async () => {
                reads++
                return []
            },
        },
    }
    await collectFund(counting)
    await collectFundFees(counting)
    expect(reads).toBe(0)
})

test('collect skips absent and zero platform balances without reading tokens or signing', async () => {
    for (const balances of [
        [],
        [{tokenContract: Name.from('scrap.gm'), balance: Asset.from('0 SCRAP')}],
    ]) {
        const {deps, sent} = fundDeps([])
        deps.reads.getUncollected = async () => balances
        deps.reads.getAcceptedTokens = async () => {
            throw new Error('unnecessary token read')
        }
        deps.session.transact = async () => {
            throw new Error('unexpected transaction')
        }
        expect(await collectFund(deps)).toEqual({kind: 'nothing-collectable'})
        expect(sent).toEqual([])
    }
})

test('collect ignores unsupported contracts, symbols and precisions', async () => {
    for (const [contract, quantity] of [
        ['other.token', '10 SCRAP'],
        ['scrap.gm', '10 EOS'],
        ['scrap.gm', '10.0000 SCRAP'],
    ]) {
        const {deps, sent} = fundDeps([])
        deps.reads.getUncollected = async () => [
            {tokenContract: Name.from(contract), balance: Asset.from(quantity)},
        ]
        expect(await collectFund(deps)).toEqual({kind: 'nothing-collectable'})
        expect(sent).toEqual([])
    }
})

test('collect sends once for mixed balances when at least one token matches', async () => {
    const {deps, sent} = fundDeps([])
    deps.reads.getUncollected = async () => [
        {tokenContract: Name.from('other.token'), balance: Asset.from('99 OTHER')},
        {tokenContract: Name.from('eosio.token'), balance: Asset.from('0.0000 EOS')},
        {tokenContract: Name.from('scrap.gm'), balance: Asset.from('10 SCRAP')},
    ]
    expect(await collectFund(deps)).toEqual({kind: 'collected', source: 'platform'})
    expect(sent).toEqual(['collect'])
})

test('collect preserves fees when there is no beneficiary split', async () => {
    const {deps, sent} = fundDeps([])
    deps.reads.hasBeneficiaries = async () => false
    await expect(collectFund(deps)).rejects.toThrow('no beneficiaries')
    expect(sent).toEqual([])
})

test('failed collection reads propagate without building or submitting an action', async () => {
    for (const read of ['getUncollected', 'getAcceptedTokens', 'hasBeneficiaries'] as const) {
        const {deps, sent} = fundDeps([])
        deps.reads[read] = async () => {
            throw new Error('RPC unavailable')
        }
        await expect(collectFund(deps)).rejects.toThrow('RPC unavailable')
        expect(sent).toEqual([])
    }
})

test('collect does not report success if the transaction fails or another collector wins', async () => {
    const {deps} = fundDeps([])
    deps.session.transact = async () => {
        throw new Error('nothing to collect')
    }
    await expect(collectFund(deps)).rejects.toThrow('nothing to collect')
})
