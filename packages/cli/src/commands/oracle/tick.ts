import type {Command} from 'commander'
import {loadOracleConfig} from '../../lib/config'
import {checkAdmission} from './admission'
import {buildOracleContext, tickOnce} from './context'
import {describeLoopError} from '../../lib/errors'
import {formatTick, formatWaitingBrief} from './format'
import {runCollectPass, runMaintenancePass} from './maintenance-pass'

export function register(parent: Command): void {
    parent
        .command('tick')
        .description('Run one commit+reveal pass and exit (for cron / systemd-timer)')
        .option('--maintenance', 'also run one mint/charter/ballot/fund maintenance pass', false)
        .option('--collect', 'also run one fund collect/collectfees pass', false)
        .action(async (opts: {maintenance: boolean; collect: boolean}) => {
            const cfg = loadOracleConfig()
            const admission = await checkAdmission(cfg)
            if (admission.state !== 'admitted') {
                console.log(formatWaitingBrief({handle: cfg.handle, state: admission.state}))
                return
            }
            const ctx = await buildOracleContext({verify: false})
            try {
                const result = await tickOnce(ctx)
                console.log(formatTick(result))
                if (opts.maintenance) {
                    await runMaintenancePass(ctx)
                }
                if (opts.collect) await runCollectPass(ctx)
            } catch (err) {
                console.error(`tick failed: ${describeLoopError(err)}`)
                process.exitCode = 1
            } finally {
                ctx.close()
            }
        })
}
