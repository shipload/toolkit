import {expect, spyOn, test} from 'bun:test'
import {Action, Asset, Name} from '@wharfkit/antelope'
import type {FundDeps} from '@shipload/oracle'
import {runCollectPass} from './maintenance-pass'
import {formatCollect} from './format'

function context(balance: string, platformError?: string) {
    const sent: string[] = []
    const fund: FundDeps = {
        reads: {
            getTendable: async () => {
                throw new Error('collection must not tend')
            },
            getUncollected: async () => [
                {tokenContract: Name.from('scrap.gm'), balance: Asset.from(balance)},
            ],
            getAcceptedTokens: async () => [
                {tokenContract: Name.from('scrap.gm'), symbol: Asset.Symbol.from('0,SCRAP')},
            ],
            hasBeneficiaries: async () => true,
        },
        actions: {
            tend: () => {
                throw new Error('collection must not tend')
            },
            collect: () =>
                Action.from({
                    account: 'fnd.shipload',
                    name: 'collect',
                    authorization: [],
                    data: '',
                }),
            collectFees: () =>
                Action.from({
                    account: 'fnd.shipload',
                    name: 'collectfees',
                    authorization: [],
                    data: '',
                }),
        },
        session: {
            transact: async ({action}) => {
                sent.push(String(action.name))
                if (String(action.name) === 'collectfees') throw new Error('no fees to collect')
                if (platformError) throw new Error(platformError)
                return {}
            },
        },
    }
    return {ctx: {fund}, sent}
}

async function capture(run: () => Promise<void>) {
    const out: string[] = []
    const err: string[] = []
    const log = spyOn(console, 'log').mockImplementation((line) => {
        out.push(String(line))
    })
    const error = spyOn(console, 'error').mockImplementation((line) => {
        err.push(String(line))
    })
    try {
        await run()
    } finally {
        log.mockRestore()
        error.mockRestore()
    }
    return {out, err}
}

test('empty collection pass skips platform transaction and stays quiet', async () => {
    const {ctx, sent} = context('0 SCRAP')
    expect(await capture(() => runCollectPass(ctx))).toEqual({out: [], err: []})
    expect(sent).toEqual(['collectfees'])
})

test('productive platform collection has one log line and still runs market collection', async () => {
    const {ctx, sent} = context('10 SCRAP')
    const logs = await capture(() => runCollectPass(ctx))
    expect(logs.out).toHaveLength(1)
    expect(logs.out[0]).toContain('fund collect: pulled platform balance')
    expect(logs.err).toEqual([])
    expect(sent).toEqual(['collect', 'collectfees'])
})

test('another collector winning the race stays quiet', async () => {
    const {ctx} = context('10 SCRAP', 'assertion failure with message: nothing to collect')
    expect(await capture(() => runCollectPass(ctx))).toEqual({out: [], err: []})
})

test('read and transaction failures remain visible and do not stop the other collection source', async () => {
    for (const readFailure of [false, true]) {
        const {ctx, sent} = context('10 SCRAP', 'missing required authority')
        if (readFailure)
            ctx.fund.reads.getUncollected = async () => {
                throw new Error('RPC offline')
            }
        const logs = await capture(() => runCollectPass(ctx))
        expect(logs.out).toEqual([])
        expect(logs.err).toHaveLength(1)
        expect(logs.err[0]).toContain(readFailure ? 'RPC offline' : 'missing required authority')
        expect(sent).toContain('collectfees')
        if (readFailure) expect(sent).not.toContain('collect')
    }
})

test('collection formatting distinguishes idle from productive sources', () => {
    expect(formatCollect({kind: 'nothing-collectable'})).toBe('fund collect: nothing collectable')
    expect(formatCollect({kind: 'collected', source: 'market'})).toBe(
        'fund collect: pulled market fees'
    )
})
