import {describe, expect, setSystemTime, test} from 'bun:test'
import {schedule, ServerContract} from '@shipload/sdk'
import {entityInfoToSnapshot, type EntitySnapshot} from '../../../src/lib/snapshot'
import type {SnapshotTick} from '../../../src/lib/snapshot-stream'
import {createTrackView, type ResolveResult, trackRows} from '../../../src/tui/views/track'
import {collectText} from '../render-tree'

const okResolve = async (_count: number): Promise<ResolveResult> => ({
    txid: 'fake-txid',
    explorerUrl: 'https://example/tx/fake-txid',
})

function makeLane(
    laneKey: number,
    startedIso: string,
    tasks: unknown[]
): ServerContract.Types.lane {
    return ServerContract.Types.lane.from({
        lane_key: laneKey,
        schedule: {started: startedIso, tasks},
    })
}

function busy(remaining: number): EntitySnapshot {
    const elapsed = 18
    const startedIso = new Date(Date.now() - elapsed * 1000).toISOString().slice(0, 23)
    return {
        type: 'ship',
        id: 3n,
        owner: 'alice',
        entity_name: 'Stardust',
        coordinates: {x: 102n, y: 45n},
        cargomass: 312n,
        cargo: [],
        capacity: 500n,
        energy: 8420n,
        generator: {capacity: 10000n, recharge: 5n},
        is_idle: false,
        lanes: [
            makeLane(0, startedIso, [
                {type: 1, duration: elapsed + remaining, cancelable: 0, cargo: []},
            ]),
        ],
    }
}

function idle(completed: number): EntitySnapshot {
    const pastStart = new Date(Date.now() - (completed * 30 + 10) * 1000).toISOString().slice(0, 23)
    const tasks = new Array(completed).fill({type: 1, duration: 30, cancelable: 0, cargo: []})
    return {
        type: 'ship',
        id: 3n,
        owner: 'alice',
        entity_name: 'Stardust',
        coordinates: {x: 110n, y: 50n},
        cargomass: 312n,
        cargo: [],
        capacity: 500n,
        energy: 9320n,
        generator: {capacity: 10000n, recharge: 5n},
        is_idle: true,
        lanes: tasks.length > 0 ? [makeLane(0, pastStart, tasks)] : [],
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

function renderedText(renderer: ReturnType<typeof fakeRenderer>): string {
    return collectText(renderer.__added.at(-1)).join('|')
}

async function* emptyStream(): AsyncGenerator<SnapshotTick, void, void> {
    // no ticks
}

function controlledStream(): {
    stream: AsyncGenerator<SnapshotTick, void, void>
    push: (tick: SnapshotTick) => void
    close: () => void
} {
    const queue: IteratorResult<SnapshotTick, void>[] = []
    let waiter: ((next: IteratorResult<SnapshotTick, void>) => void) | null = null

    async function* stream(): AsyncGenerator<SnapshotTick, void, void> {
        while (true) {
            const next =
                queue.shift() ??
                (await new Promise<IteratorResult<SnapshotTick, void>>((resolve) => {
                    waiter = resolve
                }))
            if (next.done) return
            yield next.value
        }
    }

    function emit(next: IteratorResult<SnapshotTick, void>): void {
        if (waiter) {
            const resolve = waiter
            waiter = null
            resolve(next)
            return
        }
        queue.push(next)
    }

    return {
        stream: stream(),
        push: (tick) => emit({value: tick, done: false}),
        close: () => emit({value: undefined, done: true}),
    }
}

function snapshotTick(snap: EntitySnapshot): SnapshotTick {
    return {
        snap,
        elapsed_s: 0,
        remaining_s: 0,
        total_s: 0,
        attempt: 1,
        sinceLastFetch_s: 0,
        fetchInterval_s: 5,
    }
}

function multiLane(at: Date): ServerContract.Types.entity_info {
    return ServerContract.Types.entity_info.from({
        type: 'ship',
        id: 42,
        owner: 'alice',
        entity_name: 'Multi',
        coordinates: {x: 0, y: 0, z: 800},
        item_id: 0,
        cargomass: 0,
        cargo: [],
        modules: [],
        is_idle: false,
        lanes: [
            {
                lane_key: 0,
                schedule: {
                    started: new Date(at.getTime() - 120_000).toISOString().slice(0, 23),
                    tasks: [
                        {
                            type: 1,
                            duration: 60,
                            cancelable: 0,
                            coordinates: {x: 3, y: 9, z: 800},
                            cargo: [],
                        },
                    ],
                },
            },
            {
                lane_key: 3,
                schedule: {
                    started: new Date(at.getTime() - 60_000).toISOString().slice(0, 23),
                    tasks: [
                        {type: 5, duration: 300, cancelable: 0, cargo: []},
                        {type: 7, duration: 540, cancelable: 2, cargo: []},
                    ],
                },
            },
        ],
    })
}

function laneNativeSnapshot(): EntitySnapshot {
    const at = new Date()
    const iso = (offsetMs: number) => new Date(at.getTime() + offsetMs).toISOString().slice(0, 23)
    return {
        type: 'ship',
        id: 42n,
        owner: 'alice',
        entity_name: 'Lanes',
        coordinates: {x: 0n, y: 0n},
        cargomass: 0n,
        cargo: [],
        capacity: 500n,
        energy: 9000n,
        generator: {capacity: 10000n, recharge: 5n},
        is_idle: false,
        lanes: [
            makeLane(schedule.LANE_BARRIER, iso(30_000), [
                {type: 7, duration: 60, cancelable: 0, cargo: []},
            ]),
            makeLane(4, iso(-10_000), [{type: 5, duration: 120, cancelable: 0, cargo: []}]),
            makeLane(schedule.LANE_MOBILITY, iso(-90_000), [
                {type: 1, duration: 30, cancelable: 0, cargo: []},
            ]),
        ],
    }
}

test('trackRows tags lanes and statuses in canonical order', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const snap = entityInfoToSnapshot(multiLane(at))
    const rows = trackRows(snap, at)
    expect(rows.map((r) => r.status)).toContain('active')
    expect(rows.some((r) => r.laneKey === 3)).toBe(true)
    expect(rows.find((r) => r.laneKey === 0)?.status).toBe('done')
})

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

    test("'r' is enabled with one completed lane while another lane is active", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 42n},
            initialSnapshot: laneNativeSnapshot(),
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

    test('optimistic resolve preserves remaining lane timing after slicing completed work', async () => {
        setSystemTime(new Date('2026-06-11T12:00:40.000Z'))
        let view: ReturnType<typeof createTrackView> | null = null
        try {
            view = createTrackView({
                ctx: {entityType: 'ship', entityId: 42n},
                initialSnapshot: {
                    ...idle(0),
                    id: 42n,
                    lanes: [
                        makeLane(schedule.LANE_MOBILITY, '2026-06-11T12:00:00.000', [
                            {type: 1, duration: 30, cancelable: 0, cargo: []},
                            {type: 5, duration: 20, cancelable: 0, cargo: []},
                        ]),
                    ],
                },
                stream: emptyStream(),
                resolveAction: okResolve,
            })
            const r = fakeRenderer()
            view.attach(r as never)
            view.keys.dispatch('r')
            expect(view.interceptKey?.({name: 'return'} as never)).toBe(true)
            await new Promise((r) => setTimeout(r, 10))

            const joined = renderedText(r)
            expect(joined).toContain('mob · active')
            expect(joined).toContain('10s remaining')
            expect(joined).toContain('Gather')
            expect(joined).not.toContain('mob · ready to resolve')
        } finally {
            await view?.dispose()
            setSystemTime()
        }
    })

    test('optimistic resolve only removes the events captured for the submitted resolve', async () => {
        setSystemTime(new Date('2026-06-11T12:00:11.000Z'))
        let called: number | null = null
        let view: ReturnType<typeof createTrackView> | null = null
        try {
            view = createTrackView({
                ctx: {entityType: 'ship', entityId: 42n},
                initialSnapshot: {
                    ...idle(0),
                    id: 42n,
                    lanes: [
                        makeLane(schedule.LANE_MOBILITY, '2026-06-11T12:00:00.000', [
                            {type: 1, duration: 10, cancelable: 0, cargo: []},
                            {type: 5, duration: 10, cancelable: 0, cargo: []},
                        ]),
                    ],
                },
                stream: emptyStream(),
                resolveAction: async (count) => {
                    called = count
                    setSystemTime(new Date('2026-06-11T12:00:25.000Z'))
                    return okResolve(count)
                },
            })
            const r = fakeRenderer()
            view.attach(r as never)
            view.keys.dispatch('r')
            expect(view.interceptKey?.({name: 'return'} as never)).toBe(true)
            await new Promise((r) => setTimeout(r, 10))

            const joined = renderedText(r)
            expect(called).toBe(1)
            expect(joined).toContain('Gather')
            expect(joined).toContain('mob · ready to resolve')
            expect(joined).not.toContain('no lane schedules')
        } finally {
            await view?.dispose()
            setSystemTime()
        }
    })

    test('pending optimistic resolve does not slice a same-count tick with a changed prefix', async () => {
        setSystemTime(new Date('2026-06-11T12:00:20.000Z'))
        const stream = controlledStream()
        let view: ReturnType<typeof createTrackView> | null = null
        try {
            const initial = {
                ...idle(0),
                id: 42n,
                lanes: [
                    makeLane(schedule.LANE_MOBILITY, '2026-06-11T12:00:00.000', [
                        {type: 1, duration: 10, cancelable: 0, cargo: []},
                        {type: 5, duration: 100, cancelable: 0, cargo: []},
                    ]),
                ],
            }
            view = createTrackView({
                ctx: {entityType: 'ship', entityId: 42n},
                initialSnapshot: initial,
                stream: stream.stream,
                resolveAction: okResolve,
            })
            const r = fakeRenderer()
            view.attach(r as never)
            view.keys.dispatch('r')
            expect(view.interceptKey?.({name: 'return'} as never)).toBe(true)
            await new Promise((r) => setTimeout(r, 10))

            stream.push(
                snapshotTick({
                    ...initial,
                    lanes: [
                        makeLane(schedule.LANE_MOBILITY, '2026-06-11T12:00:00.000', [
                            {type: 7, duration: 40, cancelable: 0, cargo: []},
                            {type: 5, duration: 100, cancelable: 0, cargo: []},
                        ]),
                    ],
                })
            )
            await new Promise((r) => setTimeout(r, 10))

            const joined = renderedText(r)
            expect(joined).toContain('Craft')
            expect(joined).toContain('mob · active')
            expect(joined).toContain('20s remaining')
            expect(joined).not.toContain('1m 30s remaining')
        } finally {
            stream.close()
            await view?.dispose()
            setSystemTime()
        }
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

    test('busy body renders done rows with done + UTC completion-time', () => {
        const startedIso = '2026-05-10T22:00:00.000'
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 1n},
            initialSnapshot: {
                ...busy(60),
                lanes: [
                    makeLane(0, startedIso, [
                        {type: 1, duration: 60, cancelable: 0, cargo: []},
                        {type: 2, duration: 30, cancelable: 0, cargo: []},
                    ]),
                ],
            },
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const r = fakeRenderer()
        view.attach(r as never)
        const joined = r.__added.flatMap(collectText).join('|')
        expect(joined).toContain('done')
        expect(joined).toMatch(/22:01:00 UTC/)
    })

    test('rendered body includes semantic lane labels in order', () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 42n},
            initialSnapshot: laneNativeSnapshot(),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const r = fakeRenderer()
        view.attach(r as never)
        const joined = renderedText(r)
        const mobility = joined.indexOf('mob')
        const worker = joined.indexOf('L4 worker')
        const barrier = joined.indexOf('barrier')
        expect(mobility).toBeGreaterThanOrEqual(0)
        expect(worker).toBeGreaterThan(mobility)
        expect(barrier).toBeGreaterThan(worker)
        expect(joined).not.toContain('L255')
    })

    test('ready-to-resolve lane remains visible while another lane is active', () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 42n},
            initialSnapshot: laneNativeSnapshot(),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const r = fakeRenderer()
        view.attach(r as never)
        const joined = renderedText(r)
        expect(joined).toContain('mob')
        expect(joined).toContain('ready to resolve')
        expect(joined).toContain('L4 worker')
        expect(joined).toContain('remaining')
    })

    test("'l' cycles lane filters and 'a' resets to all lanes", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 42n},
            initialSnapshot: laneNativeSnapshot(),
            stream: emptyStream(),
            resolveAction: okResolve,
        })
        const l = view.keys.all().find((h) => h.key === 'l')
        const a = view.keys.all().find((h) => h.key === 'a')
        expect(l?.label).toBe('lane')
        expect(a?.label).toBe('all')

        const r = fakeRenderer()
        view.attach(r as never)
        let joined = renderedText(r)
        expect(joined).toContain('mob')
        expect(joined).toContain('L4 worker')
        expect(joined).toContain('barrier')

        expect(view.keys.dispatch('l')).toBe(true)
        joined = renderedText(r)
        expect(joined).toContain('mob')
        expect(joined).not.toContain('L4 worker')
        expect(joined).not.toContain('barrier')

        expect(view.keys.dispatch('l')).toBe(true)
        joined = renderedText(r)
        expect(joined).not.toContain('mob')
        expect(joined).toContain('L4 worker')
        expect(joined).not.toContain('barrier')

        expect(view.keys.dispatch('a')).toBe(true)
        joined = renderedText(r)
        expect(joined).toContain('mob')
        expect(joined).toContain('L4 worker')
        expect(joined).toContain('barrier')
    })
})

describe('createTrackView (embedded)', () => {
    test("drops 'q' from the registry and adds escape/tab/shift-tab", () => {
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(0),
            stream: emptyStream(),
            resolveAction: okResolve,
            embed: {
                onBack: () => {},
                onStepNext: () => {},
                onStepPrev: () => {},
                label: 'ship 1 of 7',
            },
        })
        const keys = view.keys.all().map((h) => `${h.shift ? 'S+' : ''}${h.key}`)
        expect(keys).not.toContain('q')
        expect(keys).toContain('escape')
        expect(keys).toContain('tab')
        expect(keys).toContain('S+tab')
    })

    test('embed.onBack fires on escape', () => {
        let backed = 0
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(0),
            stream: emptyStream(),
            resolveAction: okResolve,
            embed: {
                onBack: () => {
                    backed++
                },
                onStepNext: () => {},
                onStepPrev: () => {},
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('escape')
        expect(backed).toBe(1)
    })

    test('embed.onStepNext fires on tab; onStepPrev on shift+tab', () => {
        let next = 0
        let prev = 0
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(0),
            stream: emptyStream(),
            resolveAction: okResolve,
            embed: {
                onBack: () => {},
                onStepNext: () => {
                    next++
                },
                onStepPrev: () => {
                    prev++
                },
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('tab', false)
        view.keys.dispatch('tab', true)
        expect(next).toBe(1)
        expect(prev).toBe(1)
    })

    test('escape and tab/shift-tab are disabled while a modal is open', async () => {
        let backed = 0
        let next = 0
        const view = createTrackView({
            ctx: {entityType: 'ship', entityId: 3n},
            initialSnapshot: idle(2),
            stream: emptyStream(),
            resolveAction: okResolve,
            embed: {
                onBack: () => {
                    backed++
                },
                onStepNext: () => {
                    next++
                },
                onStepPrev: () => {},
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('r') // open modal
        view.keys.dispatch('escape')
        view.keys.dispatch('tab', false)
        // Modal is open; the bare escape/tab keys should not trigger embed callbacks.
        // (Within the modal, escape is consumed by interceptKey, not by hotkeys.)
        expect(backed).toBe(0)
        expect(next).toBe(0)
    })
})
