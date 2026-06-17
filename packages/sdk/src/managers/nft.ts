import {UInt64, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {PlatformContract, ServerContract} from '../contracts'

export interface NftConfigForItem {
    templateId: number
    schemaName: string
}

export interface WrapDeposit {
    cost: bigint
    refund: bigint
    feePct: number
    symbol: string
    precision: number
    tokenContract: string
}

export function resolveLockedAmount(cost: bigint, feePctBasisPoints: number): bigint {
    const fee = (cost * BigInt(feePctBasisPoints)) / 10_000n
    return cost - fee
}

export class NftManager extends BaseManager {
    private cache = new Map<string, NftConfigForItem | null>()

    async getNftConfigForItem(itemId: UInt64Type): Promise<NftConfigForItem | undefined> {
        const id = UInt64.from(itemId)
        const key = id.toString()
        if (this.cache.has(key)) {
            return this.cache.get(key) ?? undefined
        }
        const row = (await this.server.table('nftconfig').get(id)) as
            | ServerContract.Types.nftconfig_row
            | undefined
        const result: NftConfigForItem | null = row
            ? {templateId: Number(row.template_id), schemaName: String(row.schema_name)}
            : null
        this.cache.set(key, result)
        return result ?? undefined
    }

    async getWrapDeposit(itemType: number, tier: number): Promise<WrapDeposit | null> {
        const key = UInt64.from((BigInt(itemType) << 8n) | BigInt(tier))
        const costRow = (await this.server.table('wrapcost').get(key)) as
            | ServerContract.Types.wrapcost_row
            | undefined
        const cost = costRow ? BigInt(costRow.amount.toString()) : 0n
        if (cost === 0n) return null

        const cfg = (await this.server.table('wrapconfig').get()) as
            | ServerContract.Types.wrapconfig_row
            | undefined
        const feePctBasisPoints = cfg ? Number(cfg.fee_pct) : 0

        const depositCfg = (await this.platform.table('depositcfg').get()) as
            | PlatformContract.Types.depositcfg_row
            | undefined
        if (!depositCfg) return null

        return {
            cost,
            refund: resolveLockedAmount(cost, feePctBasisPoints),
            feePct: feePctBasisPoints / 100,
            symbol: depositCfg.token_symbol.code.toString(),
            precision: depositCfg.token_symbol.precision,
            tokenContract: depositCfg.token_contract.toString(),
        }
    }
}
