import {describeLoopError, isIdleCrankError} from '../../lib/errors'
import {
    completeReadyChartersOnce,
    mintReadyOnce,
    settleReadyBallotsOnce,
    tendFundOnce,
    type OracleContext,
} from './context'
import {formatCharterReady, formatMintReady, formatTend, formatVoteReady} from './format'

function stamp(): string {
    return new Date().toISOString()
}

export async function runMaintenancePass(ctx: OracleContext): Promise<void> {
    try {
        console.log(`${stamp()} ${formatMintReady(await mintReadyOnce(ctx))}`)
    } catch (err) {
        if (isIdleCrankError(err)) {
            console.log(`${stamp()} mint sweep: nothing ready (raced)`)
        } else {
            console.error(`${stamp()} mint sweep failed: ${describeLoopError(err)}`)
        }
    }
    try {
        console.log(`${stamp()} ${formatCharterReady(await completeReadyChartersOnce(ctx))}`)
    } catch (err) {
        if (isIdleCrankError(err)) {
            console.log(`${stamp()} charter sweep: nothing ready (raced)`)
        } else {
            console.error(`${stamp()} charter sweep failed: ${describeLoopError(err)}`)
        }
    }
    try {
        console.log(`${stamp()} ${formatVoteReady(await settleReadyBallotsOnce(ctx))}`)
    } catch (err) {
        if (isIdleCrankError(err)) {
            console.log(`${stamp()} ballot sweep: nothing ready (raced)`)
        } else {
            console.error(`${stamp()} ballot sweep failed: ${describeLoopError(err)}`)
        }
    }
    try {
        console.log(`${stamp()} ${formatTend(await tendFundOnce(ctx))}`)
    } catch (err) {
        if (isIdleCrankError(err)) {
            console.log(`${stamp()} fund sweep: nothing ready (raced)`)
        } else {
            console.error(`${stamp()} fund sweep failed: ${describeLoopError(err)}`)
        }
    }
}
