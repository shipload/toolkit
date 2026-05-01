import {describe, expect, test} from 'bun:test'
import {createResolveModal} from '../../../src/tui/primitives/resolve-modal'

describe('createResolveModal', () => {
    test('starts in confirm state with selection=ok', () => {
        const m = createResolveModal({
            title: 'Resolve completed tasks?',
            body: 'This submits 3 tasks for ship 1.',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://x'}),
        })
        expect(m.state.kind).toBe('confirm')
        if (m.state.kind === 'confirm') expect(m.state.selection).toBe('ok')
    })

    test('Enter on OK transitions confirm → submitting → success', async () => {
        let resolveAction!: () => void
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: () =>
                new Promise<{txid: string; explorerUrl: string}>((r) => {
                    resolveAction = () => r({txid: 'abc', explorerUrl: 'http://abc'})
                }),
        })
        m.handleKey({name: 'return'})
        expect(m.state.kind).toBe('submitting')
        resolveAction()
        await new Promise((r) => setTimeout(r, 5))
        expect(m.state.kind).toBe('success')
        if (m.state.kind === 'success') {
            expect(m.state.txid).toBe('abc')
            expect(m.state.explorerUrl).toBe('http://abc')
        }
    })

    test('right arrow + Enter cancels without dispatching', async () => {
        let called = false
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                called = true
                return {txid: 'x', explorerUrl: 'http://x'}
            },
        })
        m.handleKey({name: 'right'})
        if (m.state.kind === 'confirm') expect(m.state.selection).toBe('cancel')
        m.handleKey({name: 'return'})
        await new Promise((r) => setTimeout(r, 5))
        expect(m.state.kind).toBe('closed')
        expect(called).toBe(false)
    })

    test('Esc dismisses confirm without dispatching', () => {
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://x'}),
        })
        m.handleKey({name: 'escape'})
        expect(m.state.kind).toBe('closed')
    })

    test('error state surfaced on rejection', async () => {
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                throw new Error('boom')
            },
        })
        m.handleKey({name: 'return'})
        await new Promise((r) => setTimeout(r, 5))
        expect(m.state.kind).toBe('error')
        if (m.state.kind === 'error') expect(m.state.message).toBe('boom')
    })

    test('return / escape / space in success state closes the modal', async () => {
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://x'}),
        })
        m.handleKey({name: 'return'})
        await new Promise((r) => setTimeout(r, 5))
        expect(m.state.kind).toBe('success')
        m.handleKey({name: 'return'})
        expect(m.state.kind).toBe('closed')
    })

    test('c in success state invokes onCopyToClipboard', async () => {
        let copied = ''
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://copy-me'}),
            onCopyToClipboard: (text) => {
                copied = text
            },
        })
        m.handleKey({name: 'return'})
        await new Promise((r) => setTimeout(r, 5))
        m.handleKey({name: 'c'})
        expect(copied).toBe('http://copy-me')
    })

    test('handleKey is a no-op while submitting', () => {
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: () => new Promise(() => {}), // never resolves
        })
        m.handleKey({name: 'return'})
        expect(m.state.kind).toBe('submitting')
        m.handleKey({name: 'escape'}) // should be ignored
        expect(m.state.kind).toBe('submitting')
    })

    test('onChange returns an unsubscribe function that stops further notifications', () => {
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://x'}),
        })
        let calls = 0
        const unsub = m.onChange(() => {
            calls++
        })
        m.handleKey({name: 'right'})
        expect(calls).toBe(1)
        unsub()
        m.handleKey({name: 'left'})
        expect(calls).toBe(1) // unchanged after unsubscribe
    })

    test('multiple onChange listeners all fire on state change', () => {
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://x'}),
        })
        let a = 0
        let b = 0
        m.onChange(() => {
            a++
        })
        m.onChange(() => {
            b++
        })
        m.handleKey({name: 'right'})
        expect(a).toBe(1)
        expect(b).toBe(1)
    })

    test('transitioning to closed fires onClose but not onChange listeners', () => {
        let closeCalls = 0
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://x'}),
            onClose: () => {
                closeCalls++
            },
        })
        let changeCalls = 0
        m.onChange(() => {
            changeCalls++
        })
        m.handleKey({name: 'escape'})
        expect(m.state.kind).toBe('closed')
        expect(closeCalls).toBe(1)
        expect(changeCalls).toBe(0)
    })

    test('closing during copy-flash window does not fire spurious change notifications', async () => {
        const m = createResolveModal({
            title: 't',
            body: 'b',
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            onConfirm: async () => ({txid: 'x', explorerUrl: 'http://copy'}),
            onCopyToClipboard: () => {},
        })
        let changeCalls = 0
        m.onChange(() => {
            changeCalls++
        })
        m.handleKey({name: 'return'}) // → submitting (notify)
        await new Promise((r) => setTimeout(r, 5)) // → success (notify)
        const beforeCopy = changeCalls
        m.handleKey({name: 'c'}) // → success+copiedAt (notify)
        expect(changeCalls).toBeGreaterThan(beforeCopy)
        const afterCopy = changeCalls
        m.handleKey({name: 'escape'}) // → closed (no notify)
        expect(m.state.kind).toBe('closed')
        // If the copy-flash timer leaked, it would fire after COPIED_FLASH_MS and
        // increment changeCalls. Wait long enough for any leaked timer to fire.
        // The flash window is 2000ms; sleep just past that.
        await new Promise((r) => setTimeout(r, 2100))
        expect(changeCalls).toBe(afterCopy)
    }, 5000)
})
