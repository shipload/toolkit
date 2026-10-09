import {describe, expect, it} from 'bun:test'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../shipload'
import {PlatformContract, ServerContract} from '../contracts'
import type {PlatformBalance} from './balances'
import {parseCitizenShares, parseEmissionEpoch, parseWorldEarnings} from './shares'

const PLAYER = 'alice'
const TOKEN = {tokenContract: 'scrap.gm', symbol: '0,SCRAP'}

function world(x: number, y: number, ready: number) {
    return {
        location_id: '0',
        x,
        y,
        active: '100',
        world_active: '400',
        ready_fp: String(BigInt(ready) * 1_000_000_000n + 250_000_000n),
        ready: String(ready),
        pending_fp: '7',
    }
}

function shipload(opts: {balanceRow: boolean; shares: ReturnType<typeof world>[]}) {
    const sl = new Shipload(Chains.Jungle4)
    sl.balances.setDepositConfig(TOKEN)
    let balanceReads = 0
    sl.balances.getPlatformBalance = async () => {
        balanceReads += 1
        return opts.balanceRow ? ({} as PlatformBalance) : null
    }
    sl.shares.getShares = async () => parseCitizenShares({epoch: 9, shares: opts.shares})
    return {sl, balanceReads: () => balanceReads}
}

function describeActions(actions: ReturnType<Shipload['actions']['collectAllTx']>) {
    return actions.map((action) => {
        const abi =
            String(action.account) === 'nex.shipload' ? PlatformContract.abi : ServerContract.abi
        const data = action.decodeData(abi) as unknown as Record<string, unknown>
        return String(action.name) === 'collect'
            ? `collect ${data.player} ${data.x},${data.y}`
            : `${action.name} ${data.owner} ${data.token_contract} ${data.token_symbol}`
    })
}

describe('collect bundles', () => {
    const sl = new Shipload(Chains.Jungle4)

    it('builds a lone collect when the balance row exists', () => {
        const actions = sl.actions.collectTx(PLAYER, {x: 3, y: -4})
        expect(describeActions(actions)).toEqual(['collect alice 3,-4'])
        expect(String(actions[0].account)).toBe('eon.shipload')
    })

    it('opens the SCRAP balance row first when it is missing', () => {
        const actions = sl.actions.collectTx(PLAYER, {x: 3, y: -4}, {open: TOKEN})
        expect(describeActions(actions)).toEqual([
            'open alice scrap.gm 0,SCRAP',
            'collect alice 3,-4',
        ])
    })

    it('collects every world with SCRAP ready and opens once', () => {
        const actions = sl.actions.collectAllTx(
            PLAYER,
            [
                {x: 1, y: 1, ready: 5n},
                {x: 2, y: 2, ready: 0n},
                {x: 3, y: 3, ready: 12},
            ],
            {open: TOKEN}
        )
        expect(describeActions(actions)).toEqual([
            'open alice scrap.gm 0,SCRAP',
            'collect alice 1,1',
            'collect alice 3,3',
        ])
    })

    it('builds nothing when no world has SCRAP ready', () => {
        expect(sl.actions.collectAllTx(PLAYER, [{x: 1, y: 1, ready: 0}], {open: TOKEN})).toEqual([])
    })
})

describe('SharesManager collect', () => {
    it('prepends open when the balance row is missing', async () => {
        const {sl} = shipload({balanceRow: false, shares: [world(1, 1, 5), world(2, 2, 3)]})
        expect(describeActions(await sl.shares.collectAll(PLAYER))).toEqual([
            'open alice scrap.gm 0,SCRAP',
            'collect alice 1,1',
            'collect alice 2,2',
        ])
    })

    it('leaves open out when the balance row exists', async () => {
        const {sl} = shipload({balanceRow: true, shares: [world(1, 1, 5), world(2, 2, 3)]})
        expect(describeActions(await sl.shares.collectAll(PLAYER))).toEqual([
            'collect alice 1,1',
            'collect alice 2,2',
        ])
        expect(describeActions(await sl.shares.collect(PLAYER, {x: 2, y: 2}))).toEqual([
            'collect alice 2,2',
        ])
    })

    it('skips a world at 0 and reads no balance when nothing is ready', async () => {
        const some = shipload({balanceRow: true, shares: [world(1, 1, 0), world(2, 2, 3)]})
        expect(describeActions(await some.sl.shares.collectAll(PLAYER))).toEqual([
            'collect alice 2,2',
        ])
        const none = shipload({balanceRow: false, shares: [world(1, 1, 0)]})
        expect(await none.sl.shares.collectAll(PLAYER)).toEqual([])
        expect(none.balanceReads()).toBe(0)
    })
})

describe('civic result parsers', () => {
    it('reads a decoded getshares result into bigints', () => {
        const result = ServerContract.Types.shares_result.from({
            epoch: 9,
            shares: [world(-5, 6, 2)],
        })
        expect(parseCitizenShares(result)).toEqual({
            epoch: 9,
            shares: [
                {
                    locationId: 0n,
                    x: -5,
                    y: 6,
                    active: 100n,
                    worldActive: 400n,
                    readyFp: 2_250_000_000n,
                    ready: 2n,
                    pendingFp: 7n,
                },
            ],
        })
    })

    it('reads earnings pages from indexer JSON', () => {
        const rows = parseWorldEarnings({
            rows: [{epoch: 4, closed: true, earnings_fp: '10', scaled_fp: '9', total: '300'}],
        })
        expect(rows).toEqual([{epoch: 4, closed: true, earningsFp: 10n, scaledFp: 9n, total: 300n}])
    })

    it('reads an emission series row', () => {
        expect(
            parseEmissionEpoch({
                epoch: 12,
                target: '1245000',
                committed: '1200000',
                uncommitted: '45000',
                scaled_back: '0',
                rate_fp: '3000000000',
                production: '4150000',
                supply: '124000000',
                owed: '81000',
            })
        ).toEqual({
            epoch: 12,
            target: 1_245_000n,
            committed: 1_200_000n,
            uncommitted: 45_000n,
            scaledBack: 0n,
            rateFp: 3_000_000_000n,
            production: 4_150_000n,
            supply: 124_000_000n,
            owed: 81_000n,
        })
    })
})
