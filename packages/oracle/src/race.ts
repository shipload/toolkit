export type CommitRace = 'window-closed' | 'epoch-closed'
export type RevealRace = 'epoch-finalized'
export type CloseRace = 'raced'

interface ErrorDetail {
    message?: unknown
}

function pushDetails(out: string[], value: unknown): void {
    if (!Array.isArray(value)) return
    for (const d of value as ErrorDetail[]) {
        if (d && typeof d.message === 'string') out.push(d.message)
    }
}

export function errorMessages(err: unknown): string[] {
    const out: string[] = []
    if (typeof err === 'string') out.push(err)
    if (err && typeof err === 'object') {
        const e = err as {
            message?: unknown
            details?: unknown
            response?: {json?: {error?: {details?: unknown; what?: unknown}}}
        }
        if (typeof e.message === 'string') out.push(e.message)
        pushDetails(out, e.details)
        const body = e.response?.json?.error
        if (body) {
            pushDetails(out, body.details)
            if (typeof body.what === 'string') out.push(body.what)
        }
    }
    return out
}

function matches(err: unknown, needle: string): boolean {
    return errorMessages(err).some((m) => m.includes(needle))
}

export function classifyCommitRace(err: unknown): CommitRace | null {
    if (matches(err, 'Commit window closed')) return 'window-closed'
    if (matches(err, 'Commit must target next epoch')) return 'epoch-closed'
    return null
}

export function classifyRevealRace(err: unknown): RevealRace | null {
    return matches(err, 'Epoch already finalized.') ? 'epoch-finalized' : null
}

export function classifyCloseRace(err: unknown): CloseRace | null {
    if (matches(err, 'Epoch already finalized.')) return 'raced'
    if (matches(err, 'closeepoch targets the epoch the game is waiting on')) return 'raced'
    return null
}
