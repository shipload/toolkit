import {Asset, Name, type NameType} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {PlatformContract} from '../contracts'

export interface DepositConfig {
    tokenContract: Name
    symbol: Asset.Symbol
}

export interface PlatformBalance {
    owner: Name
    tokenContract: Name
    balance: Asset
}

export interface TokenBalance {
    account: Name
    tokenContract: Name
    balance: Asset
}

export class BalancesManager extends BaseManager {
    private depositConfig?: DepositConfig | null

    async getDepositConfig(reload = false): Promise<DepositConfig | null> {
        if (!reload && this.depositConfig !== undefined) {
            return this.depositConfig
        }
        const row = (await this.platform.table('depositcfg').get()) as
            | PlatformContract.Types.depositcfg_row
            | undefined
        this.depositConfig = row
            ? {tokenContract: row.token_contract, symbol: row.token_symbol}
            : null
        return this.depositConfig
    }

    private async resolveTokenContract(tokenContract?: NameType): Promise<Name | null> {
        if (tokenContract) return Name.from(tokenContract)
        const config = await this.getDepositConfig()
        return config ? config.tokenContract : null
    }

    async getPlatformBalances(owner: NameType): Promise<PlatformBalance[]> {
        const account = Name.from(owner)
        const rows = (await this.platform
            .table('balance', account)
            .all()) as PlatformContract.Types.balance_row[]
        return rows.map((row) => ({
            owner: account,
            tokenContract: row.token_contract,
            balance: row.balance,
        }))
    }

    // Null means no balance row at all: deposits abort until `open`. A zero row is a valid state.
    async getPlatformBalance(
        owner: NameType,
        tokenContract?: NameType
    ): Promise<PlatformBalance | null> {
        const contract = await this.resolveTokenContract(tokenContract)
        if (!contract) return null
        const account = Name.from(owner)
        const row = (await this.platform.table('balance', account).get(contract)) as
            | PlatformContract.Types.balance_row
            | undefined
        if (!row) return null
        return {owner: account, tokenContract: row.token_contract, balance: row.balance}
    }

    async getWalletBalance(
        account: NameType,
        tokenContract?: NameType,
        symbolCode?: Asset.SymbolCodeType
    ): Promise<TokenBalance | null> {
        const contract = await this.resolveTokenContract(tokenContract)
        if (!contract) return null
        let code = symbolCode ? Asset.SymbolCode.from(symbolCode) : undefined
        if (!code) {
            const config = await this.getDepositConfig()
            code = config?.symbol.code
        }
        const holder = Name.from(account)
        const balances = await this.client.v1.chain.get_currency_balance(
            contract,
            holder,
            code ? String(code) : undefined
        )
        const balance = balances.find((asset) => !code || asset.symbol.code.equals(code))
        if (!balance) return null
        return {account: holder, tokenContract: contract, balance}
    }
}
