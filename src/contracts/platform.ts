import type {Action, Checksum256Type, NameType, UInt32Type, UInt64Type} from '@wharfkit/antelope'
import {
    ABI,
    Blob,
    Checksum256,
    Name,
    Struct,
    TimePointSec,
    UInt32,
    UInt64,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yAA0KY2xlYXJ0YWJsZQADCnRhYmxlX25hbWUEbmFtZQVzY29wZQVuYW1lPwhtYXhfcm93cwd1aW50NjQ/C2NvbXBhbnlfcm93AAIHYWNjb3VudARuYW1lBG5hbWUGc3RyaW5nBmVuYWJsZQABB2VuYWJsZWQEYm9vbAplbmFibGVnYW1lAAIIY29udHJhY3QEbmFtZQdlbmFibGVkBGJvb2wMZm91bmRjb21wYW55AAIHYWNjb3VudARuYW1lBG5hbWUGc3RyaW5nC2dhbWVfY29uZmlnAAQEc2VlZAtjaGVja3N1bTI1NgllcG9jaHRpbWUGdWludDMyBXN0YXJ0DnRpbWVfcG9pbnRfc2VjA2VuZA50aW1lX3BvaW50X3NlYwlnYW1lX21ldGEABARuYW1lBnN0cmluZwtkZXNjcmlwdGlvbgZzdHJpbmcDdXJsBnN0cmluZwd2ZXJzaW9uBnN0cmluZwhnYW1lX3JvdwAECGNvbnRyYWN0BG5hbWUGY29uZmlnC2dhbWVfY29uZmlnBG1ldGEJZ2FtZV9tZXRhBXN0YXRlCmdhbWVfc3RhdGUKZ2FtZV9zdGF0ZQABB2VuYWJsZWQEYm9vbAlzdGFydGdhbWUABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCXN0YXRlX3JvdwABB2VuYWJsZWQEYm9vbAp1cGRhdGVnYW1lAAIIY29udHJhY3QEbmFtZQRtZXRhCWdhbWVfbWV0YQR3aXBlAAAHAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAACoeMxUBmVuYWJsZfMBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnRW5hYmxlL2Rpc2FibGUgcGxhdGZvcm0nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGUgcGxhdGZvcm0gY29udHJhY3QuAICShql4zFQKZW5hYmxlZ2FtZfwBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZWdhbWUKc3VtbWFyeTogJ0VuYWJsZS9kaXNiYWJsZSBhIGdhbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGUgc3BlY2lmaWVkIGdhbWUgY29udHJhY3Qu4KepkqI0NV0MZm91bmRjb21wYW55gwItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZm91bmRjb21wYW55CnN1bW1hcnk6ICdGb3VuZCBhIG5ldyBjb21wYW55JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKRm91bmQgYSBuZXcgY29tcGFueSBpbiB0aGUgU2hpcGxvYWQgcGxhdGZvcm0gY29udHJhY3QuAABQ0rB8TcYJc3RhcnRnYW1l/wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc3RhcnRnYW1lCnN1bW1hcnk6ICdTdGFydCBhIG5ldyBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKU3RhcnQgYSBuZXcgZ2FtZSBvZiBTaGlwbG9hZCBkZXBsb3llZCB0byBhIG5ldyBjb250cmFjdC4AgJKGqWxS1Qp1cGRhdGVnYW1ljQItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdXBkYXRlZ2FtZQpzdW1tYXJ5OiAnVXBkYXRlIGdhbWUgaW5mb3JtYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpVcGRhdGUgdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGVjaWZpZWQgZ2FtZSBjb250cmFjdC4KCi0tLQAAAAAAoKrjBHdpcGWyAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlCnN1bW1hcnk6ICdERUJVRzogd2lwZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0DAAAAwE9TJUUDaTY0AAALY29tcGFueV9yb3cAAAAAAKykYQNpNjQAAAhnYW1lX3JvdwAAAAAAlU3GA2k2NAAACXN0YXRlX3JvdwETU2hpcGxvYWQgKFBsYXRmb3JtKRNTaGlwbG9hZCAoUGxhdGZvcm0pAAAAAA=='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('cleartable')
    export class cleartable extends Struct {
        @Struct.field(Name)
        declare table_name: Name
        @Struct.field(Name, {optional: true})
        declare scope?: Name
        @Struct.field(UInt64, {optional: true})
        declare max_rows?: UInt64
    }
    @Struct.type('company_row')
    export class company_row extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field('string')
        declare name: string
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
    @Struct.type('updategame')
    export class updategame extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(game_meta)
        declare meta: game_meta
    }
    @Struct.type('wipe')
    export class wipe extends Struct {}
}
export const TableMap = {
    company: Types.company_row,
    games: Types.game_row,
    state: Types.state_row,
}
export interface TableTypes {
    company: Types.company_row
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
    export interface startgame {
        contract: NameType
        config: Type.game_config
        meta: Type.game_meta
        state: Type.game_state
    }
    export interface updategame {
        contract: NameType
        meta: Type.game_meta
    }
    export interface wipe {}
}
export interface ActionNameParams {
    cleartable: ActionParams.cleartable
    enable: ActionParams.enable
    enablegame: ActionParams.enablegame
    foundcompany: ActionParams.foundcompany
    startgame: ActionParams.startgame
    updategame: ActionParams.updategame
    wipe: ActionParams.wipe
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('platform.gm'),
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
