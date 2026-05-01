import {Box, Text, type VChild} from '@opentui/core'

const MODAL_BG = '#0d1117'
const COPIED_FLASH_MS = 2000

export interface ResolveSuccess {
    txid: string
    explorerUrl: string
}

export type ResolveModalState =
    | {kind: 'confirm'; selection: 'ok' | 'cancel'}
    | {kind: 'submitting'}
    | {kind: 'success'; txid: string; explorerUrl: string; copiedAt?: number}
    | {kind: 'error'; message: string}
    | {kind: 'closed'}

export interface ResolveModalOpts {
    title: string
    body: string
    confirmLabel: string
    cancelLabel: string
    submittingLabel?: string
    successLabel?: (r: ResolveSuccess) => string
    onConfirm: () => Promise<ResolveSuccess>
    onClose?: () => void
    onCopyToClipboard?: (text: string) => void
}

export interface ResolveModalHandle {
    readonly state: ResolveModalState
    handleKey(k: {name: string}): void
    render(): VChild
    /**
     * Subscribe to in-modal state transitions (confirm → submitting →
     * success/error, and copy-flash updates within success). Returns an
     * unsubscribe function. Multiple subscribers are supported; each is
     * invoked on every change.
     *
     * Note: `onChange` does NOT fire when the modal transitions to `closed`.
     * The `onClose` option is the canonical "I'm done — drop me" signal and
     * is mutually exclusive with `onChange` for any given transition.
     */
    onChange(cb: () => void): () => void
}

export function createResolveModal(opts: ResolveModalOpts): ResolveModalHandle {
    let state: ResolveModalState = {kind: 'confirm', selection: 'ok'}
    const listeners = new Set<() => void>()
    let copyFlashTimer: ReturnType<typeof setTimeout> | undefined

    function clearCopyFlashTimer() {
        if (copyFlashTimer) {
            clearTimeout(copyFlashTimer)
            copyFlashTimer = undefined
        }
    }

    function notify() {
        for (const cb of listeners) cb()
    }

    function set(next: ResolveModalState) {
        if (state.kind === 'success' && next.kind !== 'success') clearCopyFlashTimer()
        state = next
        if (next.kind === 'closed') {
            opts.onClose?.()
            return
        }
        notify()
    }

    function submit() {
        set({kind: 'submitting'})
        opts.onConfirm()
            .then((r) => set({kind: 'success', txid: r.txid, explorerUrl: r.explorerUrl}))
            .catch((err) =>
                set({
                    kind: 'error',
                    message: err instanceof Error ? err.message : String(err),
                })
            )
    }

    function handleKey(k: {name: string}) {
        if (state.kind === 'closed' || state.kind === 'submitting') return
        if (state.kind === 'confirm') {
            if (k.name === 'left' || k.name === 'right' || k.name === 'tab') {
                set({
                    kind: 'confirm',
                    selection: state.selection === 'ok' ? 'cancel' : 'ok',
                })
                return
            }
            if (k.name === 'escape') {
                set({kind: 'closed'})
                return
            }
            if (k.name === 'return') {
                if (state.selection === 'ok') submit()
                else set({kind: 'closed'})
                return
            }
            return
        }
        if (state.kind === 'success') {
            if (k.name === 'c') {
                opts.onCopyToClipboard?.(state.explorerUrl)
                const stamp = Date.now()
                set({...state, copiedAt: stamp})
                clearCopyFlashTimer()
                copyFlashTimer = setTimeout(() => {
                    copyFlashTimer = undefined
                    if (state.kind === 'success' && state.copiedAt === stamp) {
                        notify()
                    }
                }, COPIED_FLASH_MS)
                return
            }
        }
        if (k.name === 'return' || k.name === 'escape' || k.name === 'space') {
            set({kind: 'closed'})
        }
    }

    function render(): VChild {
        if (state.kind === 'closed') return Text({content: ''})
        let body: VChild
        if (state.kind === 'confirm') body = renderConfirm(opts, state)
        else if (state.kind === 'submitting') body = renderSubmitting(opts)
        else if (state.kind === 'success') body = renderSuccess(opts, state)
        else body = renderError(state)
        return Box(
            {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 200,
                justifyContent: 'center',
                alignItems: 'center',
            },
            Box(
                {
                    width: 64,
                    borderStyle: 'double',
                    borderColor: '#FFFFFF',
                    backgroundColor: MODAL_BG,
                    padding: 1,
                    flexDirection: 'column',
                },
                body
            )
        )
    }

    return {
        get state() {
            return state
        },
        handleKey,
        render,
        onChange(cb) {
            listeners.add(cb)
            return () => {
                listeners.delete(cb)
            }
        },
    }
}

function renderConfirm(
    opts: ResolveModalOpts,
    state: {selection: 'ok' | 'cancel'}
): VChild {
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: opts.title, fg: '#FFFF00', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: opts.body, bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Box(
            {flexDirection: 'row', justifyContent: 'center', backgroundColor: MODAL_BG},
            modalButton(opts.confirmLabel, state.selection === 'ok'),
            Text({content: '    ', bg: MODAL_BG}),
            modalButton(opts.cancelLabel, state.selection === 'cancel')
        ),
        Text({content: '', bg: MODAL_BG}),
        Text({
            content: '  ←/→ or Tab to switch · Enter to confirm · Esc to cancel',
            fg: '#888888',
            bg: MODAL_BG,
        })
    )
}

function renderSubmitting(opts: ResolveModalOpts): VChild {
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: '⏳  Submitting transaction...', fg: '#FFCC00', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: `  ${opts.submittingLabel ?? 'Submitting'}.`, bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: '  Awaiting chain confirmation.', fg: '#888888', bg: MODAL_BG})
    )
}

function renderSuccess(
    opts: ResolveModalOpts,
    state: {txid: string; explorerUrl: string; copiedAt?: number}
): VChild {
    const flashing =
        state.copiedAt !== undefined && Date.now() - state.copiedAt < COPIED_FLASH_MS
    const copyHint = flashing
        ? '  ✓ copied to clipboard'
        : '  c to copy URL · Enter / Esc / Space to dismiss'
    const copyHintColor = flashing ? '#00FF66' : '#888888'
    const successLabel = opts.successLabel
        ? opts.successLabel({txid: state.txid, explorerUrl: state.explorerUrl})
        : 'Transaction confirmed.'
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: '✓ Transaction confirmed', fg: '#00FF66', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: `  ${successLabel}`, bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: '  View on explorer:', fg: '#888888', bg: MODAL_BG}),
        Text({content: `  ${state.explorerUrl}`, fg: '#88CCFF', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: copyHint, fg: copyHintColor, bg: MODAL_BG})
    )
}

function renderError(state: {message: string}): VChild {
    return Box(
        {flexDirection: 'column', backgroundColor: MODAL_BG},
        Text({content: '✗ Transaction failed', fg: '#FF5555', bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: `  ${state.message}`, bg: MODAL_BG}),
        Text({content: '', bg: MODAL_BG}),
        Text({content: '  Enter / Esc / Space to dismiss', fg: '#888888', bg: MODAL_BG})
    )
}

function modalButton(label: string, focused: boolean): VChild {
    if (focused) {
        return Text({content: ` ▶ ${label} ◀ `, fg: '#0d1117', bg: '#FFCC00'})
    }
    return Text({content: `   ${label}   `, fg: '#888888', bg: MODAL_BG})
}
