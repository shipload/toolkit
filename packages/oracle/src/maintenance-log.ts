export type SweepOutcome =
    | {kind: 'productive'; line: string}
    | {kind: 'idle'}
    | {kind: 'failed'; line: string}

export interface MaintenanceLogState {
    loggedAt: number
}

export interface MaintenanceLogPlan {
    out: string[]
    err: string[]
}

export const MAINTENANCE_IDLE_LINE = 'maintenance: idle'

export function planMaintenanceLog(
    outcomes: SweepOutcome[],
    prev: MaintenanceLogState | null,
    now: number,
    heartbeatMs: number
): MaintenanceLogPlan {
    const out = outcomes.filter((o) => o.kind === 'productive').map((o) => o.line)
    const err = outcomes.filter((o) => o.kind === 'failed').map((o) => o.line)
    if (out.length > 0 || err.length > 0) return {out, err}
    if (!prev || now - prev.loggedAt >= heartbeatMs) return {out: [MAINTENANCE_IDLE_LINE], err: []}
    return {out: [], err: []}
}

export function planLogged(plan: MaintenanceLogPlan): boolean {
    return plan.out.length > 0 || plan.err.length > 0
}
