import {WebSocketConnection, type ConnectionState} from './connection'
import type {
    BoundingBox,
    BoundsDeltaMessage,
    ClientMessage,
    ClusterCellWire,
    ClusterDeltaMessage,
    EntityDeletedMessage,
    ServerMessage,
    SnapshotMessage,
    SubscribeEntityMessage,
    SubscribeMessage,
    UnsubscribeEntityMessage,
    UpdateBoundsMessage,
    UpdateMessage,
    WireEntity,
} from './types'
import {mapEntity, parseWireEntity} from './mappers'
import type {Entity} from '../entities/entity'

export type SubscriptionEntityType = 'ship' | 'warehouse' | 'container' | 'nexus'
export type EntityInstance = Entity

export interface SubscriptionsOptions {
    url: string
    minReconnectDelay?: number
    pingIntervalMs?: number
    pongTimeoutMs?: number
}

export type ExactEntitySubscriptionFilter = {
    id: string | number
    owner?: never
    bounds?: never
    prioritizeOwner?: never
}

export type BroadEntitySubscriptionFilter = {
    id?: undefined
    owner?: string
    bounds?: BoundingBox
    prioritizeOwner?: string
}

export type EntitySubscriptionFilter = ExactEntitySubscriptionFilter | BroadEntitySubscriptionFilter

export interface EntitySubscriptionMeta {
    seq?: number
    truncated?: boolean
}

export interface EntitySubscriptionHandlers {
    onSnapshot?: (entities: EntityInstance[], meta: EntitySubscriptionMeta) => void
    onUpdate?: (entity: EntityInstance, meta: EntitySubscriptionMeta) => void
    onBoundsDelta?: (
        entered: EntityInstance[],
        exited: number[],
        meta: EntitySubscriptionMeta
    ) => void
    onDeleted?: (id: string, meta: EntitySubscriptionMeta) => void
    onError?: (error: Error) => void
    onCluster?: (payload: {
        hubId: number
        seq: number
        cells: ClusterCellWire[] | null
        erased: boolean
    }) => void
}

export interface EntitiesSubscriptionHandle {
    readonly subId: string
    readonly filter: EntitySubscriptionFilter
    unsubscribe(): void
    current: Map<number, EntityInstance>
}

export type BoundsSubscriptionHandle = EntitiesSubscriptionHandle & {
    readonly filter: BroadEntitySubscriptionFilter & {bounds: BoundingBox}
    updateBounds(bounds: BoundingBox): void
}
export type OwnerSubscriptionHandle = EntitiesSubscriptionHandle & {
    readonly filter: BroadEntitySubscriptionFilter
}
export type EntitySubscriptionHandle = EntitiesSubscriptionHandle & {
    readonly filter: ExactEntitySubscriptionFilter
}

type EntitiesSubscriptionEntry = {
    filter: InternalEntitySubscriptionFilter
    handlers: EntitySubscriptionHandlers
    handle: EntitiesSubscriptionHandle
}

type InternalEntitySubscriptionFilter = {
    id?: string | number
    owner?: string
    bounds?: BoundingBox
    prioritizeOwner?: string
}

export class SubscriptionsManager {
    private readonly conn: WebSocketConnection
    private readonly entitySubs = new Map<string, EntitiesSubscriptionEntry>()
    private subCounter = 0
    private hasConnected = false

    constructor(opts: SubscriptionsOptions) {
        this.conn = new WebSocketConnection({
            url: opts.url,
            onMessage: (m) => this.onMessage(m),
            onStateChange: (s) => this.onStateChange(s),
            minReconnectDelay: opts.minReconnectDelay,
            pingIntervalMs: opts.pingIntervalMs,
            pongTimeoutMs: opts.pongTimeoutMs,
        })
        this.conn.connect()
    }

    close() {
        this.conn.close()
    }

    private generateSubID(prefix: string): string {
        this.subCounter += 1
        return `${prefix}-${this.subCounter}-${Math.random().toString(36).slice(2, 8)}`
    }

    private sendMessage(msg: ClientMessage) {
        this.conn.send(msg)
    }

    subscribeEntities(
        filter: BroadEntitySubscriptionFilter & {bounds: BoundingBox},
        handlers?: EntitySubscriptionHandlers
    ): BoundsSubscriptionHandle
    subscribeEntities(
        filter: ExactEntitySubscriptionFilter,
        handlers?: EntitySubscriptionHandlers
    ): EntitySubscriptionHandle
    subscribeEntities(
        filter: BroadEntitySubscriptionFilter,
        handlers?: EntitySubscriptionHandlers
    ): EntitiesSubscriptionHandle
    subscribeEntities(
        filter: EntitySubscriptionFilter,
        handlers?: EntitySubscriptionHandlers
    ): EntitiesSubscriptionHandle
    subscribeEntities(
        filter: EntitySubscriptionFilter,
        handlers: EntitySubscriptionHandlers = {}
    ): EntitiesSubscriptionHandle {
        const storedFilter = this.normalizeFilter(filter)
        const subId = this.generateSubID(this.subscriptionPrefix(storedFilter))
        const handle: EntitiesSubscriptionHandle = {
            subId,
            get filter() {
                return SubscriptionsManager.publicFilter(storedFilter)
            },
            unsubscribe: () => this.unsubscribeEntities(subId),
            current: new Map(),
        }
        if (storedFilter.id === undefined && storedFilter.bounds) {
            ;(handle as BoundsSubscriptionHandle).updateBounds = (bounds) =>
                this.updateBounds(subId, bounds)
        }

        this.entitySubs.set(subId, {filter: storedFilter, handlers, handle})
        this.sendMessage(this.subscribeMessage(subId, storedFilter))
        return handle
    }

    subscribeEntity(
        id: string | number,
        handlers: EntitySubscriptionHandlers
    ): EntitySubscriptionHandle {
        return this.subscribeEntities({id}, handlers)
    }

    subscribeOwner(
        owner: string,
        handlers: EntitySubscriptionHandlers = {}
    ): OwnerSubscriptionHandle {
        return this.subscribeEntities({owner}, handlers) as OwnerSubscriptionHandle
    }

    subscribeBounds(
        bounds: BoundingBox,
        handlers: EntitySubscriptionHandlers & {
            owner?: string
            prioritizeOwner?: string
        } = {}
    ): BoundsSubscriptionHandle {
        return this.subscribeEntities(
            {bounds, owner: handlers.owner, prioritizeOwner: handlers.prioritizeOwner},
            handlers
        )
    }

    subscribeAllEntities(handlers: EntitySubscriptionHandlers = {}): EntitiesSubscriptionHandle {
        return this.subscribeEntities({}, handlers)
    }

    private normalizeFilter(filter: EntitySubscriptionFilter): InternalEntitySubscriptionFilter {
        const raw = filter as InternalEntitySubscriptionFilter
        if (
            raw.id !== undefined &&
            (raw.owner !== undefined ||
                raw.bounds !== undefined ||
                raw.prioritizeOwner !== undefined)
        ) {
            throw new Error(
                'Exact entity subscription filters cannot include owner, bounds, or prioritizeOwner'
            )
        }
        if (raw.id !== undefined) {
            return {id: raw.id}
        }
        return {
            owner: raw.owner,
            bounds: raw.bounds ? this.cloneBounds(raw.bounds) : undefined,
            prioritizeOwner: raw.prioritizeOwner,
        }
    }

    private static publicFilter(
        filter: InternalEntitySubscriptionFilter
    ): EntitySubscriptionFilter {
        if (filter.id !== undefined) {
            return Object.freeze({id: filter.id}) as ExactEntitySubscriptionFilter
        }

        return Object.freeze({
            owner: filter.owner,
            bounds: filter.bounds ? (Object.freeze({...filter.bounds}) as BoundingBox) : undefined,
            prioritizeOwner: filter.prioritizeOwner,
        }) as BroadEntitySubscriptionFilter
    }

    private cloneBounds(bounds: BoundingBox): BoundingBox {
        return {...bounds}
    }

    private subscriptionPrefix(filter: InternalEntitySubscriptionFilter): string {
        if (filter.id !== undefined) return 'ent'
        if (filter.bounds) return 'bnd'
        if (filter.owner) return 'own'
        return 'all'
    }

    private subscribeMessage(
        subId: string,
        filter: InternalEntitySubscriptionFilter
    ): SubscribeEntityMessage | SubscribeMessage {
        if (filter.id !== undefined) {
            return {
                type: 'subscribe_entity',
                sub_id: subId,
                entity_id: String(filter.id),
            }
        }

        return {
            type: 'subscribe',
            sub_id: subId,
            owner: filter.owner,
            bounds: filter.bounds,
            prioritize_owner: filter.prioritizeOwner,
        }
    }

    private unsubscribeEntities(subId: string) {
        const entry = this.entitySubs.get(subId)
        if (!entry) return
        this.entitySubs.delete(subId)
        if (entry.filter.id !== undefined) {
            const msg: UnsubscribeEntityMessage = {type: 'unsubscribe_entity', sub_id: subId}
            this.sendMessage(msg)
            return
        }
        this.sendMessage({type: 'unsubscribe', sub_id: subId})
    }

    private updateBounds(subId: string, bounds: BoundingBox) {
        const entry = this.entitySubs.get(subId)
        if (!entry) return
        if (entry.filter.id !== undefined || !entry.filter.bounds) return
        entry.filter.bounds = this.cloneBounds(bounds)
        const msg: UpdateBoundsMessage = {type: 'update_bounds', sub_id: subId, bounds}
        this.sendMessage(msg)
    }

    private onStateChange(state: ConnectionState) {
        if (state !== 'connected') return
        if (!this.hasConnected) {
            this.hasConnected = true
            return
        }
        for (const [subId, entry] of this.entitySubs) {
            this.sendMessage(this.subscribeMessage(subId, entry.filter))
        }
    }

    private onMessage(msg: ServerMessage) {
        switch (msg.type) {
            case 'snapshot':
                this.handleSnapshot(msg)
                break
            case 'update':
                this.handleUpdate(msg)
                break
            case 'bounds_delta':
                this.handleBoundsDelta(msg)
                break
            case 'entity_deleted':
                this.handleEntityDeleted(msg)
                break
            case 'cluster':
                this.handleCluster(msg)
                break
            case 'error':
                this.handleError(msg)
                break
        }
    }

    private parseEntity(raw: WireEntity): EntityInstance {
        const ei = parseWireEntity(raw)
        return mapEntity(ei)
    }

    private handleSnapshot(msg: SnapshotMessage) {
        const sub = this.entitySubs.get(msg.sub_id)
        if (!sub) return
        const meta = {seq: msg.seq, truncated: msg.truncated === true}
        const ents = msg.entities.map((e) => this.parseEntity(e))
        sub.handle.current.clear()
        for (const e of ents) sub.handle.current.set(Number(e.id), e)
        sub.handlers.onSnapshot?.(ents, meta)
        if (sub.filter.id !== undefined && ents[0]) {
            sub.handlers.onUpdate?.(ents[0], {seq: msg.seq})
        }
    }

    private handleUpdate(msg: UpdateMessage) {
        const ent = this.parseEntity(msg.entity)
        for (const subId of msg.sub_ids) {
            const sub = this.entitySubs.get(subId)
            if (!sub) continue
            sub.handle.current.set(msg.entity_id, ent)
            sub.handlers.onUpdate?.(ent, {seq: msg.seq})
        }
    }

    private handleBoundsDelta(msg: BoundsDeltaMessage) {
        const sub = this.entitySubs.get(msg.sub_id)
        if (!sub) return
        const meta = {seq: msg.seq, truncated: msg.truncated === true}
        const entered = msg.entered.map((e) => this.parseEntity(e))
        for (const e of entered) sub.handle.current.set(Number(e.id), e)
        for (const id of msg.exited) sub.handle.current.delete(id)
        sub.handlers.onBoundsDelta?.(entered, msg.exited, meta)
    }

    private handleError(msg: {sub_id?: string; error: string}) {
        if (!msg.sub_id) return
        const sub = this.entitySubs.get(msg.sub_id)
        if (!sub) return
        this.entitySubs.delete(msg.sub_id)
        sub.handlers.onError?.(new Error(msg.error))
    }

    private handleEntityDeleted(msg: EntityDeletedMessage) {
        const sub = this.entitySubs.get(msg.sub_id)
        if (!sub) return
        sub.handle.current.delete(msg.entity_id)
        if (sub.filter.id !== undefined) {
            this.entitySubs.delete(msg.sub_id)
        }
        sub.handlers.onDeleted?.(String(msg.entity_id), {seq: msg.seq})
    }

    private handleCluster(msg: ClusterDeltaMessage) {
        const sub = this.entitySubs.get(msg.sub_id)
        if (!sub) return
        sub.handlers.onCluster?.({
            hubId: msg.hub_id,
            seq: msg.seq,
            cells: msg.erased ? null : (msg.cells ?? []),
            erased: msg.erased === true,
        })
    }
}
