import type {Command} from 'commander'
import {describeLoopError} from '../../lib/errors'
import {buildOracleContext, cleanOnce, tickOnce} from './context'
import {formatClean, formatTick} from './format'
import {runMaintenancePass} from './maintenance-pass'

function stamp(): string {
    return new Date().toISOString()
}

export function register(parent: Command): void {
    parent
        .command('run')
        .description('Run the beacon continuously on an interval')
        .option('--interval <seconds>', 'seconds between commit/reveal passes', '10')
        .option('--clean-interval <seconds>', 'seconds between reserve-cleanup passes', '3600')
        .option('--clean-rows <n>', 'max reserve rows erased per cleanup pass', '100')
        .option(
            '--maintenance-interval <seconds>',
            'seconds between mint/charter/ballot/fund maintenance passes',
            '300'
        )
        .action(
            async (opts: {
                interval: string
                cleanInterval: string
                cleanRows: string
                maintenanceInterval: string
            }) => {
                const intervalMs = Math.max(1, Number(opts.interval)) * 1000
                const cleanIntervalMs = Math.max(1, Number(opts.cleanInterval)) * 1000
                const cleanRows = Math.max(1, Number(opts.cleanRows))
                const maintenanceIntervalMs = Math.max(1, Number(opts.maintenanceInterval)) * 1000
                const ctx = await buildOracleContext()
                let stopping = false
                let wake: (() => void) | null = null
                const stop = () => {
                    stopping = true
                    if (wake) wake()
                }
                process.once('SIGINT', stop)
                process.once('SIGTERM', stop)

                const sleep = (ms: number): Promise<void> =>
                    new Promise((res) => {
                        const t = setTimeout(res, ms)
                        wake = () => {
                            clearTimeout(t)
                            res()
                        }
                    })

                let lastCleanAt = 0
                let lastMaintenanceAt = 0
                console.log(
                    `${stamp()} oracle ${ctx.cfg.handle} started (interval ${intervalMs / 1000}s, clean ${cleanIntervalMs / 1000}s, maintenance ${maintenanceIntervalMs / 1000}s)`
                )
                try {
                    while (!stopping) {
                        try {
                            const result = await tickOnce(ctx)
                            console.log(`${stamp()} ${formatTick(result)}`)
                        } catch (err) {
                            console.error(`${stamp()} tick failed: ${describeLoopError(err)}`)
                        }
                        if (Date.now() - lastCleanAt >= cleanIntervalMs) {
                            try {
                                const cleaned = await cleanOnce(ctx, cleanRows)
                                console.log(`${stamp()} ${formatClean(cleaned)}`)
                            } catch (err) {
                                console.error(
                                    `${stamp()} cleanup failed: ${describeLoopError(err)}`
                                )
                            }
                            lastCleanAt = Date.now()
                        }
                        if (Date.now() - lastMaintenanceAt >= maintenanceIntervalMs) {
                            await runMaintenancePass(ctx)
                            lastMaintenanceAt = Date.now()
                        }
                        if (stopping) break
                        await sleep(intervalMs)
                    }
                } finally {
                    ctx.close()
                    console.log(`${stamp()} oracle ${ctx.cfg.handle} stopped`)
                }
            }
        )
}
