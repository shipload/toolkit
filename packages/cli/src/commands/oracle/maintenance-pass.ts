import {
    planLogged,
    planMaintenanceLog,
    type MaintenanceLogState,
    type SweepOutcome,
} from '@shipload/oracle'
import {describeLoopError, isIdleCrankError} from '../../lib/errors'
import {
    collectFundFeesOnce,
    collectFundOnce,
    completeReadyChartersOnce,
    mintReadyOnce,
    settleReadyBallotsOnce,
    tendFundOnce,
    type OracleContext,
} from './context'
import {
    formatCharterReady,
    formatCollect,
    formatMintReady,
    formatTend,
    formatVoteReady,
} from './format'

function stamp(): string {
    return new Date().toISOString()
}

async function sweep<T extends {kind: string}>(
    label: string,
    run: () => Promise<T>,
    productive: T['kind'],
    format: (r: T) => string
): Promise<SweepOutcome> {
    try {
        const result = await run()
        if (result.kind !== productive) return {kind: 'idle'}
        return {kind: 'productive', line: format(result)}
    } catch (err) {
        if (isIdleCrankError(err)) return {kind: 'idle'}
        return {kind: 'failed', line: `${label} sweep failed: ${describeLoopError(err)}`}
    }
}

export async function runMaintenancePass(
    ctx: OracleContext,
    prev: MaintenanceLogState | null = null,
    heartbeatMs = 0,
    now: number = Date.now()
): Promise<MaintenanceLogState | null> {
    const outcomes: SweepOutcome[] = [
        await sweep('mint', () => mintReadyOnce(ctx), 'minted', formatMintReady),
        await sweep(
            'charter',
            () => completeReadyChartersOnce(ctx),
            'completed',
            formatCharterReady
        ),
        await sweep('ballot', () => settleReadyBallotsOnce(ctx), 'settled', formatVoteReady),
        await sweep('fund', () => tendFundOnce(ctx), 'tended', formatTend),
    ]
    const plan = planMaintenanceLog(outcomes, prev, now, heartbeatMs)
    for (const line of plan.out) console.log(`${stamp()} ${line}`)
    for (const line of plan.err) console.error(`${stamp()} ${line}`)
    return planLogged(plan) ? {loggedAt: now} : prev
}

export async function runCollectPass(ctx: Pick<OracleContext, 'fund'>): Promise<void> {
    const outcomes: SweepOutcome[] = [
        await sweep('collect', () => collectFundOnce(ctx), 'collected', formatCollect),
        await sweep('collectfees', () => collectFundFeesOnce(ctx), 'collected', formatCollect),
    ]
    for (const outcome of outcomes) {
        if (outcome.kind === 'productive') console.log(`${stamp()} ${outcome.line}`)
        if (outcome.kind === 'failed') console.error(`${stamp()} ${outcome.line}`)
    }
}
