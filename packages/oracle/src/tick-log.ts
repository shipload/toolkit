import type {TickResult} from './run-once'

export interface TickLogState {
    signature: string
    loggedAt: number
}

export function tickSignature(r: TickResult): string {
    return `${r.target}|${r.commit}|${r.reveal}`
}

export function shouldLogTick(
    r: TickResult,
    prev: TickLogState | null,
    now: number,
    heartbeatMs: number
): boolean {
    if (!prev) return true
    if (tickSignature(r) !== prev.signature) return true
    return now - prev.loggedAt >= heartbeatMs
}
