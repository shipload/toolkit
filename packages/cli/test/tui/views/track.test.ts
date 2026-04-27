import {describe, expect, test} from 'bun:test'
import type {EntitySnapshot} from '../../../src/lib/snapshot'
import type {SnapshotTick} from '../../../src/lib/snapshot-stream'
import {createTrackView, type ResolveResult} from '../../../src/tui/views/track'

const okResolve = async (_count: number): Promise<ResolveResult> => ({
    txid: 'fake-txid',
    explorerUrl: 'https://example/tx/fake-txid',
})

function busy(remaining: number): EntitySnapshot {
    return {
        type: 'ship',
        id: 3n,
        owner: 'alice',
        entity_name: 'Stardust',
        coordinates: {x: 102, y: 45},
        cargomass: 312,
        cargo: [],
        capacity: 500,
        energy: 8420,
        generator: {capacity: 10000, recharge: 5},
        is_idle: false,
        current_task: {type: 1, duration: 60n} as never,
        current_task_elapsed: 18,
        current_task_remaining: remaining,
        pending_tasks: [],
        schedule: {tasks: [{type: 1, duration: 60n} as never]},
    }
}

function idle(completed: number): EntitySnapshot {
    return {
        type: 'ship',
        id: 3n,
        owner: 'alice',
        entity_name: 'Stardust',
        coordinates: {x: 110, y: 50},
        cargomass: 312,
        cargo: [],
        capacity: 500,
        energy: 9320,
        generator: {capacity: 10000, recharge: 5},
        is_idle: true,
        schedule: {tasks: new Array(completed).fill({type: 1, duration: 30n})},
    }
}

function fakeRenderer() {
    const added: unknown[] = []
    return {
        root: {
            add: (n: unknown) => added.push(n),
            clear: () => {
                added.length = 0
            },
        },
        on: () => {},
        requestLive: () => {},
        dropLive: () => {},
        __added: added,
    }
}

async function* emptyStream(): AsyncGenerator<SnapshotTick, void, void> {
    // no ticks
}

describe('createTrackView', () => {
    test("exposes 'r', '?', 'q' hotkeys", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: busy(42),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const keys = view.keys.all().map((h) => h.key)
        expect(keys).toContain('r')
        expect(keys).toContain('?')
        expect(keys).toContain('q')
    })

    test("'r' is disabled while busy", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: busy(42),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const r = view.keys.all().find((h) => h.key === 'r')
        expect(r?.enabled()).toBe(false)
    })

    test("'r' is disabled when idle with no completed tasks", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(0),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const r = view.keys.all().find((h) => h.key === 'r')
        expect(r?.enabled()).toBe(false)
    })

    test("'r' is enabled when idle with completed tasks", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(2),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const r = view.keys.all().find((h) => h.key === 'r')
        expect(r?.enabled()).toBe(true)
    })

    test("'q' resolves onExit", async () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(0),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('q')
        await view.onExit
        await view.dispose()
    })

    test("'r' opens the confirm modal; OK + Enter triggers resolveAction", async () => {
        let called: {count: number} | null = null
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(3),
            stream: emptyStream(),
            resolveAction: async (count) => {
                called = {count}
                return {
                    txid: 'abc',
                    explorerUrl: 'https://example/abc',
                }
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('r')
        // Modal is open; r-action is gated; Enter on default OK triggers resolve.
        expect(view.interceptKey?.({name: 'return'} as never)).toBe(true)
        await new Promise((r) => setTimeout(r, 10))
        expect(called?.count).toBe(3)
        view.keys.dispatch('q')
        await view.onExit
        await view.dispose()
    })

    test("'r' confirm modal: switch to Cancel + Enter aborts", async () => {
        let called = false
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(3),
            stream: emptyStream(),
            resolveAction: async () => {
                called = true
                return {
                    txid: 'x',
                    explorerUrl: 'https://example/x',
                }
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('r')
        // Switch selection to Cancel via right arrow
        expect(view.interceptKey?.({name: 'right'} as never)).toBe(true)
        // Enter dismisses without resolving
        expect(view.interceptKey?.({name: 'return'} as never)).toBe(true)
        await new Promise((r) => setTimeout(r, 10))
        expect(called).toBe(false)
        view.keys.dispatch('q')
        await view.onExit
        await view.dispose()
    })

    test("'r' confirm modal: Esc dismisses without resolving", async () => {
        let called = false
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(3),
            stream: emptyStream(),
            resolveAction: async () => {
                called = true
                return {
                    txid: 'x',
                    explorerUrl: 'https://example/x',
                }
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('r')
        expect(view.interceptKey?.({name: 'escape'} as never)).toBe(true)
        await new Promise((r) => setTimeout(r, 10))
        expect(called).toBe(false)
        view.keys.dispatch('q')
        await view.onExit
        await view.dispose()
    })

    test("'?' toggles helpOpen()", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(0),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        view.attach(fakeRenderer() as never)
        expect(view.helpOpen?.()).toBe(false)
        view.keys.dispatch('?')
        expect(view.helpOpen?.()).toBe(true)
        view.dismissHelp?.()
        expect(view.helpOpen?.()).toBe(false)
    })
})
