import type {Command} from 'commander'
import {buildOracleContext, tickOnce} from './context'
import {formatTick} from './format'
import {runMaintenancePass} from './maintenance-pass'

export function register(parent: Command): void {
    parent
        .command('tick')
        .description('Run one commit+reveal pass and exit (for cron / systemd-timer)')
        .option('--maintenance', 'also run one mint/charter/ballot/fund maintenance pass', false)
        .action(async (opts: {maintenance: boolean}) => {
            const ctx = await buildOracleContext()
            try {
                const result = await tickOnce(ctx)
                console.log(formatTick(result))
                if (opts.maintenance) {
                    await runMaintenancePass(ctx)
                }
            } finally {
                ctx.close()
            }
        })
}
