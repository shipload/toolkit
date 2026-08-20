import {describeLoopError} from '../../lib/errors'
import {
    completeReadyChartersOnce,
    pokeMintReadyOnce,
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
        console.log(`${stamp()} ${formatMintReady(await pokeMintReadyOnce(ctx))}`)
    } catch (err) {
        console.error(`${stamp()} mint sweep failed: ${describeLoopError(err)}`)
    }
    try {
        console.log(`${stamp()} ${formatCharterReady(await completeReadyChartersOnce(ctx))}`)
    } catch (err) {
        console.error(`${stamp()} charter sweep failed: ${describeLoopError(err)}`)
    }
    try {
        console.log(`${stamp()} ${formatVoteReady(await settleReadyBallotsOnce(ctx))}`)
    } catch (err) {
        console.error(`${stamp()} ballot sweep failed: ${describeLoopError(err)}`)
    }
    try {
        console.log(`${stamp()} ${formatTend(await tendFundOnce(ctx))}`)
    } catch (err) {
        console.error(`${stamp()} fund sweep failed: ${describeLoopError(err)}`)
    }
}
