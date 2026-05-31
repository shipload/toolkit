import type {Command} from 'commander'
import * as clean from './clean'
import * as keygen from './keygen'
import * as run from './run'
import * as status from './status'
import * as tick from './tick'

export function register(program: Command): void {
    const parent = program
        .command('oracle')
        .description('Run the multi-oracle commit/reveal beacon (operator client)')
    tick.register(parent)
    run.register(parent)
    status.register(parent)
    clean.register(parent)
    keygen.register(parent)
}
