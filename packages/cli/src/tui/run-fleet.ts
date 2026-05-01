import type {AnyAction} from '@wharfkit/antelope'
import {Name} from '@wharfkit/antelope'
import {SubscriptionsManager, type ServerTypes} from '@shipload/sdk'
import type {EntityTypeName} from '../lib/args'
import {getShipload} from '../lib/client'
import {loadConfig} from '../lib/config'
import {entityInfoToSnapshot, type EntitySnapshot, getEntitiesSnapshot} from '../lib/snapshot'
import {
    type FleetSubscribeManager,
    projectEntityStream,
    streamFleetSnapshots,
    teeFleet,
} from '../lib/snapshot-fleet'
import {transact} from '../lib/session'
import {runApp} from './app'
import type {ResolveSuccess} from './primitives/resolve-modal'
import {ActionDispatcher} from './state/actions'
import {createFleetView} from './views/fleet'
import type {EntityRow} from './views/fleet-derive'
import {createTrackView} from './views/track'

export interface RunFleetViewOpts {
    owner?: string
    type?: EntityTypeName
    timeoutMs?: number
}

const ACTION_TIMEOUT_MS = 30_000

function explorerUrlFor(txid: string): string {
    return `https://jungle4.unicove.com/en/jungle4/transaction/${txid}`
}

async function dispatchResolve(
    dispatcher: ActionDispatcher,
    label: string,
    description: string,
    actions: AnyAction | AnyAction[]
): Promise<ResolveSuccess> {
    let txid = ''
    const dispatch = await dispatcher.run(label, async () => {
        const args = Array.isArray(actions) ? {actions} : {action: actions}
        const result = await transact(args, {description})
        txid = result.txid
    })
    if (!dispatch.ok) throw new Error(dispatch.error)
    return {txid, explorerUrl: explorerUrlFor(txid)}
}

function wsUrlFromIndexer(httpUrl: string): string {
    const trimmed = httpUrl.replace(/\/+$/, '')
    const base = trimmed.replace(/^http/i, 'ws')
    return `${base}/ws`
}

export async function runFleetView(opts: RunFleetViewOpts = {}): Promise<void> {
    const cfg = loadConfig()
    const owner = opts.owner ?? cfg.actor
    if (!cfg.indexerUrl) {
        throw new Error(
            `Missing [indexer] url in config.ini at ${cfg.source}; required for shiploadcli track.`
        )
    }
    const wsUrl = wsUrlFromIndexer(cfg.indexerUrl)
    const sdkManager = new SubscriptionsManager({url: wsUrl})

    const adapter: FleetSubscribeManager = {
        subscribeOwner: (ownerName, handlers) => {
            const handle = sdkManager.subscribeOwner(ownerName, {
                onSnapshot: (entities) =>
                    handlers.onSnapshot?.(
                        entities.map((e) => entityInfoToSnapshot(e as ServerTypes.entity_info))
                    ),
                onUpdate: (entity) =>
                    handlers.onUpdate?.(entityInfoToSnapshot(entity as ServerTypes.entity_info)),
            })
            // Connection-state surfacing is not exposed on the SDK handle today;
            // report 'live' optimistically.
            handlers.onConnectionState?.('live')
            return {subId: handle.subId, unsubscribe: () => handle.unsubscribe()}
        },
    }

    const sourceStream = streamFleetSnapshots(
        {owner, type: opts.type},
        {manager: adapter, getEntitiesSnapshot}
    )
    const tee = teeFleet(sourceStream)
    const dispatcher = new ActionDispatcher({timeoutMs: ACTION_TIMEOUT_MS})

    const fleetView = createFleetView({
        owner,
        initialTick: {
            snaps: new Map(),
            ticks: new Map(),
            connection: 'connecting',
            sinceLastFetch_s: 0,
            fetchInterval_s: 60,
        },
        stream: tee.primary,
        defaults: {
            sort: cfg.track.defaultSort,
            typeFilter: cfg.track.defaultTypeFilter,
            statusFilter: cfg.track.defaultStatusFilter,
        },
        perEntityResolve: async (row: EntityRow) => {
            const shipload = await getShipload()
            const action = shipload.actions.resolve(
                BigInt(String(row.snap.id)),
                Name.from(String(row.snap.type))
            )
            return dispatchResolve(
                dispatcher,
                'resolve',
                `Resolved ${row.snap.type} ${row.snap.id}`,
                action
            )
        },
        bulkResolve: async (rows: EntityRow[]) => {
            const shipload = await getShipload()
            const actions = rows.map((r) =>
                shipload.actions.resolve(BigInt(String(r.snap.id)), Name.from(String(r.snap.type)))
            )
            return dispatchResolve(
                dispatcher,
                'bulk-resolve',
                `Resolved ${rows.length} entities`,
                actions
            )
        },
        openTrackView: (row, embed) => {
            const subStream = projectEntityStream(tee.subscribe(), row.key)
            return createTrackView({
                ctx: {
                    entityType: row.snap.type as EntityTypeName,
                    entityId: row.snap.id as bigint,
                },
                initialSnapshot: row.snap as EntitySnapshot,
                stream: subStream,
                resolveAction: async (count: number) => {
                    const shipload = await getShipload()
                    const action = shipload.actions.resolve(
                        BigInt(String(row.snap.id)),
                        Name.from(String(row.snap.type))
                    )
                    return dispatchResolve(
                        dispatcher,
                        'resolve',
                        `Resolved ${count} task(s) on ${row.snap.type} ${row.snap.id}`,
                        action
                    )
                },
                embed,
            })
        },
    })

    try {
        await runApp({
            view: fleetView,
            entityType: 'fleet',
            entityId: 0,
            timeoutMs: opts.timeoutMs,
        })
    } finally {
        sdkManager.close()
    }
}
