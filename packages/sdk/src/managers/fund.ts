import {type Asset, Name, type NameType, type UInt16} from '@wharfkit/antelope'
import type {FundContract} from '../contracts'
import type {PlatformBalance} from './balances'
import {BaseManager} from './base'

export interface FundBeneficiary {
    account: Name
    bps: UInt16
}

export interface FundToken {
    tokenContract: Name
    symbol: Asset.Symbol
}

export interface FundAccrued {
    tokenContract: Name
    balance: Asset
}

/** Live fund ledger reads. Token custody can exceed the amounts accrued to beneficiaries. */
export class FundManager extends BaseManager {
    async getBeneficiaries(): Promise<FundBeneficiary[]> {
        const rows = (await this.fund
            .table('benefs', this.fund.account)
            .all()) as FundContract.Types.benef_row[]
        return rows.map((row) => ({account: row.account, bps: row.bps}))
    }

    async getTokens(): Promise<FundToken[]> {
        const rows = (await this.fund
            .table('tokens', this.fund.account)
            .all()) as FundContract.Types.token_row[]
        return rows.map((row) => ({tokenContract: row.token_contract, symbol: row.token_symbol}))
    }

    /** Includes zero rows and claims for tokens no longer accepted; no rows returns []. */
    async getAccrued(beneficiary: NameType): Promise<FundAccrued[]> {
        const rows = (await this.fund
            .table('accrued', Name.from(beneficiary))
            .all()) as FundContract.Types.accrued_row[]
        return rows.map((row) => ({tokenContract: row.token_contract, balance: row.balance}))
    }

    /** Platform balances that have not reached the fund's accrual ledger yet. */
    async getUncollected(): Promise<PlatformBalance[]> {
        return this.context.balances.getPlatformBalances(this.fund.account)
    }
}
