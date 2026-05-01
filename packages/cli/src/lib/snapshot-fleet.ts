import type {EntityTypeName} from './args'
import {type EntitySnapshot, type EntityKey, entityKeyOf, getEntitiesSnapshot} from './snapshot'
import {SMOOTH_TOLERANCE_S, type SnapshotTick, toNumber} from './snapshot-stream'

export type ConnectionState = 'connecting' | 'live' | 'reconnecting'

export interface FleetTick {
    snaps: Map<EntityKey, EntitySnapshot>
    ticks: Map<EntityKey, SnapshotTick>
    connection: ConnectionState
    sinceLastFetch_s: number
    fetchInterval_s: number
}

export interface FleetSubscribeHandlers {
    onSnapshot?: (entities: EntitySnapshot[]) => void
    onUpdate?: (entity: EntitySnapshot) => void
    onConnectionState?: (s: ConnectionState) => void
}

export interface FleetSubscribeManager {
    subscribeOwner(
        owner: string,
        handlers: FleetSubscribeHandlers
    ): {subId: string; unsubscribe(): void}
}

export interface FleetStreamDeps {
    manager: FleetSubscribeManager
    getEntitiesSnapshot?: typeof getEntitiesSnapshot
    sleep?: (ms: number) => Promise<void>
    now?: () => number
}

export interface FleetStreamOpts {
    owner: string
    type?: EntityTypeName
    renderIntervalMs?: number
    resyncIntervalMs?: number
}

export const DEFAULT_RENDER_INTERVAL_MS = 1_000
export const DEFAULT_RESYNC_INTERVAL_MS = 60_000

interface EntityState {
    snap: EntitySnapshot
    snapAtModel: number
    elapsedAtFetch: number
    remainingAtFetch: number
    totalAtFetch: number
}

function makeEntityState(
    snap: EntitySnapshot,
    modelNow: number,
    prev?: EntityState
): EntityState {
    if (snap.is_idle) {
        return {
            snap,
            snapAtModel: modelNow,
            elapsedAtFetch: 0,
            remainingAtFetch: 0,
            totalAtFetch: 0,
        }
    }
    const newElapsed = toNumber(snap.current_task_elapsed)
    const newRemaining = toNumber(snap.current_task_remaining)
    const newTotal = newElapsed + newRemaining
    if (prev && !prev.snap.is_idle) {
        const dt = (modelNow - prev.snapAtModel) / 1000
        const interpRemaining = Math.max(0, prev.remainingAtFetch - dt)
        const sameTask = Math.abs(newTotal - prev.totalAtFetch) <= SMOOTH_TOLERANCE_S
        const closeToInterp = Math.abs(newRemaining - interpRemaining) <= SMOOTH_TOLERANCE_S
        if (sameTask && closeToInterp) {
            return {
                snap,
                snapAtModel: modelNow,
                elapsedAtFetch: Math.max(0, newTotal - interpRemaining),
                remainingAtFetch: interpRemaining,
                totalAtFetch: newTotal,
            }
        }
    }
    return {
        snap,
        snapAtModel: modelNow,
        elapsedAtFetch: newElapsed,
        remainingAtFetch: newRemaining,
        totalAtFetch: newTotal,
    }
}

function tickFromState(s: EntityState, modelNow: number, fetchInterval_s: number): SnapshotTick {
    const dt = (modelNow - s.snapAtModel) / 1000
    const elapsed_s = s.elapsedAtFetch + dt
    const remaining_s = Math.max(0, s.remainingAtFetch - dt)
    const total_s = s.totalAtFetch > 0 ? s.totalAtFetch : elapsed_s + remaining_s
    return {
        snap: s.snap,
        elapsed_s,
        remaining_s,
        total_s,
        attempt: 0,
        sinceLastFetch_s: 0,
        fetchInterval_s,
    }
}

export function streamFleetSnapshots(
    opts: FleetStreamOpts,
    deps: FleetStreamDeps
): AsyncGenerator<FleetTick, void, void> {
    const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
    const now = deps.now ?? (() => Date.now())
    const renderInterval = opts.renderIntervalMs ?? DEFAULT_RENDER_INTERVAL_MS
    const resyncInterval = opts.resyncIntervalMs ?? DEFAULT_RESYNC_INTERVAL_MS
    const fetcher = deps.getEntitiesSnapshot ?? getEntitiesSnapshot

    const startWall = now()
    let modelNow = 0
    let connection: ConnectionState = 'connecting'
    let lastResyncAtModel = 0
    const states = new Map<EntityKey, EntityState>()

    // Subscribe eagerly so callers can inject snapshot/update messages before
    // the first .next() call (consistent with how the WS manager actually
    // delivers messages — they can land before the consumer starts iterating).
    const sub = deps.manager.subscribeOwner(opts.owner, {
        onSnapshot: (entities) => {
            states.clear()
            for (const e of entities) {
                if (opts.type && e.type !== opts.type) continue
                states.set(entityKeyOf(e), makeEntityState(e, modelNow))
            }
        },
        onUpdate: (e) => {
            if (opts.type && e.type !== opts.type) return
            const key = entityKeyOf(e)
            const prev = states.get(key)
            states.set(key, makeEntityState(e, modelNow, prev))
        },
        onConnectionState: (s) => {
            connection = s
        },
    })

    async function* run(): AsyncGenerator<FleetTick, void, void> {
        try {
            while (true) {
                const ticks = new Map<EntityKey, SnapshotTick>()
                const snaps = new Map<EntityKey, EntitySnapshot>()
                for (const [k, s] of states) {
                    snaps.set(k, s.snap)
                    ticks.set(k, tickFromState(s, modelNow, renderInterval / 1000))
                }
                yield {
                    snaps,
                    ticks,
                    connection,
                    sinceLastFetch_s: (modelNow - lastResyncAtModel) / 1000,
                    fetchInterval_s: resyncInterval / 1000,
                }

                await sleep(renderInterval)
                modelNow = now() - startWall

                if (modelNow - lastResyncAtModel >= resyncInterval) {
                    lastResyncAtModel = modelNow
                    try {
                        const fresh = await fetcher(opts.owner, opts.type)
                        const next = new Map<EntityKey, EntityState>()
                        for (const e of fresh) {
                            if (opts.type && e.type !== opts.type) continue
                            const key = entityKeyOf(e)
                            const prev = states.get(key)
                            next.set(key, makeEntityState(e, modelNow, prev))
                        }
                        states.clear()
                        for (const [k, v] of next) states.set(k, v)
                    } catch {
                        // best-effort; skip this resync
                    }
                }
            }
        } finally {
            sub.unsubscribe()
        }
    }

    return run()
}

export async function* projectEntityStream(
    fleet: AsyncGenerator<FleetTick, void, void>,
    key: EntityKey
): AsyncGenerator<SnapshotTick, void, void> {
    for await (const ft of fleet) {
        const t = ft.ticks.get(key)
        if (t) yield t
    }
}

export interface FleetTee {
    primary: AsyncGenerator<FleetTick, void, void>
    subscribe(): AsyncGenerator<FleetTick, void, void>
}

export function teeFleet(source: AsyncGenerator<FleetTick, void, void>): FleetTee {
    type Listener = {push: (t: FleetTick) => void; end: () => void}
    const listeners = new Set<Listener>()
    let last: FleetTick | undefined

    async function* primary(): AsyncGenerator<FleetTick, void, void> {
        try {
            for await (const t of source) {
                last = t
                for (const l of listeners) l.push(t)
                yield t
            }
        } finally {
            for (const l of listeners) l.end()
        }
    }

    function subscribe(): AsyncGenerator<FleetTick, void, void> {
        const queue: FleetTick[] = []
        let resolveNext: ((value: IteratorResult<FleetTick, void>) => void) | null = null
        let done = false

        const listener: Listener = {
            push: (t) => {
                if (resolveNext) {
                    const r = resolveNext
                    resolveNext = null
                    r({value: t, done: false})
                } else {
                    queue.length = 0
                    queue.push(t)
                }
            },
            end: () => {
                done = true
                if (resolveNext) {
                    resolveNext({value: undefined, done: true})
                    resolveNext = null
                }
            },
        }
        listeners.add(listener)
        if (last !== undefined) listener.push(last)

        return (async function* () {
            try {
                while (true) {
                    if (queue.length > 0) {
                        const next = queue.shift() as FleetTick
                        yield next
                        continue
                    }
                    if (done) return
                    const item = await new Promise<IteratorResult<FleetTick, void>>(
                        (res) => {
                            resolveNext = res
                        }
                    )
                    if (item.done) return
                    yield item.value
                }
            } finally {
                listeners.delete(listener)
            }
        })()
    }

    return {primary: primary(), subscribe}
}
