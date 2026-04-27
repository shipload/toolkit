import type {Command} from 'commander'
import {server} from '../../lib/client'
import {formatOutput, formatPlayer} from '../../lib/format'
import {getAccountName} from '../../lib/session'

export function render(info: any): string {
    return formatPlayer(info)
}

export function register(program: Command): void {
    program
        .command('player')
        .description('Show player info (defaults to self)')
        .argument('[account]', 'account name')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (account: string | undefined, opts: {json?: boolean}) => {
            const target = account ?? getAccountName()
            const data = await server.readonly('getplayer', {account: target})
            console.log(formatOutput(data, {json: Boolean(opts.json)}, render))
        })
}
