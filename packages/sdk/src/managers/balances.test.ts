import {describe, expect, test} from 'bun:test'
import {Asset, type Name} from '@wharfkit/antelope'
import {BalancesManager} from './balances'
import type {GameContext} from './context'
import {PlatformContract} from '../contracts'

interface StubOptions {
    depositConfig?: {token_contract: string; token_symbol: string} | null
    balances?: {token_contract: string; balance: string}[] | null
    wallet?: string[]
}

function stubContext(options: StubOptions = {}) {
    const counts = {depositcfg: 0, balance: 0, currency: 0}
    const rows = (options.balances ?? []).map((row) => PlatformContract.Types.balance_row.from(row))
    const platform = {
        table(name: string) {
            if (name === 'depositcfg') {
                return {
                    get: async () => {
                        counts.depositcfg++
                        return options.depositConfig
                            ? PlatformContract.Types.depositcfg_row.from(options.depositConfig)
                            : undefined
                    },
                }
            }
            return {
                get: async (key: Name) => {
                    counts.balance++
                    return rows.find((row) => row.token_contract.equals(key))
                },
                all: async () => {
                    counts.balance++
                    return rows
                },
            }
        },
    }
    const client = {
        v1: {
            chain: {
                get_currency_balance: async () => {
                    counts.currency++
                    return (options.wallet ?? []).map((value) => Asset.from(value))
                },
            },
        },
    }
    const context = {platform, client} as unknown as GameContext
    return {manager: new BalancesManager(context), counts}
}

const SCRAP = {token_contract: 'scrap.gm', token_symbol: '0,SCRAP'}

describe('getDepositConfig', () => {
    test('reads the configured deposit token', async () => {
        const {manager} = stubContext({depositConfig: SCRAP})
        const config = await manager.getDepositConfig()
        expect(String(config?.tokenContract)).toBe('scrap.gm')
        expect(String(config?.symbol)).toBe('0,SCRAP')
    })

    test('caches the config across calls', async () => {
        const {manager, counts} = stubContext({depositConfig: SCRAP})
        await manager.getDepositConfig()
        await manager.getDepositConfig()
        expect(counts.depositcfg).toBe(1)
        await manager.getDepositConfig(true)
        expect(counts.depositcfg).toBe(2)
    })

    test('caches a missing config as null without refetching', async () => {
        const {manager, counts} = stubContext({depositConfig: null})
        expect(await manager.getDepositConfig()).toBeNull()
        expect(await manager.getDepositConfig()).toBeNull()
        expect(counts.depositcfg).toBe(1)
    })
})

describe('getPlatformBalance', () => {
    test('returns null when the owner has never opened a row', async () => {
        const {manager} = stubContext({depositConfig: SCRAP, balances: []})
        expect(await manager.getPlatformBalance('alice')).toBeNull()
    })

    test('returns a zero balance for an opened but empty row', async () => {
        const {manager} = stubContext({
            depositConfig: SCRAP,
            balances: [{token_contract: 'scrap.gm', balance: '0 SCRAP'}],
        })
        const balance = await manager.getPlatformBalance('alice')
        expect(balance).not.toBeNull()
        expect(String(balance?.balance)).toBe('0 SCRAP')
        expect(balance?.balance.units.toNumber()).toBe(0)
        expect(balance?.balance.symbol.precision).toBe(0)
        expect(String(balance?.owner)).toBe('alice')
    })

    test('defaults to the deposit token and honours an explicit contract', async () => {
        const {manager} = stubContext({
            depositConfig: SCRAP,
            balances: [
                {token_contract: 'scrap.gm', balance: '12 SCRAP'},
                {token_contract: 'eosio.token', balance: '3.0000 EOS'},
            ],
        })
        expect(String((await manager.getPlatformBalance('alice'))?.balance)).toBe('12 SCRAP')
        expect(String((await manager.getPlatformBalance('alice', 'eosio.token'))?.balance)).toBe(
            '3.0000 EOS'
        )
    })

    test('returns null when no deposit token is configured', async () => {
        const {manager, counts} = stubContext({depositConfig: null})
        expect(await manager.getPlatformBalance('alice')).toBeNull()
        expect(counts.balance).toBe(0)
    })
})

describe('getPlatformBalances', () => {
    test('returns every row the owner holds', async () => {
        const {manager} = stubContext({
            depositConfig: SCRAP,
            balances: [
                {token_contract: 'scrap.gm', balance: '12 SCRAP'},
                {token_contract: 'eosio.token', balance: '3.0000 EOS'},
            ],
        })
        const balances = await manager.getPlatformBalances('alice')
        expect(balances.map((row) => String(row.balance))).toEqual(['12 SCRAP', '3.0000 EOS'])
        expect(balances.map((row) => String(row.tokenContract))).toEqual([
            'scrap.gm',
            'eosio.token',
        ])
    })

    test('returns an empty array for an owner with no rows', async () => {
        const {manager} = stubContext({depositConfig: SCRAP, balances: []})
        expect(await manager.getPlatformBalances('alice')).toEqual([])
    })
})

describe('getWalletBalance', () => {
    test('reads the wallet balance for the deposit token', async () => {
        const {manager} = stubContext({depositConfig: SCRAP, wallet: ['500 SCRAP']})
        const balance = await manager.getWalletBalance('alice')
        expect(String(balance?.balance)).toBe('500 SCRAP')
        expect(String(balance?.tokenContract)).toBe('scrap.gm')
    })

    test('returns null when the account holds none of the token', async () => {
        const {manager} = stubContext({depositConfig: SCRAP, wallet: []})
        expect(await manager.getWalletBalance('alice')).toBeNull()
    })

    test('ignores balances of other symbols on the same contract', async () => {
        const {manager} = stubContext({depositConfig: SCRAP, wallet: ['1.0000 OTHER']})
        expect(await manager.getWalletBalance('alice')).toBeNull()
    })
})
