import {Int64Type, Name, Struct, UInt16, UInt16Type, UInt32, UInt32Type} from '@wharfkit/antelope'
import {ServerContract} from './contracts'

export const PRECISION = 10000

export const INITIAL_SHIP_MASS = 500000
export const MIN_ORBITAL_ALTITUDE = 800
export const MAX_ORBITAL_ALTITUDE = 3000

export interface ShipLike {
    location: ServerContract.Types.coordinates
    mass: UInt32
    energy: UInt16
    engines: ServerContract.Types.movement_stats
    generator: ServerContract.Types.energy_stats
    loaders: ServerContract.Types.loader_stats
    capacity: UInt32
}

export interface CargoMassInfo {
    good_id: UInt16Type
    quantity: UInt32Type
}

export enum TaskType {
    RECHARGE = 0,
    LOAD = 1,
    UNLOAD = 2,
    FLIGHT = 3,
}

export enum TaskCancelable {
    NEVER = 0, // Task cannot be cancelled
    BEFORE_START = 1, // Task can only be cancelled before it starts
    ALWAYS = 2, // Task can always be cancelled
}

export const EntityType = {
    SHIP: Name.from('ship'),
    WAREHOUSE: Name.from('warehouse'),
} as const

export type EntityTypeName = (typeof EntityType)[keyof typeof EntityType]

export type CoordinatesType =
    | Coordinates
    | ServerContract.Types.coordinates
    | {x: Int64Type; y: Int64Type}

export class Coordinates extends ServerContract.Types.coordinates {
    static from(value: CoordinatesType): Coordinates {
        return super.from(value) as Coordinates
    }

    equals(other: CoordinatesType): boolean {
        const coords = Coordinates.from(other)
        return this.x.equals(coords.x) && this.y.equals(coords.y)
    }
}

export interface Distance {
    origin: ServerContract.ActionParams.Type.coordinates
    destination: ServerContract.ActionParams.Type.coordinates
    distance: UInt16
}

@Struct.type('good')
export class Good extends Struct {
    @Struct.field(UInt16)
    id!: UInt16
    @Struct.field('string')
    name!: string
    @Struct.field('string')
    description!: string
    @Struct.field(UInt32)
    base_price!: UInt32
    @Struct.field(UInt32)
    mass!: UInt32
}

@Struct.type('GoodPrice')
export class GoodPrice extends Struct {
    @Struct.field(UInt16)
    id!: UInt16
    @Struct.field(Good)
    good!: Good
    @Struct.field(UInt32)
    price!: UInt32
    @Struct.field(UInt16)
    supply!: UInt16
}
