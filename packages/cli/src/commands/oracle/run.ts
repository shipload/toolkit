import type {Command} from 'commander'
import {
    shouldLogTick,
    tickSignature,
    type MaintenanceLogState,
    type TickLogState,
} from '@shipload/oracle'
import {describeLoopError} from '../../lib/errors'
import {loadOracleConfig} from '../../lib/config'
import {checkAdmission, isRegistered, resolveResponsibility} from './admission'
import {buildOracleContext, cleanOnce, tickOnce} from './context'
import {formatAdmitted, formatClean, formatTick, formatWaiting, formatWaitingBrief} from './format'
import {runCollectPass, runMaintenancePass} from './maintenance-pass'

const ADMISSION_POLL_MS = 60_000

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
        .option(
            '--collect-interval <seconds>',
            'seconds between fund collect/collectfees passes',
            '21600'
        )
        .option(
            '--heartbeat <seconds>',
            'seconds before an unchanged beacon state is logged again',
            '1800'
        )
        .action(
            async (opts: {
                interval: string
                cleanInterval: string
                cleanRows: string
                maintenanceInterval: string
                collectInterval: string
                heartbeat: string
            }) => {
                const intervalMs = Math.max(1, Number(opts.interval)) * 1000
                const cleanIntervalMs = Math.max(1, Number(opts.cleanInterval)) * 1000
                const cleanRows = Math.max(1, Number(opts.cleanRows))
                const maintenanceIntervalMs = Math.max(1, Number(opts.maintenanceInterval)) * 1000
                const collectIntervalMs = Math.max(1, Number(opts.collectInterval)) * 1000
                const heartbeatMs = Math.max(1, Number(opts.heartbeat)) * 1000
                const cfg = loadOracleConfig()
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
                let lastCollectAt = 0
                let tickLog: TickLogState | null = null
                let maintenanceLog: MaintenanceLogState | null = null
                console.log(
                    `${stamp()} oracle ${cfg.handle} started (interval ${intervalMs / 1000}s, clean ${cleanIntervalMs / 1000}s, maintenance ${maintenanceIntervalMs / 1000}s, collect ${collectIntervalMs / 1000}s, heartbeat ${heartbeatMs / 1000}s)`
                )
                const waitStartedAt = Date.now()
                let lastWaitLogAt = 0
                while (!stopping) {
                    const admission = await checkAdmission(cfg)
                    if (admission.state === 'admitted') {
                        try {
                            const [responsibility, registered] = await Promise.all([
                                resolveResponsibility(cfg.handle),
                                isRegistered(cfg.handle),
                            ])
                            console.log(
                                `${stamp()} ${formatAdmitted({handle: cfg.handle, registered, ...responsibility})}`
                            )
                        } catch (err) {
                            console.log(
                                `${stamp()} oracle ${cfg.handle} admitted: key wired (could not read the epoch registry: ${describeLoopError(err)})`
                            )
                        }
                        break
                    }
                    if (lastWaitLogAt === 0) {
                        console.log(
                            `${stamp()} ${formatWaiting({
                                handle: cfg.handle,
                                actor: cfg.actor,
                                permission: cfg.permission,
                                state: admission.state,
                                detail: admission.detail,
                            })}`
                        )
                        lastWaitLogAt = Date.now()
                    } else if (Date.now() - lastWaitLogAt >= heartbeatMs) {
                        console.log(
                            `${stamp()} ${formatWaitingBrief({
                                handle: cfg.handle,
                                state: admission.state,
                                waitingFor: Math.round((Date.now() - waitStartedAt) / 1000),
                            })}`
                        )
                        lastWaitLogAt = Date.now()
                    }
                    await sleep(ADMISSION_POLL_MS)
                }
                if (stopping) {
                    console.log(`${stamp()} oracle ${cfg.handle} stopped`)
                    return
                }
                const ctx = await buildOracleContext({verify: false})
                try {
                    while (!stopping) {
                        try {
                            const result = await tickOnce(ctx)
                            const now = Date.now()
                            if (shouldLogTick(result, tickLog, now, heartbeatMs)) {
                                console.log(`${stamp()} ${formatTick(result)}`)
                                tickLog = {signature: tickSignature(result), loggedAt: now}
                            }
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
                            maintenanceLog = await runMaintenancePass(
                                ctx,
                                maintenanceLog,
                                heartbeatMs
                            )
                            lastMaintenanceAt = Date.now()
                        }
                        if (Date.now() - lastCollectAt >= collectIntervalMs) {
                            await runCollectPass(ctx)
                            lastCollectAt = Date.now()
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
