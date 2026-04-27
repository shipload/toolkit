import {describe, expect, mock, test} from 'bun:test'
import {type AppDeps, runApp} from '../../src/tui/app'
import {HotkeyRegistry} from '../../src/tui/hotkeys'
import type {View} from '../../src/tui/view'

interface FakeRendererState {
    renderer: {
        root: {add: () => void}
        keyInput: {
            on: (ev: string, cb: (...args: unknown[]) => void) => void
            off: () => void
        }
        on: () => void
        requestLive: () => void
        dropLive: () => void
        destroy: () => void
        __handlers: Map<string, ((...args: unknown[]) => void)[]>
    }
    destroyed: boolean
}

function fakeRenderer(): FakeRendererState {
    const handlers = new Map<string, ((...args: unknown[]) => void)[]>()
    const state: FakeRendererState = {
        renderer: {
            root: {add: () => {}},
            keyInput: {
                on: (ev: string, cb: (...args: unknown[]) => void) => {
                    const arr = handlers.get(ev) ?? []
                    arr.push(cb)
                    handlers.set(ev, arr)
                },
                off: () => {},
            },
            on: () => {},
            requestLive: () => {},
            dropLive: () => {},
            destroy: () => {
                state.destroyed = true
            },
            __handlers: handlers,
        },
        destroyed: false,
    }
    return state
}

function fakeView(): View & {attached: boolean; disposed: boolean} {
    let resolveExit!: () => void
    const onExit = new Promise<void>((r) => {
        resolveExit = r
    })
    const view = {
        keys: new HotkeyRegistry([
            {key: 'q', label: 'quit', action: () => resolveExit(), enabled: () => true},
        ]),
        attached: false,
        disposed: false,
        attach: () => {
            view.attached = true
        },
        dispose: async () => {
            view.disposed = true
        },
        onExit,
    }
    return view
}

describe('runApp', () => {
    test('attaches view, awaits onExit, then destroys', async () => {
        const r = fakeRenderer()
        const view = fakeView()
        const deps: AppDeps = {
            createRenderer: async () => r.renderer as never,
            env: {isTTY: true, write: () => {}, exit: () => {}},
        }
        const exit = runApp({view, entityType: 'ship', entityId: 3n}, deps)
        // Yield once so runApp can register the keypress handler.
        await new Promise((res) => setTimeout(res, 5))
        const handlers = r.renderer.__handlers.get('keypress')
        handlers?.[0]?.({name: 'q', ctrl: false, shift: false, meta: false})
        await exit
        expect(view.attached).toBe(true)
        expect(view.disposed).toBe(true)
        expect(r.destroyed).toBe(true)
    })

    test('aborts before creating renderer when not a TTY', async () => {
        let exitCode: number | undefined
        const writes: string[] = []
        const view = fakeView()
        const deps: AppDeps = {
            createRenderer: mock(async () => {
                throw new Error('renderer should not have been created')
            }),
            env: {
                isTTY: false,
                write: (s) => writes.push(s),
                exit: (code) => {
                    exitCode = code
                    throw new Error('__exit__')
                },
            },
        }
        await expect(runApp({view, entityType: 'ship', entityId: 3n}, deps)).rejects.toThrow(
            '__exit__'
        )
        expect(exitCode).toBe(2)
        expect(writes.join('')).toContain('requires a TTY')
    })

    test('respects timeoutMs by exiting with non-zero code', async () => {
        const r = fakeRenderer()
        const view = fakeView()
        let exitCode: number | undefined
        const deps: AppDeps = {
            createRenderer: async () => r.renderer as never,
            env: {
                isTTY: true,
                write: () => {},
                exit: (code) => {
                    exitCode = code
                },
            },
        }
        await runApp({view, entityType: 'ship', entityId: 3n, timeoutMs: 5}, deps)
        expect(r.destroyed).toBe(true)
        expect(exitCode).toBe(124)
    })
})
