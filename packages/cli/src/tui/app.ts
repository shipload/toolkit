import type {CliRenderer, KeyEvent} from '@opentui/core'
import {createCliRenderer} from '@opentui/core'
import {assertTty, type TtyEnv} from './fallback'
import type {View} from './view'

export interface AppDeps {
    createRenderer?: (config: Parameters<typeof createCliRenderer>[0]) => Promise<CliRenderer>
    env?: TtyEnv
}

export interface RunAppOpts {
    view: View
    entityType: string
    entityId: bigint | number
    timeoutMs?: number
}

const TIMEOUT_EXIT = 124

export async function runApp(opts: RunAppOpts, deps: AppDeps = {}): Promise<void> {
    if (deps.env) {
        assertTty(opts.entityType, opts.entityId, deps.env)
    } else {
        assertTty(opts.entityType, opts.entityId)
    }

    const create = deps.createRenderer ?? createCliRenderer
    const renderer = await create({
        screenMode: 'alternate-screen',
        // We handle Ctrl-C ourselves so we can resolve the app's exit promise
        // and run our own teardown. Letting OpenTUI auto-destroy leaves the
        // outer await blocked, requiring a second Ctrl-C to kill the process.
        exitOnCtrlC: false,
        consoleMode: 'console-overlay',
        targetFps: 10,
    })

    let resolveAppExit!: () => void
    const appExit = new Promise<void>((r) => {
        resolveAppExit = r
    })
    void opts.view.onExit.then(() => resolveAppExit())

    const onUnhandled = (err: unknown): void => {
        try {
            renderer.destroy()
        } catch {}
        console.error(err)
        process.exit(1)
    }
    process.on('unhandledRejection', onUnhandled)

    let timer: ReturnType<typeof setTimeout> | null = null
    let timedOut = false
    const timeoutPromise = new Promise<void>((resolve) => {
        if (opts.timeoutMs == null) return
        timer = setTimeout(() => {
            timedOut = true
            resolve()
        }, opts.timeoutMs)
    })

    try {
        opts.view.attach(renderer)
        renderer.keyInput.on('keypress', (key: KeyEvent) => {
            if (key.ctrl && key.name === 'c') {
                resolveAppExit()
                return
            }
            // Modal/wizard interception: consumes all input when active.
            if (opts.view.interceptKey?.(key)) return
            // Help overlay: any non-'?' key dismisses without firing its action.
            if (opts.view.helpOpen?.() && key.name !== '?') {
                opts.view.dismissHelp?.()
                return
            }
            opts.view.keys.dispatch(key.name)
        })
        await Promise.race([appExit, timeoutPromise])
    } finally {
        if (timer) clearTimeout(timer)
        try {
            await opts.view.dispose()
        } catch {}
        try {
            renderer.destroy()
        } catch {}
        process.off('unhandledRejection', onUnhandled)
    }

    if (timedOut) {
        ;(deps.env?.exit ?? process.exit)(TIMEOUT_EXIT)
        return
    }
    // In production (no env override), the snapshot-stream's internal
    // setTimeout keeps the event loop alive after destroy(). Force-exit
    // since the TUI is a one-shot foreground command. Tests pass `deps.env`
    // and stay in-process.
    if (!deps.env) {
        process.exit(0)
    }
}
