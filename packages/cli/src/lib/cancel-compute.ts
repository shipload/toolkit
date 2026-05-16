import type {EntitySnapshot} from './snapshot'
import {completedCount} from './snapshot'
import {ValidationError} from './validate'

export const CANCEL_NEVER = 0
export const CANCEL_BEFORE_START = 1
export const CANCEL_ALWAYS = 2

export type CancelMode = {kind: 'all'} | {kind: 'from'; index: number}

function readCancelable(t: unknown): number {
    const c = (t as {cancelable: unknown}).cancelable
    return Number(String(c))
}

export function computeCancelableCount(snap: EntitySnapshot, mode: CancelMode): bigint {
    if (mode.kind === 'all') {
        const pending = snap.pending_tasks ?? []
        let count = 0
        for (let i = pending.length - 1; i >= 0; i--) {
            if (readCancelable(pending[i]) === CANCEL_NEVER) break
            count++
        }
        return BigInt(count)
    }

    const total = snap.schedule?.tasks?.length ?? 0
    if (mode.index < 0 || mode.index >= total) {
        throw new ValidationError(
            `task index ${mode.index} is out of range (schedule has ${total} task${total === 1 ? '' : 's'}).`,
        )
    }
    const done = completedCount(snap)
    if (mode.index < done) {
        throw new ValidationError(
            `task index ${mode.index} is in the completed range (0..${done - 1}); only pending tasks can be cancelled.`,
        )
    }
    if (!snap.is_idle && mode.index === done) {
        throw new ValidationError(
            `task index ${mode.index} is the currently-running task and cannot be cancelled.`,
        )
    }
    return BigInt(total - mode.index)
}
