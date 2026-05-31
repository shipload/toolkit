import type {Command} from 'commander'
import {buildOracleContext, tickOnce} from './context'
import {formatTick} from './format'

export function register(parent: Command): void {
    parent
        .command('tick')
        .description('Run one commit+reveal pass and exit (for cron / systemd-timer)')
        .action(async () => {
            const ctx = await buildOracleContext()
            try {
                const result = await tickOnce(ctx)
                console.log(formatTick(result))
            } finally {
                ctx.close()
            }
        })
}
