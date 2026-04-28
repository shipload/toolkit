import {WebSocketConnection, type ConnectionState} from './connection'
import type {
    BoundingBox,
    BoundsDeltaMessage,
    ClientMessage,
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
import type {Ship} from '../entities/ship'
import type {Warehouse} from '../entities/warehouse'
import type {Container} from '../entities/container'

export type SubscriptionEntityType = 'ship' | 'warehouse' | 'container'
export type EntityInstance = Ship | Warehouse | Container

export interface SubscriptionsOptions {
    url: string
    minReconnectDelay?: number
    pingIntervalMs?: number
    pongTimeoutMs?: number
}

export interface BoundsSubscriptionHandle {
    readonly subId: string
    unsubscribe(): void
    updateBounds(bounds: BoundingBox): void
    current: Map<number, EntityInstance>
}

export interface EntitySubscriptionHandle {
    readonly subId: string
    readonly entityType: SubscriptionEntityType
    readonly entityId: string
    unsubscribe(): void
    current: EntityInstance | null
}

export class SubscriptionsManager {
    private readonly conn: WebSocketConnection
    private readonly entitySubs = new Map<
        string,
        {
            type: SubscriptionEntityType
            id: string
            onUpdate: (e: EntityInstance) => void
            handle: EntitySubscriptionHandle
        }
    >()
    private readonly boundsSubs = new Map<
        string,
        {
            bounds?: BoundingBox
            owner?: string
            prioritizeOwner?: string
            onSnapshot?: (entities: EntityInstance[]) => void
            onUpdate?: (entity: EntityInstance) => void
            onBoundsDelta?: (entered: EntityInstance[], exited: number[]) => void
            handle: BoundsSubscriptionHandle
        }
    >()
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

    subscribeEntity(
        type: SubscriptionEntityType,
        id: string,
        onUpdate: (e: EntityInstance) => void
    ): EntitySubscriptionHandle {
        const subId = this.generateSubID('ent')
        const msg: SubscribeEntityMessage = {
            type: 'subscribe_entity',
            sub_id: subId,
            entity_type: type,
            entity_id: id,
        }
        const handle: EntitySubscriptionHandle = {
            subId,
            entityType: type,
            entityId: id,
            unsubscribe: () => this.unsubscribeEntity(subId),
            current: null,
        }
        this.entitySubs.set(subId, {type, id, onUpdate, handle})
        this.sendMessage(msg)
        return handle
    }

    private unsubscribeEntity(subId: string) {
        const entry = this.entitySubs.get(subId)
        if (!entry) return
        this.entitySubs.delete(subId)
        const msg: UnsubscribeEntityMessage = {type: 'unsubscribe_entity', sub_id: subId}
        this.sendMessage(msg)
    }

    subscribeBounds(
        bounds: BoundingBox,
        handlers: {
            onSnapshot?: (entities: EntityInstance[]) => void
            onUpdate?: (entity: EntityInstance) => void
            onBoundsDelta?: (entered: EntityInstance[], exited: number[]) => void
            owner?: string
            prioritizeOwner?: string
        }
    ): BoundsSubscriptionHandle {
        const subId = this.generateSubID('bnd')
        const msg: SubscribeMessage = {
            type: 'subscribe',
            sub_id: subId,
            bounds,
            owner: handlers.owner,
            prioritize_owner: handlers.prioritizeOwner,
        }
        const handle: BoundsSubscriptionHandle = {
            subId,
            unsubscribe: () => this.unsubscribeBounds(subId),
            updateBounds: (b) => this.updateBounds(subId, b),
            current: new Map(),
        }
        this.boundsSubs.set(subId, {
            bounds,
            owner: handlers.owner,
            prioritizeOwner: handlers.prioritizeOwner,
            onSnapshot: handlers.onSnapshot,
            onUpdate: handlers.onUpdate,
            onBoundsDelta: handlers.onBoundsDelta,
            handle,
        })
        this.sendMessage(msg)
        return handle
    }

    private unsubscribeBounds(subId: string) {
        this.boundsSubs.delete(subId)
        this.sendMessage({type: 'unsubscribe', sub_id: subId})
    }

    private updateBounds(subId: string, bounds: BoundingBox) {
        const entry = this.boundsSubs.get(subId)
        if (entry) entry.bounds = bounds
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
            const msg: SubscribeEntityMessage = {
                type: 'subscribe_entity',
                sub_id: subId,
                entity_type: entry.type,
                entity_id: entry.id,
            }
            this.sendMessage(msg)
        }
        for (const [subId, entry] of this.boundsSubs) {
            const msg: SubscribeMessage = {
                type: 'subscribe',
                sub_id: subId,
                bounds: entry.bounds,
                owner: entry.owner,
                prioritize_owner: entry.prioritizeOwner,
            }
            this.sendMessage(msg)
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
        const entSub = this.entitySubs.get(msg.sub_id)
        if (entSub) {
            if (msg.entities.length > 0) {
                const ent = this.parseEntity(msg.entities[0])
                entSub.handle.current = ent
                entSub.onUpdate(ent)
            }
            return
        }
        const boundsSub = this.boundsSubs.get(msg.sub_id)
        if (boundsSub) {
            const ents = msg.entities.map((e) => this.parseEntity(e))
            boundsSub.handle.current.clear()
            for (const e of ents) boundsSub.handle.current.set(Number(e.id), e)
            boundsSub.onSnapshot?.(ents)
        }
    }

    private handleUpdate(msg: UpdateMessage) {
        const ent = this.parseEntity(msg.entity)
        for (const subId of msg.sub_ids) {
            const entSub = this.entitySubs.get(subId)
            if (entSub) {
                entSub.handle.current = ent
                entSub.onUpdate(ent)
                continue
            }
            const boundsSub = this.boundsSubs.get(subId)
            if (boundsSub) {
                boundsSub.handle.current.set(msg.entity_id, ent)
                boundsSub.onUpdate?.(ent)
            }
        }
    }

    private handleBoundsDelta(msg: BoundsDeltaMessage) {
        const sub = this.boundsSubs.get(msg.sub_id)
        if (!sub) return
        const entered = msg.entered.map((e) => this.parseEntity(e))
        for (const e of entered) sub.handle.current.set(Number(e.id), e)
        for (const id of msg.exited) sub.handle.current.delete(id)
        sub.onBoundsDelta?.(entered, msg.exited)
    }

    private handleError(msg: {sub_id?: string; error: string}) {
        if (!msg.sub_id) return
        const entSub = this.entitySubs.get(msg.sub_id)
        if (entSub) {
            this.entitySubs.delete(msg.sub_id)
            return
        }
        const boundsSub = this.boundsSubs.get(msg.sub_id)
        if (boundsSub) {
            this.boundsSubs.delete(msg.sub_id)
        }
    }
}
