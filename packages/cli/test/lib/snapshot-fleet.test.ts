import {describe, expect, test} from 'bun:test'
import type {EntityKey, EntitySnapshot} from '../../src/lib/snapshot'
import {
    projectEntityStream,
    streamFleetSnapshots,
    teeFleet,
    type FleetStreamDeps,
    type FleetTick,
} from '../../src/lib/snapshot-fleet'

function busy(id: bigint, remaining: number, total = 60): EntitySnapshot {
    return {
        type: 'ship',
        id,
        owner: 'alice',
        entity_name: `S${id}`,
        coordinates: {x: 0, y: 0},
        cargomass: 0,
        cargo: [],
        is_idle: false,
        current_task_elapsed: total - remaining,
        current_task_remaining: remaining,
        schedule: {tasks: [{type: 1, duration: BigInt(total)} as never]},
    }
}

function makeFakeSubs() {
    const handlers: {
        onSnapshot?: (e: EntitySnapshot[]) => void
        onUpdate?: (e: EntitySnapshot) => void
        onConnectionState?: (s: 'connecting' | 'live' | 'reconnecting') => void
    } = {}
    return {
        handlers,
        subscribeOwner: (_owner: string, h: typeof handlers) => {
            Object.assign(handlers, h)
            return {subId: 'own-1', unsubscribe: () => {}}
        },
        getEntitiesSnapshot: async () => [],
    }
}

describe('streamFleetSnapshots', () => {
    test('first tick contains snapshot entities', async () => {
        const fake = makeFakeSubs()
        const deps: FleetStreamDeps = {
            manager: {subscribeOwner: fake.subscribeOwner} as never,
            getEntitiesSnapshot: fake.getEntitiesSnapshot,
            sleep: (_ms) => new Promise<void>((r) => setImmediate(r)),
            now: () => 0,
        }
        const gen = streamFleetSnapshots({owner: 'alice', renderIntervalMs: 1000}, deps)
        fake.handlers.onSnapshot?.([busy(1n, 30), busy(2n, 45)])
        const {value} = await gen.next()
        expect(value).toBeDefined()
        if (!value) throw new Error('no value')
        expect(value.ticks.size).toBe(2)
        const t1 = value.ticks.get('ship:1')
        expect(t1).toBeDefined()
        if (t1) expect(t1.remaining_s).toBeCloseTo(30, 1)
        await gen.return()
    })

    test('per-entity interpolation advances between ticks', async () => {
        const fake = makeFakeSubs()
        let now = 0
        const deps: FleetStreamDeps = {
            manager: {subscribeOwner: fake.subscribeOwner} as never,
            getEntitiesSnapshot: fake.getEntitiesSnapshot,
            sleep: (ms) => {
                now += ms
                return new Promise<void>((r) => setImmediate(r))
            },
            now: () => now,
        }
        const gen = streamFleetSnapshots({owner: 'alice', renderIntervalMs: 1000}, deps)
        fake.handlers.onSnapshot?.([busy(1n, 30)])
        await gen.next() // tick 0
        const second = await gen.next() // tick after 1s of model time
        if (!second.value) throw new Error('no value')
        const t1 = second.value.ticks.get('ship:1')
        if (!t1) throw new Error('no tick for ship:1')
        expect(t1.remaining_s).toBeCloseTo(29, 1)
        await gen.return()
    })

    test('update message replaces an entity in the cached map', async () => {
        const fake = makeFakeSubs()
        const deps: FleetStreamDeps = {
            manager: {subscribeOwner: fake.subscribeOwner} as never,
            getEntitiesSnapshot: fake.getEntitiesSnapshot,
            sleep: (_ms) => new Promise<void>((r) => setImmediate(r)),
            now: () => 0,
        }
        const gen = streamFleetSnapshots({owner: 'alice', renderIntervalMs: 1000}, deps)
        fake.handlers.onSnapshot?.([busy(1n, 30)])
        await gen.next()
        fake.handlers.onUpdate?.(busy(1n, 100))
        const next = await gen.next()
        const t1 = next.value?.ticks.get('ship:1')
        if (!t1) throw new Error('no tick')
        expect(t1.remaining_s).toBeCloseTo(100, 1)
        await gen.return()
    })

    test('type filter narrows the cached map', async () => {
        const fake = makeFakeSubs()
        const deps: FleetStreamDeps = {
            manager: {subscribeOwner: fake.subscribeOwner} as never,
            getEntitiesSnapshot: fake.getEntitiesSnapshot,
            sleep: (_ms) => new Promise<void>((r) => setImmediate(r)),
            now: () => 0,
        }
        const gen = streamFleetSnapshots({owner: 'alice', type: 'ship', renderIntervalMs: 1000}, deps)
        fake.handlers.onSnapshot?.([
            busy(1n, 30),
            {...busy(2n, 30), type: 'container'},
        ])
        const {value} = await gen.next()
        if (!value) throw new Error('no value')
        expect(value.ticks.size).toBe(1)
        expect(value.ticks.get('ship:1')).toBeDefined()
        expect(value.ticks.get('container:2')).toBeUndefined()
        await gen.return()
    })

    test('unsubscribes when the generator is closed', async () => {
        let unsubscribed = false
        const fake = {
            ...makeFakeSubs(),
            subscribeOwner(_owner: string, _h: never) {
                return {subId: 'own-1', unsubscribe: () => { unsubscribed = true }}
            },
        }
        const deps: FleetStreamDeps = {
            manager: {subscribeOwner: fake.subscribeOwner as never} as never,
            getEntitiesSnapshot: fake.getEntitiesSnapshot,
            sleep: (_ms) => new Promise<void>((r) => setImmediate(r)),
            now: () => 0,
        }
        const gen = streamFleetSnapshots({owner: 'alice', renderIntervalMs: 1000}, deps)
        fake.handlers.onSnapshot?.([])
        await gen.next()
        await gen.return()
        expect(unsubscribed).toBe(true)
    })

    test('resync timer calls getEntitiesSnapshot at the configured interval', async () => {
        const fake = makeFakeSubs()
        let now = 0
        let resyncCalls = 0
        const deps: FleetStreamDeps = {
            manager: {subscribeOwner: fake.subscribeOwner} as never,
            getEntitiesSnapshot: async () => {
                resyncCalls++
                return []
            },
            sleep: (ms) => {
                now += ms
                return new Promise<void>((r) => setImmediate(r))
            },
            now: () => now,
        }
        const gen = streamFleetSnapshots(
            {owner: 'alice', renderIntervalMs: 1000, resyncIntervalMs: 5000},
            deps
        )
        fake.handlers.onSnapshot?.([])
        // Advance 6 ticks (~6s of model time) — at least one resync should fire.
        for (let i = 0; i < 6; i++) await gen.next()
        expect(resyncCalls).toBeGreaterThanOrEqual(1)
        await gen.return()
    })
})

describe('projectEntityStream', () => {
    test('yields ticks for the given key, skips ticks where the key is absent', async () => {
        async function* fleetGen(): AsyncGenerator<{
            snaps: Map<EntityKey, never>
            ticks: Map<EntityKey, never>
            connection: 'live'
            sinceLastFetch_s: number
            fetchInterval_s: number
        }> {
            yield {
                snaps: new Map(),
                ticks: new Map([
                    ['ship:1' as EntityKey, {remaining_s: 30} as never],
                    ['ship:2' as EntityKey, {remaining_s: 45} as never],
                ]),
                connection: 'live',
                sinceLastFetch_s: 0,
                fetchInterval_s: 60,
            }
            yield {
                snaps: new Map(),
                ticks: new Map([['ship:2' as EntityKey, {remaining_s: 44} as never]]),
                connection: 'live',
                sinceLastFetch_s: 1,
                fetchInterval_s: 60,
            }
        }
        const out: number[] = []
        for await (const t of projectEntityStream(fleetGen() as never, 'ship:1' as EntityKey)) {
            out.push(t.remaining_s)
        }
        expect(out).toEqual([30])
    })

    test('yields nothing when the key never appears', async () => {
        async function* fleetGen(): AsyncGenerator<never> {
            // empty
        }
        const out: number[] = []
        for await (const t of projectEntityStream(fleetGen() as never, 'ship:99' as EntityKey)) {
            out.push(t.remaining_s)
        }
        expect(out).toEqual([])
    })
})

describe('teeFleet', () => {
    test('multiple subscribers receive the same ticks', async () => {
        async function* source(): AsyncGenerator<FleetTick, void, void> {
            yield {snaps: new Map(), ticks: new Map(), connection: 'live', sinceLastFetch_s: 0, fetchInterval_s: 60} as never
            yield {snaps: new Map(), ticks: new Map(), connection: 'live', sinceLastFetch_s: 1, fetchInterval_s: 60} as never
        }
        const tee = teeFleet(source())
        const subA = tee.subscribe()
        const collectedA: number[] = []
        const collectedB: number[] = []
        const consumeA = (async () => {
            for await (const t of subA) collectedA.push(t.sinceLastFetch_s)
        })()
        // Drive primary
        const primaryConsume = (async () => {
            for await (const t of tee.primary) collectedB.push(t.sinceLastFetch_s)
        })()
        await Promise.all([primaryConsume, consumeA])
        expect(collectedB).toEqual([0, 1])
        expect(collectedA).toEqual([0, 1])
    })

    test('a subscriber created mid-stream receives the cached last tick first', async () => {
        let resolveSecond!: () => void
        async function* source(): AsyncGenerator<FleetTick, void, void> {
            yield {snaps: new Map(), ticks: new Map(), connection: 'live', sinceLastFetch_s: 100, fetchInterval_s: 60} as never
            await new Promise<void>((r) => {
                resolveSecond = r
            })
            yield {snaps: new Map(), ticks: new Map(), connection: 'live', sinceLastFetch_s: 200, fetchInterval_s: 60} as never
        }
        const tee = teeFleet(source())
        const primaryFirst = (async () => {
            const it = tee.primary[Symbol.asyncIterator]()
            const first = await it.next()
            return {first: first.value as FleetTick | undefined, it}
        })()
        const {first, it} = await primaryFirst
        expect(first?.sinceLastFetch_s).toBe(100)

        // Subscribe AFTER first tick has been emitted; should immediately receive cached.
        const sub = tee.subscribe()
        const subIt = sub[Symbol.asyncIterator]()
        const cached = await subIt.next()
        expect(cached.value?.sinceLastFetch_s).toBe(100)

        // Emit second tick, both should see it.
        const subSecondPromise = subIt.next()
        const primarySecondPromise = it.next()
        resolveSecond()
        const [subSecond, primarySecond] = await Promise.all([subSecondPromise, primarySecondPromise])
        expect(subSecond.value?.sinceLastFetch_s).toBe(200)
        expect(primarySecond.value?.sinceLastFetch_s).toBe(200)

        // Drain to completion
        await it.return?.()
        await subIt.return?.()
    })
})
