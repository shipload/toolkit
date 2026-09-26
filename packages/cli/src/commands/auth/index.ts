import type {Command} from 'commander'
import * as create from './create'
import * as link from './link'
import * as revoke from './revoke'
import * as status from './status'

export function register(program: Command): void {
    const parent = program
        .command('auth')
        .description('Give this CLI a restricted signing key linked only to the game')
    create.register(parent)
    link.register(parent)
    status.register(parent)
    revoke.register(parent)
}
