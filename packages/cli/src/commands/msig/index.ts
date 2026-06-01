import type {Command} from 'commander'
import * as approve from './approve'
import * as cancel from './cancel'
import * as exec from './exec'
import * as show from './show'

export function register(program: Command): void {
    const parent = program
        .command('msig')
        .description('Create, approve, and execute eosio.msig proposals')
    show.register(parent)
    approve.register(parent)
    exec.register(parent)
    cancel.register(parent)
}
