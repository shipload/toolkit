import type {
    Action,
    AssetType,
    NameType,
    UInt16Type,
    UInt32Type,
    UInt64Type,
} from '@wharfkit/antelope'
import {ABI, Asset, Blob, Name, Struct, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yABcLYWNjcnVlZF9yb3cAAg50b2tlbl9jb250cmFjdARuYW1lB2JhbGFuY2UFYXNzZXQIYWRkdG9rZW4AAg50b2tlbl9jb250cmFjdARuYW1lDHRva2VuX3N5bWJvbAZzeW1ib2wJYmVuZWZfcm93AAIHYWNjb3VudARuYW1lA2JwcwZ1aW50MTYLYmVuZWZpY2lhcnkAAgdhY2NvdW50BG5hbWUDYnBzBnVpbnQxNgVjbGFpbQABE2JlbmVmaWNpYXJ5X2FjY291bnQEbmFtZQdjb2xsZWN0AAAKY3Vyc29yX3JvdwABDW5leHRfYXNzZXRfaWQGdWludDY0CGRlbHRva2VuAAEOdG9rZW5fY29udHJhY3QEbmFtZQdnZXRsb3RzAAILbG93ZXJfYm91bmQGdWludDY0CG1heF9sb3RzBnVpbnQzMgtnZXR0ZW5kYWJsZQABCG1heF9sb3RzBnVpbnQzMghsb3RfaW5mbwAGCGFzc2V0X2lkBnVpbnQ2NAVncmFkZQRuYW1lCmF1Y3Rpb25faWQGdWludDY0B2l0ZW1faWQGdWludDE2CHF1YW50aXR5BnVpbnQzMgVzdGF0cwZ1aW50NjQLbG90c19yZXN1bHQAAgRsb3RzCmxvdF9pbmZvW10EbmV4dAZ1aW50NjQIbG90c19yb3cAAwhhc3NldF9pZAZ1aW50NjQFZ3JhZGUEbmFtZQphdWN0aW9uX2lkBnVpbnQ2NAlyZXNjdWVuZnQAAwlhc3NldF9pZHMIdWludDY0W10CdG8EbmFtZQRtZW1vBnN0cmluZwhzZXRiZW5lZgABCHJlZ2lzdHJ5DWJlbmVmaWNpYXJ5W10Jc2V0bWFya2V0AAIGbWFya2V0BG5hbWURbWFrZXJfbWFya2V0cGxhY2UEbmFtZQhzZXR0ZXJtcwADBWdyYWRlBG5hbWUMc3RhcnRpbmdfYmlkBWFzc2V0CGR1cmF0aW9uBnVpbnQzMgxzZXR0aW5nc19yb3cABAZtYXJrZXQEbmFtZQ50b2tlbl9jb250cmFjdARuYW1lDHRva2VuX3N5bWJvbAZzeW1ib2wRbWFrZXJfbWFya2V0cGxhY2UEbmFtZQhzZXR0b2tlbgACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAVzd2VlcAABCG1heF9sb3RzBnVpbnQzMgR0ZW5kAAEJYXNzZXRfaWRzCHVpbnQ2NFtdCXRlcm1zX3JvdwADBWdyYWRlBG5hbWUMc3RhcnRpbmdfYmlkBWFzc2V0CGR1cmF0aW9uBnVpbnQzMgl0b2tlbl9yb3cAAg50b2tlbl9jb250cmFjdARuYW1lDHRva2VuX3N5bWJvbAZzeW1ib2wNAAAAU0GaUzIIYWRkdG9rZW4AAAAAAADpTEQFY2xhaW0AAAAAICMVI0UHY29sbGVjdAAAAABTQZqjSghkZWx0b2tlbgAAAAAAZxqzYgdnZXRsb3RzAABUPCZNlbNiC2dldHRlbmRhYmxlAAAAyGsqjbC6CXJlc2N1ZW5mdAAAAABLTXWywghzZXRiZW5lZgAAAMgKXiOzwglzZXRtYXJrZXQAAAAAWF6Vs8IIc2V0dGVybXMAAAAAU0Gas8IIc2V0dG9rZW4AAAAAAICqFMcFc3dlZXAAAAAAAACQpsoEdGVuZAAHAAAAICl9ETIDaTY0AAALYWNjcnVlZF9yb3cAAAAA4KWmOgNpNjQAAAliZW5lZl9yb3cAAAAAXIqvRgNpNjQAAApjdXJzb3Jfcm93AAAAAACAM40DaTY0AAAIbG90c19yb3cAAACYTZezwgNpNjQAAAxzZXR0aW5nc19yb3cAAAAAACyvygNpNjQAAAl0ZXJtc19yb3cAAAAA4KkgzQNpNjQAAAl0b2tlbl9yb3cAAAAAAgAAAABnGrNiC2xvdHNfcmVzdWx0AFQ8Jk2Vs2IIdWludDY0W10='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('accrued_row')
    export class accrued_row extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset)
        declare balance: Asset
    }
    @Struct.type('addtoken')
    export class addtoken extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('benef_row')
    export class benef_row extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(UInt16)
        declare bps: UInt16
    }
    @Struct.type('beneficiary')
    export class beneficiary extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(UInt16)
        declare bps: UInt16
    }
    @Struct.type('claim')
    export class claim extends Struct {
        @Struct.field(Name)
        declare beneficiary_account: Name
    }
    @Struct.type('collect')
    export class collect extends Struct {}
    @Struct.type('cursor_row')
    export class cursor_row extends Struct {
        @Struct.field(UInt64)
        declare next_asset_id: UInt64
    }
    @Struct.type('deltoken')
    export class deltoken extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
    }
    @Struct.type('getlots')
    export class getlots extends Struct {
        @Struct.field(UInt64)
        declare lower_bound: UInt64
        @Struct.field(UInt32)
        declare max_lots: UInt32
    }
    @Struct.type('gettendable')
    export class gettendable extends Struct {
        @Struct.field(UInt32)
        declare max_lots: UInt32
    }
    @Struct.type('lot_info')
    export class lot_info extends Struct {
        @Struct.field(UInt64)
        declare asset_id: UInt64
        @Struct.field(Name)
        declare grade: Name
        @Struct.field(UInt64)
        declare auction_id: UInt64
        @Struct.field(UInt16)
        declare item_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
        @Struct.field(UInt64)
        declare stats: UInt64
    }
    @Struct.type('lots_result')
    export class lots_result extends Struct {
        @Struct.field(lot_info, {array: true})
        declare lots: lot_info[]
        @Struct.field(UInt64)
        declare next: UInt64
    }
    @Struct.type('lots_row')
    export class lots_row extends Struct {
        @Struct.field(UInt64)
        declare asset_id: UInt64
        @Struct.field(Name)
        declare grade: Name
        @Struct.field(UInt64)
        declare auction_id: UInt64
    }
    @Struct.type('rescuenft')
    export class rescuenft extends Struct {
        @Struct.field(UInt64, {array: true})
        declare asset_ids: UInt64[]
        @Struct.field(Name)
        declare to: Name
        @Struct.field('string')
        declare memo: string
    }
    @Struct.type('setbenef')
    export class setbenef extends Struct {
        @Struct.field(beneficiary, {array: true})
        declare registry: beneficiary[]
    }
    @Struct.type('setmarket')
    export class setmarket extends Struct {
        @Struct.field(Name)
        declare market: Name
        @Struct.field(Name)
        declare maker_marketplace: Name
    }
    @Struct.type('setterms')
    export class setterms extends Struct {
        @Struct.field(Name)
        declare grade: Name
        @Struct.field(Asset)
        declare starting_bid: Asset
        @Struct.field(UInt32)
        declare duration: UInt32
    }
    @Struct.type('settings_row')
    export class settings_row extends Struct {
        @Struct.field(Name)
        declare market: Name
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
        @Struct.field(Name)
        declare maker_marketplace: Name
    }
    @Struct.type('settoken')
    export class settoken extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('sweep')
    export class sweep extends Struct {
        @Struct.field(UInt32)
        declare max_lots: UInt32
    }
    @Struct.type('tend')
    export class tend extends Struct {
        @Struct.field(UInt64, {array: true})
        declare asset_ids: UInt64[]
    }
    @Struct.type('terms_row')
    export class terms_row extends Struct {
        @Struct.field(Name)
        declare grade: Name
        @Struct.field(Asset)
        declare starting_bid: Asset
        @Struct.field(UInt32)
        declare duration: UInt32
    }
    @Struct.type('token_row')
    export class token_row extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
}
export const TableMap = {
    accrued: Types.accrued_row,
    benefs: Types.benef_row,
    cursor: Types.cursor_row,
    lots: Types.lots_row,
    settings: Types.settings_row,
    terms: Types.terms_row,
    tokens: Types.token_row,
}
export interface TableTypes {
    accrued: Types.accrued_row
    benefs: Types.benef_row
    cursor: Types.cursor_row
    lots: Types.lots_row
    settings: Types.settings_row
    terms: Types.terms_row
    tokens: Types.token_row
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {
        export interface beneficiary {
            account: NameType
            bps: UInt16Type
        }
    }
    export interface addtoken {
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface claim {
        beneficiary_account: NameType
    }
    export interface collect {}
    export interface deltoken {
        token_contract: NameType
    }
    export interface getlots {
        lower_bound: UInt64Type
        max_lots: UInt32Type
    }
    export interface gettendable {
        max_lots: UInt32Type
    }
    export interface rescuenft {
        asset_ids: UInt64Type[]
        to: NameType
        memo: string
    }
    export interface setbenef {
        registry: Type.beneficiary[]
    }
    export interface setmarket {
        market: NameType
        maker_marketplace: NameType
    }
    export interface setterms {
        grade: NameType
        starting_bid: AssetType
        duration: UInt32Type
    }
    export interface settoken {
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface sweep {
        max_lots: UInt32Type
    }
    export interface tend {
        asset_ids: UInt64Type[]
    }
}
export interface ActionNameParams {
    addtoken: ActionParams.addtoken
    claim: ActionParams.claim
    collect: ActionParams.collect
    deltoken: ActionParams.deltoken
    getlots: ActionParams.getlots
    gettendable: ActionParams.gettendable
    rescuenft: ActionParams.rescuenft
    setbenef: ActionParams.setbenef
    setmarket: ActionParams.setmarket
    setterms: ActionParams.setterms
    settoken: ActionParams.settoken
    sweep: ActionParams.sweep
    tend: ActionParams.tend
}
export type ActionNames = keyof ActionNameParams
export interface ActionReturnValues {
    getlots: Types.lots_result
    gettendable: UInt64[]
}
export type ActionReturnNames = keyof ActionReturnValues
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('fnd.shipload'),
        })
    }
    action<T extends ActionNames>(
        name: T,
        data: ActionNameParams[T],
        options?: ActionOptions
    ): Action {
        return super.action(name, data, options)
    }
    readonly<T extends ActionReturnNames>(
        name: T,
        data?: ActionNameParams[T]
    ): ActionReturnValues[T] {
        return super.readonly(name, data) as unknown as ActionReturnValues[T]
    }
    table<T extends TableNames>(name: T, scope?: NameType): Table<RowType<T>> {
        return super.table(name, scope, TableMap[name])
    }
}
