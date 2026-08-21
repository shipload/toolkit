import {Name, UInt64, type NameType, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {PlatformContract, ServerContract} from '../contracts'

export interface NftConfigForItem {
    templateId: number
    schemaName: string
}

export interface WrapConfig {
    feePctBasisPoints: number
    feeAccount: Name
}

export interface WrapGate {
    owner: Name
    game: Name
    lastAssetId: UInt64
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

export function wrapCostKey(itemType: number, tier: number): UInt64 {
    return UInt64.from((BigInt(itemType) << 8n) | BigInt(tier))
}

export class NftManager extends BaseManager {
    private cache = new Map<string, NftConfigForItem | null>()
    private wrapConfig?: WrapConfig | null

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

    async getWrapConfig(reload = false): Promise<WrapConfig | null> {
        if (!reload && this.wrapConfig !== undefined) {
            return this.wrapConfig
        }
        const row = (await this.server.table('wrapconfig').get()) as
            | ServerContract.Types.wrapconfig_row
            | undefined
        this.wrapConfig = row
            ? {feePctBasisPoints: Number(row.fee_pct), feeAccount: row.fee_account}
            : null
        return this.wrapConfig
    }

    async getWrapCost(itemType: number, tier: number): Promise<bigint> {
        const row = (await this.server.table('wrapcost').get(wrapCostKey(itemType, tier))) as
            | ServerContract.Types.wrapcost_row
            | undefined
        return row ? BigInt(row.amount.toString()) : 0n
    }

    async getWrapDeposit(
        itemType: number,
        tier: number,
        opts: {reload?: boolean} = {}
    ): Promise<WrapDeposit | null> {
        const cost = await this.getWrapCost(itemType, tier)
        if (cost === 0n) return null

        const wrapConfig = await this.getWrapConfig(opts.reload)
        const feePctBasisPoints = wrapConfig ? wrapConfig.feePctBasisPoints : 0

        const depositConfig = await this.context.balances.getDepositConfig(opts.reload)
        if (!depositConfig) return null

        return {
            cost,
            refund: resolveLockedAmount(cost, feePctBasisPoints),
            feePct: feePctBasisPoints / 100,
            symbol: depositConfig.symbol.code.toString(),
            precision: depositConfig.symbol.precision,
            tokenContract: depositConfig.tokenContract.toString(),
        }
    }

    async getWrapGate(owner: NameType): Promise<WrapGate | null> {
        const row = (await this.platform.table('wrapgate').get(Name.from(owner))) as
            | PlatformContract.Types.wrapgate_row
            | undefined
        if (!row) return null
        return {owner: row.owner, game: row.game, lastAssetId: row.last_asset_id}
    }
}
