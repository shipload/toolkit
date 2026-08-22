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
    'DmVvc2lvOjphYmkvMS4yABALYWNjcnVlZF9yb3cAAgdhY2NvdW50BG5hbWUHYmFsYW5jZQVhc3NldAliZW5lZl9yb3cAAgdhY2NvdW50BG5hbWUDYnBzBnVpbnQxNgtiZW5lZmljaWFyeQACB2FjY291bnQEbmFtZQNicHMGdWludDE2BWNsYWltAAETYmVuZWZpY2lhcnlfYWNjb3VudARuYW1lCmN1cnNvcl9yb3cAAQ1uZXh0X2Fzc2V0X2lkBnVpbnQ2NAtnZXR0ZW5kYWJsZQABCG1heF9sb3RzBnVpbnQzMghsb3RzX3JvdwADCGFzc2V0X2lkBnVpbnQ2NAVncmFkZQRuYW1lCmF1Y3Rpb25faWQGdWludDY0CXJlc2N1ZW5mdAADCWFzc2V0X2lkcwh1aW50NjRbXQJ0bwRuYW1lBG1lbW8Gc3RyaW5nCHNldGJlbmVmAAEIcmVnaXN0cnkNYmVuZWZpY2lhcnlbXQlzZXRtYXJrZXQAAgZtYXJrZXQEbmFtZRFtYWtlcl9tYXJrZXRwbGFjZQRuYW1lCHNldHRlcm1zAAMFZ3JhZGUEbmFtZQxzdGFydGluZ19iaWQFYXNzZXQIZHVyYXRpb24GdWludDMyDHNldHRpbmdzX3JvdwAEBm1hcmtldARuYW1lDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbBFtYWtlcl9tYXJrZXRwbGFjZQRuYW1lCHNldHRva2VuAAIOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sBXN3ZWVwAAEIbWF4X2xvdHMGdWludDMyBHRlbmQAAQlhc3NldF9pZHMIdWludDY0W10JdGVybXNfcm93AAMFZ3JhZGUEbmFtZQxzdGFydGluZ19iaWQFYXNzZXQIZHVyYXRpb24GdWludDMyCQAAAAAA6UxEBWNsYWltAABUPCZNlbNiC2dldHRlbmRhYmxlAAAAyGsqjbC6CXJlc2N1ZW5mdAAAAABLTXWywghzZXRiZW5lZgAAAMgKXiOzwglzZXRtYXJrZXQAAAAAWF6Vs8IIc2V0dGVybXMAAAAAU0Gas8IIc2V0dG9rZW4AAAAAAICqFMcFc3dlZXAAAAAAAACQpsoEdGVuZAAGAAAAICl9ETIDaTY0AAALYWNjcnVlZF9yb3cAAAAA4KWmOgNpNjQAAAliZW5lZl9yb3cAAAAAXIqvRgNpNjQAAApjdXJzb3Jfcm93AAAAAACAM40DaTY0AAAIbG90c19yb3cAAACYTZezwgNpNjQAAAxzZXR0aW5nc19yb3cAAAAAACyvygNpNjQAAAl0ZXJtc19yb3cAAAAAAQBUPCZNlbNiCHVpbnQ2NFtd'
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('accrued_row')
    export class accrued_row extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(Asset)
        declare balance: Asset
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
    @Struct.type('cursor_row')
    export class cursor_row extends Struct {
        @Struct.field(UInt64)
        declare next_asset_id: UInt64
    }
    @Struct.type('gettendable')
    export class gettendable extends Struct {
        @Struct.field(UInt32)
        declare max_lots: UInt32
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
}
export const TableMap = {
    accrued: Types.accrued_row,
    benefs: Types.benef_row,
    cursor: Types.cursor_row,
    lots: Types.lots_row,
    settings: Types.settings_row,
    terms: Types.terms_row,
}
export interface TableTypes {
    accrued: Types.accrued_row
    benefs: Types.benef_row
    cursor: Types.cursor_row
    lots: Types.lots_row
    settings: Types.settings_row
    terms: Types.terms_row
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
    export interface claim {
        beneficiary_account: NameType
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
    claim: ActionParams.claim
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
