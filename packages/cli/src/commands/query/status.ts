import type {Command} from 'commander'
import {platform, server} from '../../lib/client'
import {formatOutput} from '../../lib/format'

export interface StatusInfo {
    enabled: boolean
    platformAccount: string
    serverAccount: string
}

export function render(info: StatusInfo): string {
    return [
        `Platform:   ${info.platformAccount}`,
        `Server:     ${info.serverAccount}`,
        `Game:       ${info.enabled ? 'enabled' : 'disabled'}`,
    ].join('\n')
}

export function register(program: Command): void {
    program
        .command('status')
        .description('Show game enablement and platform/server accounts')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (opts: {json?: boolean}) => {
            const state = await server.table('state').get()
            const data: StatusInfo = {
                enabled: Boolean(state?.enabled),
                platformAccount: String(platform.account),
                serverAccount: String(server.account),
            }
            console.log(formatOutput(data, {json: Boolean(opts.json)}, render))
        })
}
