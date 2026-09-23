import {describe, expect, test} from 'bun:test'
import {Asset, Name} from '@wharfkit/antelope'
import {NftManager, resolveLockedAmount, wrapCostKey} from './nft'
import type {GameContext} from './context'
import {ServerContract} from '../contracts'

describe('resolveLockedAmount', () => {
    test('no fee refunds the full cost', () => {
        expect(resolveLockedAmount(5_0000n, 0)).toBe(5_0000n)
    })
    test('2% fee floors the fee and refunds the remainder', () => {
        expect(resolveLockedAmount(5_0000n, 200)).toBe(4_9000n)
    })
    test('rounding floors the fee (contract uses integer division)', () => {
        expect(resolveLockedAmount(101n, 250)).toBe(99n) // fee = floor(101*250/10000)=2
    })
})

describe('wrapCostKey', () => {
    test('packs item type and tier as (type << 8) | tier', () => {
        expect(wrapCostKey(0, 1).toString()).toBe('1')
        expect(wrapCostKey(3, 2).toString()).toBe('770')
    })
})

interface StubOptions {
    wrapConfig?: {fee_pct: number; fee_account: string; min_asset_id?: number} | null
    wrapCosts?: {item_type: number; tier: number; amount: number}[]
    depositConfig?: {tokenContract: string; symbol: string} | null
}

function stubContext(options: StubOptions = {}) {
    const counts = {wrapconfig: 0, wrapcost: 0, depositcfg: 0}
    const costRows = (options.wrapCosts ?? []).map((row) =>
        ServerContract.Types.wrapcost_row.from(row)
    )
    const server = {
        table(name: string) {
            if (name === 'wrapconfig') {
                return {
                    get: async () => {
                        counts.wrapconfig++
                        return options.wrapConfig
                            ? ServerContract.Types.wrapconfig_row.from({
                                  ...options.wrapConfig,
                                  min_asset_id: options.wrapConfig.min_asset_id ?? 0,
                              })
                            : undefined
                    },
                }
            }
            if (name === 'wrapcost') {
                return {
                    get: async (key: {toString(): string}) => {
                        counts.wrapcost++
                        return costRows.find(
                            (row) =>
                                wrapCostKey(Number(row.item_type), Number(row.tier)).toString() ===
                                key.toString()
                        )
                    },
                }
            }
            throw new Error(`unexpected table: ${name}`)
        },
    }
    const balances = {
        getDepositConfig: async () => {
            counts.depositcfg++
            return options.depositConfig
                ? {
                      tokenContract: Name.from(options.depositConfig.tokenContract),
                      symbol: Asset.Symbol.from(options.depositConfig.symbol),
                  }
                : null
        },
    }
    const context = {server, balances} as unknown as GameContext
    return {manager: new NftManager(context), counts}
}

const DEPOSIT = {tokenContract: 'scrap.gm', symbol: '0,SCRAP'}

describe('setWrapConfig', () => {
    test('a seeded config keeps getWrapConfig off the chain', async () => {
        const {manager, counts} = stubContext({wrapConfig: {fee_pct: 200, fee_account: 'fee.gm'}})
        manager.setWrapConfig({feePctBasisPoints: 200, feeAccount: 'fee.gm'})

        const config = await manager.getWrapConfig()
        expect(config?.feePctBasisPoints).toBe(200)
        expect(String(config?.feeAccount)).toBe('fee.gm')
        expect(counts.wrapconfig).toBe(0)
    })

    test('a reload still reaches the chain', async () => {
        const {manager, counts} = stubContext({wrapConfig: {fee_pct: 200, fee_account: 'fee.gm'}})
        manager.setWrapConfig({feePctBasisPoints: 200, feeAccount: 'fee.gm'})
        await manager.getWrapConfig(true)
        expect(counts.wrapconfig).toBe(1)
    })

    test('seeding null records a chain with no wrap fee configured', async () => {
        const {manager, counts} = stubContext({wrapConfig: {fee_pct: 200, fee_account: 'fee.gm'}})
        manager.setWrapConfig(null)
        expect(await manager.getWrapConfig()).toBeNull()
        expect(counts.wrapconfig).toBe(0)
    })
})

describe('setWrapCosts', () => {
    test('a seeded cost keeps getWrapCost off the chain', async () => {
        const {manager, counts} = stubContext({
            wrapCosts: [{item_type: 3, tier: 2, amount: 500}],
        })
        manager.setWrapCosts([{itemType: 3, tier: 2, units: 500n}])

        expect(await manager.getWrapCost(3, 2)).toBe(500n)
        expect(counts.wrapcost).toBe(0)
    })

    test('an item missing from the seed falls back to chain', async () => {
        const {manager, counts} = stubContext({
            wrapCosts: [{item_type: 3, tier: 2, amount: 500}],
        })
        manager.setWrapCosts([{itemType: 3, tier: 2, units: 500n}])

        expect(await manager.getWrapCost(9, 1)).toBe(0n)
        expect(counts.wrapcost).toBe(1)
    })

    test('a reload still reaches the chain', async () => {
        const {manager, counts} = stubContext({
            wrapCosts: [{item_type: 3, tier: 2, amount: 500}],
        })
        manager.setWrapCosts([{itemType: 3, tier: 2, units: 500n}])
        await manager.getWrapCost(3, 2, true)
        expect(counts.wrapcost).toBe(1)
    })
})

describe('getWrapDeposit', () => {
    test('with every seed present, makes no chain reads', async () => {
        const {manager, counts} = stubContext({
            wrapCosts: [{item_type: 3, tier: 2, amount: 500}],
            wrapConfig: {fee_pct: 200, fee_account: 'fee.gm'},
            depositConfig: DEPOSIT,
        })
        manager.setWrapCosts([{itemType: 3, tier: 2, units: 500n}])
        manager.setWrapConfig({feePctBasisPoints: 200, feeAccount: 'fee.gm'})

        const deposit = await manager.getWrapDeposit(3, 2)
        expect(deposit).toEqual({
            cost: 500n,
            refund: 490n,
            feePct: 2,
            symbol: 'SCRAP',
            precision: 0,
            tokenContract: 'scrap.gm',
        })
        expect(counts.wrapcost).toBe(0)
        expect(counts.wrapconfig).toBe(0)
        // getDepositConfig is a BalancesManager concern seeded separately; this stub always calls through.
        expect(counts.depositcfg).toBe(1)
    })

    test('with nothing seeded, falls back to chain for config and cost', async () => {
        const {manager, counts} = stubContext({
            wrapCosts: [{item_type: 3, tier: 2, amount: 500}],
            wrapConfig: {fee_pct: 200, fee_account: 'fee.gm'},
            depositConfig: DEPOSIT,
        })

        const deposit = await manager.getWrapDeposit(3, 2)
        expect(deposit?.cost).toBe(500n)
        expect(counts.wrapcost).toBe(1)
        expect(counts.wrapconfig).toBe(1)
    })

    test('reload true bypasses seeds and reaches chain', async () => {
        const {manager, counts} = stubContext({
            wrapCosts: [{item_type: 3, tier: 2, amount: 500}],
            wrapConfig: {fee_pct: 200, fee_account: 'fee.gm'},
            depositConfig: DEPOSIT,
        })
        manager.setWrapCosts([{itemType: 3, tier: 2, units: 500n}])
        manager.setWrapConfig({feePctBasisPoints: 200, feeAccount: 'fee.gm'})

        await manager.getWrapDeposit(3, 2, {reload: true})
        expect(counts.wrapcost).toBe(1)
        expect(counts.wrapconfig).toBe(1)
        expect(counts.depositcfg).toBe(1)
    })
})
