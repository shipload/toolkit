import {Name, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Coordinates} from '../types'
import {
    EnergyCapability,
    LoaderCapability,
    MassCapability,
    MovementCapability,
    ScheduleCapability,
    StorageCapability,
} from './capabilities'

export interface Entity {
    id: UInt64
    type: Name
    owner: Name
    entity_name: string
    location: Coordinates | ServerContract.Types.coordinates
}

export type ShipEntity = Entity &
    Partial<MovementCapability> &
    Partial<EnergyCapability> &
    StorageCapability &
    Partial<LoaderCapability> &
    MassCapability &
    ScheduleCapability & {
        gatherer?: ServerContract.Types.gatherer_stats
    }

export type WarehouseEntity = Entity &
    StorageCapability &
    Partial<LoaderCapability> &
    MassCapability &
    ScheduleCapability

export type ContainerEntity = Entity & StorageCapability & MassCapability & ScheduleCapability

export type AnyEntity = ShipEntity | WarehouseEntity | ContainerEntity
