import type {ServerContract} from '../contracts'

export type EntityInfo = ServerContract.Types.entity_info

export interface BoundingBox {
    min_x: number
    min_y: number
    max_x: number
    max_y: number
}

export interface WireCoordinates {
    x: number
    y: number
    z?: number
}

// --- Client → Server ---

export type SubscribeMessage = {
    type: 'subscribe'
    sub_id: string
    bounds?: BoundingBox
    owner?: string
    prioritize_owner?: string
}

export type UpdateBoundsMessage = {
    type: 'update_bounds'
    sub_id: string
    bounds: BoundingBox
}

export type UnsubscribeMessage = {
    type: 'unsubscribe'
    sub_id: string
}

export type SubscribeEntityMessage = {
    type: 'subscribe_entity'
    sub_id: string
    entity_type: 'ship' | 'warehouse' | 'container'
    entity_id: string
}

export type UnsubscribeEntityMessage = {
    type: 'unsubscribe_entity'
    sub_id: string
}

export type SubscribeEventsMessage = {
    type: 'subscribe_events'
    sub_id: string
    event_filter?: Record<string, unknown>
}

export type UnsubscribeEventsMessage = {
    type: 'unsubscribe_events'
    sub_id: string
}

export type PingMessage = {type: 'ping'}

export type ClientMessage =
    | SubscribeMessage
    | UpdateBoundsMessage
    | UnsubscribeMessage
    | SubscribeEntityMessage
    | UnsubscribeEntityMessage
    | SubscribeEventsMessage
    | UnsubscribeEventsMessage
    | PingMessage

// --- Server → Client ---

export type AckMessage = {
    type: 'subscribed' | 'unsubscribed' | 'bounds_updated'
    sub_id: string
}

export type WireEntity = Record<string, unknown> & {
    type: number
    type_name: 'ship' | 'warehouse' | 'container'
    id: string | number
    owner: string
    coordinates: WireCoordinates
}

export type SnapshotMessage = {
    type: 'snapshot'
    sub_id: string
    seq: number
    entities: WireEntity[]
    truncated?: boolean
}

export type UpdateMessage = {
    type: 'update'
    sub_ids: string[]
    entity_id: number
    entity: WireEntity
    seq: number
}

export type BoundsDeltaMessage = {
    type: 'bounds_delta'
    sub_id: string
    entered: WireEntity[]
    exited: number[]
    seq: number
    truncated?: boolean
}

export type EventMessage = {
    type: 'event'
    sub_id: string
    catchup: boolean
    events: Array<Record<string, unknown>>
    seq?: number
}

export type EventCatchupCompleteMessage = {
    type: 'event_catchup_complete'
    sub_id: string
}

export type PongMessage = {type: 'pong'}

export type ErrorMessage = {
    type: 'error'
    error: string
    sub_id?: string
}

export type ServerMessage =
    | AckMessage
    | SnapshotMessage
    | UpdateMessage
    | BoundsDeltaMessage
    | EventMessage
    | EventCatchupCompleteMessage
    | PongMessage
    | ErrorMessage
