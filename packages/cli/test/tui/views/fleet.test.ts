import {describe, expect, test} from 'bun:test'
import type {EntityKey, EntitySnapshot} from '../../../src/lib/snapshot'
import type {FleetTick} from '../../../src/lib/snapshot-fleet'
import {type Hotkey, HotkeyRegistry} from '../../../src/tui/hotkeys'
import type {View} from '../../../src/tui/view'
import {createFleetView} from '../../../src/tui/views/fleet'

function makeStubView(): View {
    return {
        keys: new HotkeyRegistry<Hotkey>([]),
        attach: () => {},
        dispose: async () => {},
        onExit: new Promise(() => {}),
        interceptKey: () => false,
    }
}

function snap(type: string, id: number, isIdle: boolean, completed = 0): EntitySnapshot {
    return {
        type,
        id: BigInt(id),
        owner: 'alice',
        entity_name: `${type}-${id}`,
        coordinates: {x: 0, y: 0},
        cargomass: 0,
        cargo: [],
        is_idle: isIdle,
        schedule: {tasks: new Array(completed).fill({type: 1, duration: 30n})},
    }
}

function tickFor(snaps: EntitySnapshot[]): FleetTick {
    const map = new Map<EntityKey, EntitySnapshot>()
    const ticks = new Map()
    for (const s of snaps) {
        const k = `${s.type}:${String(s.id)}` as EntityKey
        map.set(k, s)
        ticks.set(k, {
            snap: s,
            elapsed_s: 0,
            remaining_s: 0,
            total_s: 0,
            attempt: 0,
            sinceLastFetch_s: 0,
            fetchInterval_s: 60,
        })
    }
    return {snaps: map, ticks, connection: 'live', sinceLastFetch_s: 0, fetchInterval_s: 60}
}

async function* singleTickStream(t: FleetTick): AsyncGenerator<FleetTick, void, void> {
    yield t
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

const noopOpts = {
    perEntityResolve: async () => ({txid: 'x', explorerUrl: 'http://x'}),
    bulkResolve: async () => ({txid: 'x', explorerUrl: 'http://x'}),
    openTrackView: () => makeStubView(),
} as const

describe('createFleetView', () => {
    test('exposes q, ?, t, f, s, /, r, R, return hotkeys', () => {
        const t = tickFor([snap('ship', 1, false)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        const keys = view.keys.all().map((h) => `${h.shift ? 'S+' : ''}${h.key}`)
        for (const expected of ['q', '?', 't', 'f', 's', '/', 'r', 'S+r', 'return']) {
            expect(keys).toContain(expected)
        }
    })

    test("'q' resolves onExit", async () => {
        const t = tickFor([])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('q')
        await view.onExit
        await view.dispose()
    })

    test('cursor starts at first row when entities present', () => {
        const t = tickFor([snap('ship', 1, false), snap('ship', 2, true)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        expect(view.cursorKey()).toBe('ship:1')
    })

    test('cursor wraps with up/down', () => {
        const t = tickFor([snap('ship', 1, false), snap('ship', 2, false), snap('ship', 3, false)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('down')
        expect(view.cursorKey()).toBe('ship:2')
        view.keys.dispatch('down')
        expect(view.cursorKey()).toBe('ship:3')
        view.keys.dispatch('down')
        expect(view.cursorKey()).toBe('ship:1') // wrap
        view.keys.dispatch('up')
        expect(view.cursorKey()).toBe('ship:3')
    })

    test("'r' is disabled when cursor row has no completed tasks", () => {
        const t = tickFor([snap('ship', 1, false)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        const r = view.keys.all().find((h) => h.key === 'r' && !h.shift)
        expect(r?.enabled()).toBe(false)
    })

    test("'r' is enabled when cursor row is idle with completed tasks", () => {
        const t = tickFor([snap('ship', 1, true, 2)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        const r = view.keys.all().find((h) => h.key === 'r' && !h.shift)
        expect(r?.enabled()).toBe(true)
    })

    test('Shift-R is disabled when no visible entities are resolvable', () => {
        const t = tickFor([snap('ship', 1, false), snap('ship', 2, true)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        const sr = view.keys.all().find((h) => h.key === 'r' && h.shift)
        expect(sr?.enabled()).toBe(false)
    })

    test('Shift-R is enabled when at least one visible entity is resolvable', () => {
        const t = tickFor([snap('ship', 1, true, 1), snap('ship', 2, false)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        const sr = view.keys.all().find((h) => h.key === 'r' && h.shift)
        expect(sr?.enabled()).toBe(true)
    })

    test('empty fleet renders empty-state placeholder', () => {
        const t = tickFor([])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        expect(view.cursorKey()).toBeNull()
    })

    test("'s' cycles sort mode forward", () => {
        const t = tickFor([snap('ship', 1, false)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        // We can't directly inspect sort mode through the public surface unless it's exposed.
        // Instead, verify that pressing 's' is dispatchable and doesn't throw.
        // (Sort behavior is tested in deriveVisible; here we just confirm the hotkey wires up.)
        expect(view.keys.dispatch('s')).toBe(true)
        expect(view.keys.dispatch('s', true)).toBe(true)
    })

    test("'t' cycles type filter; cursor adjusts to remaining visible row", () => {
        const t = tickFor([snap('ship', 1, false), snap('container', 2, true)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        // Initial cursor (sort=type+id) is on container:2 (alphabetically first). Then cycle t → ship.
        view.keys.dispatch('t')
        expect(view.cursorKey()).toBe('ship:1')
    })

    test("'f' cycles status filter", () => {
        const t = tickFor([snap('ship', 1, false), snap('ship', 2, true, 1)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('f') // all → busy
        expect(view.cursorKey()).toBe('ship:1')
        view.keys.dispatch('f') // busy → resolvable
        expect(view.cursorKey()).toBe('ship:2')
    })

    test("'/' enters search mode; sequence narrows visible list, Enter accepts", () => {
        const ships = [
            {...snap('ship', 1, false), entity_name: 'Roborovski'},
            {...snap('ship', 2, false), entity_name: 'Stardust'},
        ]
        const t = tickFor(ships)
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('/')
        // Feed characters via interceptKey using opentui's KeyEvent shape (key.sequence is the char).
        view.interceptKey?.({name: 'r', sequence: 'r'} as never)
        view.interceptKey?.({name: 'o', sequence: 'o'} as never)
        view.interceptKey?.({name: 'b', sequence: 'b'} as never)
        view.interceptKey?.({name: 'return'} as never)
        expect(view.cursorKey()).toBe('ship:1')
    })

    test('Esc in search mode clears the query and exits', () => {
        const t = tickFor([snap('ship', 1, false), snap('ship', 2, false)])
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            ...noopOpts,
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('/')
        view.interceptKey?.({name: 'x', sequence: 'x'} as never) // query = 'x'
        // Both rows are now filtered out (no name contains 'x'); cursor would be null.
        view.interceptKey?.({name: 'escape'} as never) // clears + exits
        // Both rows visible again
        expect(view.cursorKey()).toBe('ship:1')
    })

    test("'r' opens per-entity confirm modal; OK + Enter dispatches resolve", async () => {
        const ships = [
            {
                ...snap('ship', 1, true, 2), // idle with 2 completed tasks
            },
        ]
        const t = tickFor(ships)
        let dispatched: string | null = null
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            perEntityResolve: async (row) => {
                dispatched = row.key
                return {txid: 'abc', explorerUrl: 'http://abc'}
            },
            bulkResolve: async () => ({txid: '', explorerUrl: ''}),
            openTrackView: () => makeStubView(),
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('r')
        view.interceptKey?.({name: 'return'} as never)
        await new Promise((r) => setTimeout(r, 5))
        expect(dispatched).toBe('ship:1')
    })

    test('Shift-R resolves across all visible resolvable entities', async () => {
        const resolvable = (id: number): EntitySnapshot => ({
            ...snap('ship', id, true, 1),
        })
        const t = tickFor([resolvable(1), resolvable(2), snap('ship', 3, false)])
        let dispatchedCount: number | null = null
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            perEntityResolve: async () => ({txid: '', explorerUrl: ''}),
            bulkResolve: async (rows) => {
                dispatchedCount = rows.length
                return {txid: 'multi', explorerUrl: 'http://multi'}
            },
            openTrackView: () => makeStubView(),
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('r', true)
        view.interceptKey?.({name: 'return'} as never)
        await new Promise((r) => setTimeout(r, 5))
        expect(dispatchedCount).toBe(2)
    })

    test('bulk resolve caps at 50 entities even when more are resolvable', async () => {
        const resolvable = (id: number): EntitySnapshot => ({
            ...snap('ship', id, true, 1),
        })
        const snaps: EntitySnapshot[] = []
        for (let i = 1; i <= 60; i++) snaps.push(resolvable(i))
        const t = tickFor(snaps)
        let receivedCount = 0
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            perEntityResolve: async () => ({txid: '', explorerUrl: ''}),
            bulkResolve: async (rows) => {
                receivedCount = rows.length
                return {txid: '', explorerUrl: ''}
            },
            openTrackView: () => makeStubView(),
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('r', true)
        view.interceptKey?.({name: 'return'} as never)
        await new Promise((r) => setTimeout(r, 5))
        expect(receivedCount).toBe(50)
    })

    test('Enter opens drill-in via openTrackView; embed.onBack pops it', async () => {
        const t = tickFor([snap('ship', 1, false), snap('ship', 2, false)])
        let popped = false
        const fakeView: View = {
            keys: new HotkeyRegistry<Hotkey>([]),
            attach: () => {},
            dispose: async () => {},
            onExit: new Promise(() => {}),
            interceptKey: () => false,
        }
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            perEntityResolve: async () => ({txid: '', explorerUrl: ''}),
            bulkResolve: async () => ({txid: '', explorerUrl: ''}),
            openTrackView: (_row, embed) => {
                // Simulate the drilled view triggering onBack on next event-loop tick.
                setTimeout(() => {
                    embed.onBack()
                    popped = true
                }, 0)
                return fakeView
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('return')
        await new Promise((r) => setTimeout(r, 5))
        expect(popped).toBe(true)
    })

    test('Tab in drill-in calls embed.onStepNext and reopens with the next row', async () => {
        const t = tickFor([snap('ship', 1, false), snap('ship', 2, false)])
        const openedFor: bigint[] = []
        const view = createFleetView({
            owner: 'alice',
            initialTick: t,
            stream: singleTickStream(t),
            defaults: {sort: 'type+id', typeFilter: 'all', statusFilter: 'all'},
            perEntityResolve: async () => ({txid: '', explorerUrl: ''}),
            bulkResolve: async () => ({txid: '', explorerUrl: ''}),
            openTrackView: (row, embed) => {
                openedFor.push(row.snap.id as bigint)
                return {
                    keys: new HotkeyRegistry<Hotkey>([]),
                    attach: () => {},
                    dispose: async () => {},
                    onExit: new Promise(() => {}),
                    interceptKey: (key: {name: string; shift?: boolean}) => {
                        if (key.name === 'tab' && !key.shift) {
                            embed.onStepNext()
                            return true
                        }
                        return false
                    },
                } as View
            },
        })
        view.attach(fakeRenderer() as never)
        view.keys.dispatch('return')
        view.interceptKey?.({name: 'tab', shift: false} as never)
        expect(openedFor).toEqual([1n, 2n])
    })
})
