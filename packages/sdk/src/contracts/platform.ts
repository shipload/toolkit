import type {
    Action,
    AssetType,
    Checksum256Type,
    ExtendedAssetType,
    NameType,
    UInt32Type,
    UInt64Type,
} from '@wharfkit/antelope'
import {
    ABI,
    Asset,
    Blob,
    Checksum256,
    ExtendedAsset,
    Name,
    Struct,
    TimePointSec,
    UInt32,
    UInt64,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yABkLYmFsYW5jZV9yb3cAAg50b2tlbl9jb250cmFjdARuYW1lB2JhbGFuY2UFYXNzZXQKY2xlYXJ0YWJsZQADCnRhYmxlX25hbWUEbmFtZQVzY29wZQVuYW1lPwhtYXhfcm93cwd1aW50NjQ/BWNsb3NlAAMFb3duZXIEbmFtZQ50b2tlbl9jb250cmFjdARuYW1lDHRva2VuX3N5bWJvbAZzeW1ib2wLY29tcGFueV9yb3cAAgdhY2NvdW50BG5hbWUEbmFtZQZzdHJpbmcMZGViaXRkZXBvc2l0AAUFb3duZXIEbmFtZQV0b2tlbgRuYW1lBmxvY2tlZAVhc3NldAtmZWVfYWNjb3VudARuYW1lA2ZlZQVhc3NldAlkZXBsb3luZnQABARnYW1lBG5hbWUFb3duZXIEbmFtZQhhc3NldF9pZAZ1aW50NjQPdGFyZ2V0X25leHVzX2lkBnVpbnQ2NA5kZXBvc2l0Y2ZnX3JvdwACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAZlbmFibGUAAQdlbmFibGVkBGJvb2wKZW5hYmxlZ2FtZQACCGNvbnRyYWN0BG5hbWUHZW5hYmxlZARib29sDGZvdW5kY29tcGFueQACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwtnYW1lX2NvbmZpZwAEBHNlZWQLY2hlY2tzdW0yNTYJZXBvY2h0aW1lBnVpbnQzMgVzdGFydA50aW1lX3BvaW50X3NlYwNlbmQOdGltZV9wb2ludF9zZWMJZ2FtZV9tZXRhAAQEbmFtZQZzdHJpbmcLZGVzY3JpcHRpb24Gc3RyaW5nA3VybAZzdHJpbmcHdmVyc2lvbgZzdHJpbmcIZ2FtZV9yb3cABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCmdhbWVfc3RhdGUAAQdlbmFibGVkBGJvb2wEb3BlbgADBW93bmVyBG5hbWUOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sDHNldGVwb2NodGltZQACCGNvbnRyYWN0BG5hbWUJZXBvY2h0aW1lBnVpbnQzMghzZXR0b2tlbgACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAlzdGFydGdhbWUABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCXN0YXRlX3JvdwABB2VuYWJsZWQEYm9vbAl1bndyYXBuZnQABARnYW1lBG5hbWUFb3duZXIEbmFtZQhhc3NldF9pZAZ1aW50NjQHaG9zdF9pZAZ1aW50NjQKdXBkYXRlZ2FtZQACCGNvbnRyYWN0BG5hbWUEbWV0YQlnYW1lX21ldGEEd2lwZQAACHdpdGhkcmF3AAMFb3duZXIEbmFtZQhxdWFudGl0eQ5leHRlbmRlZF9hc3NldARtZW1vBnN0cmluZwR3cmFwAAYEZ2FtZQRuYW1lBW93bmVyBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhuZXh1c19pZAZ1aW50NjQIY2FyZ29faWQGdWludDY0CHF1YW50aXR5BnVpbnQ2NAp3cmFwZW50aXR5AAQEZ2FtZQRuYW1lBW93bmVyBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhuZXh1c19pZAZ1aW50NjQRAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAAAAhWlEBWNsb3NlAJAdplWl7I5KDGRlYml0ZGVwb3NpdAAAAMhrehqrSglkZXBsb3luZnQAAAAAAKh4zFQGZW5hYmxl8wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZW5hYmxlCnN1bW1hcnk6ICdFbmFibGUvZGlzYWJsZSBwbGF0Zm9ybScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoZSBwbGF0Zm9ybSBjb250cmFjdC4AgJKGqXjMVAplbmFibGVnYW1l/AEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZW5hYmxlZ2FtZQpzdW1tYXJ5OiAnRW5hYmxlL2Rpc2JhYmxlIGEgZ2FtZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoZSBzcGVjaWZpZWQgZ2FtZSBjb250cmFjdC7gp6mSojQ1XQxmb3VuZGNvbXBhbnmDAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBmb3VuZGNvbXBhbnkKc3VtbWFyeTogJ0ZvdW5kIGEgbmV3IGNvbXBhbnknCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpGb3VuZCBhIG5ldyBjb21wYW55IGluIHRoZSBTaGlwbG9hZCBwbGF0Zm9ybSBjb250cmFjdC4AAAAAADBVpQRvcGVuAKCkyw3RqrLCDHNldGVwb2NodGltZcQCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNldGVwb2NodGltZQpzdW1tYXJ5OiAnREVCVUc6IG92ZXJyaWRlIGEgZ2FtZScncyBlcG9jaCB0aW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpPdmVycmlkZSB0aGUgZXBvY2ggZHVyYXRpb24gaW4gdGhlIGNvbmZpZ3VyYXRpb24gb2YgdGhlIHNwZWNpZmllZCBnYW1lIGNvbnRyYWN0LiBSZXF1aXJlcyBwbGF0Zm9ybSBjb250cmFjdCBhdXRob3JpdHkuAAAAU0Gas8IIc2V0dG9rZW4AAABQ0rB8TcYJc3RhcnRnYW1l/wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc3RhcnRnYW1lCnN1bW1hcnk6ICdTdGFydCBhIG5ldyBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKU3RhcnQgYSBuZXcgZ2FtZSBvZiBTaGlwbG9hZCBkZXBsb3llZCB0byBhIG5ldyBjb250cmFjdC4AAMhrVnP51Al1bndyYXBuZnQAAICShqlsUtUKdXBkYXRlZ2FtZY0CLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVwZGF0ZWdhbWUKc3VtbWFyeTogJ1VwZGF0ZSBnYW1lIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKVXBkYXRlIHRoZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc3BlY2lmaWVkIGdhbWUgY29udHJhY3QuCgotLS0AAAAAAKCq4wR3aXBlsgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogd2lwZQpzdW1tYXJ5OiAnREVCVUc6IHdpcGUgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAAAA3NzUsuMId2l0aGRyYXcAAAAAAABQzeUEd3JhcAAAgM8uT1XN5Qp3cmFwZW50aXR5AAUAAABAoWmiOQNpNjQAAAtiYWxhbmNlX3JvdwAAAMBPUyVFA2k2NAAAC2NvbXBhbnlfcm93AABbKDtMq0oDaTY0AAAOZGVwb3NpdGNmZ19yb3cAAAAAAKykYQNpNjQAAAhnYW1lX3JvdwAAAAAAlU3GA2k2NAAACXN0YXRlX3JvdwETU2hpcGxvYWQgKFBsYXRmb3JtKRNTaGlwbG9hZCAoUGxhdGZvcm0pAAAAAA=='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('balance_row')
    export class balance_row extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset)
        declare balance: Asset
    }
    @Struct.type('cleartable')
    export class cleartable extends Struct {
        @Struct.field(Name)
        declare table_name: Name
        @Struct.field(Name, {optional: true})
        declare scope?: Name
        @Struct.field(UInt64, {optional: true})
        declare max_rows?: UInt64
    }
    @Struct.type('close')
    export class close extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('company_row')
    export class company_row extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field('string')
        declare name: string
    }
    @Struct.type('debitdeposit')
    export class debitdeposit extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare token: Name
        @Struct.field(Asset)
        declare locked: Asset
        @Struct.field(Name)
        declare fee_account: Name
        @Struct.field(Asset)
        declare fee: Asset
    }
    @Struct.type('deploynft')
    export class deploynft extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare asset_id: UInt64
        @Struct.field(UInt64)
        declare target_nexus_id: UInt64
    }
    @Struct.type('depositcfg_row')
    export class depositcfg_row extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('enable')
    export class enable extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('enablegame')
    export class enablegame extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('foundcompany')
    export class foundcompany extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field('string')
        declare name: string
    }
    @Struct.type('game_config')
    export class game_config extends Struct {
        @Struct.field(Checksum256)
        declare seed: Checksum256
        @Struct.field(UInt32)
        declare epochtime: UInt32
        @Struct.field(TimePointSec)
        declare start: TimePointSec
        @Struct.field(TimePointSec)
        declare end: TimePointSec
    }
    @Struct.type('game_meta')
    export class game_meta extends Struct {
        @Struct.field('string')
        declare name: string
        @Struct.field('string')
        declare description: string
        @Struct.field('string')
        declare url: string
        @Struct.field('string')
        declare version: string
    }
    @Struct.type('game_state')
    export class game_state extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('game_row')
    export class game_row extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(game_config)
        declare config: game_config
        @Struct.field(game_meta)
        declare meta: game_meta
        @Struct.field(game_state)
        declare state: game_state
    }
    @Struct.type('open')
    export class open extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('setepochtime')
    export class setepochtime extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(UInt32)
        declare epochtime: UInt32
    }
    @Struct.type('settoken')
    export class settoken extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('startgame')
    export class startgame extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(game_config)
        declare config: game_config
        @Struct.field(game_meta)
        declare meta: game_meta
        @Struct.field(game_state)
        declare state: game_state
    }
    @Struct.type('state_row')
    export class state_row extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('unwrapnft')
    export class unwrapnft extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare asset_id: UInt64
        @Struct.field(UInt64)
        declare host_id: UInt64
    }
    @Struct.type('updategame')
    export class updategame extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(game_meta)
        declare meta: game_meta
    }
    @Struct.type('wipe')
    export class wipe extends Struct {}
    @Struct.type('withdraw')
    export class withdraw extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(ExtendedAsset)
        declare quantity: ExtendedAsset
        @Struct.field('string')
        declare memo: string
    }
    @Struct.type('wrap')
    export class wrap extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt64)
        declare nexus_id: UInt64
        @Struct.field(UInt64)
        declare cargo_id: UInt64
        @Struct.field(UInt64)
        declare quantity: UInt64
    }
    @Struct.type('wrapentity')
    export class wrapentity extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt64)
        declare nexus_id: UInt64
    }
}
export const TableMap = {
    balance: Types.balance_row,
    company: Types.company_row,
    depositcfg: Types.depositcfg_row,
    games: Types.game_row,
    state: Types.state_row,
}
export interface TableTypes {
    balance: Types.balance_row
    company: Types.company_row
    depositcfg: Types.depositcfg_row
    games: Types.game_row
    state: Types.state_row
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {
        export interface game_config {
            seed: Checksum256Type
            epochtime: UInt32Type
            start: TimePointSec
            end: TimePointSec
        }
        export interface game_meta {
            name: string
            description: string
            url: string
            version: string
        }
        export interface game_state {
            enabled: boolean
        }
    }
    export interface cleartable {
        table_name: NameType
        scope?: NameType
        max_rows?: UInt64Type
    }
    export interface close {
        owner: NameType
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface debitdeposit {
        owner: NameType
        token: NameType
        locked: AssetType
        fee_account: NameType
        fee: AssetType
    }
    export interface deploynft {
        game: NameType
        owner: NameType
        asset_id: UInt64Type
        target_nexus_id: UInt64Type
    }
    export interface enable {
        enabled: boolean
    }
    export interface enablegame {
        contract: NameType
        enabled: boolean
    }
    export interface foundcompany {
        account: NameType
        name: string
    }
    export interface open {
        owner: NameType
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface setepochtime {
        contract: NameType
        epochtime: UInt32Type
    }
    export interface settoken {
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface startgame {
        contract: NameType
        config: Type.game_config
        meta: Type.game_meta
        state: Type.game_state
    }
    export interface unwrapnft {
        game: NameType
        owner: NameType
        asset_id: UInt64Type
        host_id: UInt64Type
    }
    export interface updategame {
        contract: NameType
        meta: Type.game_meta
    }
    export interface wipe {}
    export interface withdraw {
        owner: NameType
        quantity: ExtendedAssetType
        memo: string
    }
    export interface wrap {
        game: NameType
        owner: NameType
        entity_id: UInt64Type
        nexus_id: UInt64Type
        cargo_id: UInt64Type
        quantity: UInt64Type
    }
    export interface wrapentity {
        game: NameType
        owner: NameType
        entity_id: UInt64Type
        nexus_id: UInt64Type
    }
}
export interface ActionNameParams {
    cleartable: ActionParams.cleartable
    close: ActionParams.close
    debitdeposit: ActionParams.debitdeposit
    deploynft: ActionParams.deploynft
    enable: ActionParams.enable
    enablegame: ActionParams.enablegame
    foundcompany: ActionParams.foundcompany
    open: ActionParams.open
    setepochtime: ActionParams.setepochtime
    settoken: ActionParams.settoken
    startgame: ActionParams.startgame
    unwrapnft: ActionParams.unwrapnft
    updategame: ActionParams.updategame
    wipe: ActionParams.wipe
    withdraw: ActionParams.withdraw
    wrap: ActionParams.wrap
    wrapentity: ActionParams.wrapentity
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('nex.shipload'),
        })
    }
    action<T extends ActionNames>(
        name: T,
        data: ActionNameParams[T],
        options?: ActionOptions
    ): Action {
        return super.action(name, data, options)
    }
    table<T extends TableNames>(name: T, scope?: NameType): Table<RowType<T>> {
        return super.table(name, scope, TableMap[name])
    }
}
