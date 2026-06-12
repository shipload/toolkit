import {ValidationError} from './validate'

export const CANCEL_NEVER = 0
export const CANCEL_BEFORE_START = 1
export const CANCEL_ALWAYS = 2

export type CancelMode = {kind: 'all'} | {kind: 'from'; index: number}

export interface LaneTaskView {
	tasks: readonly {cancelable: unknown}[]
	pending: readonly {cancelable: unknown}[]
	completed: number
	isIdle: boolean
}

function readCancelable(t: {cancelable: unknown}): number {
	return Number(String(t.cancelable))
}

export function computeCancelableCount(view: LaneTaskView, mode: CancelMode): bigint {
	if (mode.kind === 'all') {
		let count = 0
		for (let i = view.pending.length - 1; i >= 0; i--) {
			if (readCancelable(view.pending[i]) === CANCEL_NEVER) break
			count++
		}
		return BigInt(count)
	}

	const total = view.tasks.length
	if (mode.index < 0 || mode.index >= total) {
		throw new ValidationError(
			`task index ${mode.index} is out of range (lane has ${total} task${total === 1 ? '' : 's'}).`,
		)
	}
	if (mode.index < view.completed) {
		throw new ValidationError(
			`task index ${mode.index} is in the completed range (0..${view.completed - 1}); only pending tasks can be cancelled.`,
		)
	}
	if (!view.isIdle && mode.index === view.completed) {
		throw new ValidationError(
			`task index ${mode.index} is the currently-running task and cannot be cancelled.`,
		)
	}
	return BigInt(total - mode.index)
}
