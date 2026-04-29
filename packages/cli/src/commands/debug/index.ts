import type {Command} from 'commander'
import * as actions from './actions'
import * as code from './code'
import * as entity from './entity'
import * as setcodes from './setcodes'
import * as trace from './trace'
import * as wasmGrep from './wasm-grep'
import * as wasmImports from './wasm-imports'

export function register(program: Command): void {
    const debug = program
        .command('debug')
        .description('Forensic chain/history/WASM diagnostics — operator/dev tools')
    entity.registerSubcommand(debug)
    code.registerSubcommand(debug)
    actions.registerSubcommand(debug)
    setcodes.registerSubcommand(debug)
    trace.registerSubcommand(debug)
    wasmImports.registerSubcommand(debug)
    wasmGrep.registerSubcommand(debug)
}
