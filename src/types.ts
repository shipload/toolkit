import {
    Int64Type,
    Name,
    Struct,
    UInt16,
    UInt16Type,
    UInt32,
    UInt32Type,
    UInt64,
} from '@wharfkit/antelope'
import {ServerContract} from './contracts'

export const PRECISION = 10000
export const CRAFT_ENERGY_DIVISOR = 150000

export const WAREHOUSE_Z = 500
export const INITIAL_WAREHOUSE_CAPACITY = 10000000

export const CONTAINER_Z = 300
export const INITIAL_CONTAINER_HULLMASS = 50000
export const INITIAL_CONTAINER_CAPACITY = 2000000

export const TRAVEL_MAX_DURATION = 86400

export const MIN_ORBITAL_ALTITUDE = 800
export const MAX_ORBITAL_ALTITUDE = 3000

export const BASE_ORBITAL_MASS = 100000

export interface ShipLike {
    coordinates: ServerContract.Types.coordinates
    hullmass?: UInt32
    energy?: UInt16
    engines?: ServerContract.Types.movement_stats
    generator?: ServerContract.Types.energy_stats
    loaders?: ServerContract.Types.loader_stats
    capacity?: UInt32
}

export interface CargoMassInfo {
    item_id: UInt16Type
    quantity: UInt32Type
}

export enum TaskType {
    IDLE = 0,
    TRAVEL = 1,
    RECHARGE = 2,
    LOAD = 3,
    UNLOAD = 4,
    EXTRACT = 5,
    WARP = 6,
    CRAFT = 7,
    DEPLOY = 8,
    DEPLOY_SHIP = 9,
}

export enum LocationType {
    EMPTY = 0,
    PLANET = 1,
    ASTEROID = 2,
    NEBULA = 3,
}

export enum TaskCancelable {
    NEVER = 0,
    BEFORE_START = 1,
    ALWAYS = 2,
}

export const EntityType = {
    SHIP: Name.from('ship'),
    WAREHOUSE: Name.from('warehouse'),
    CONTAINER: Name.from('container'),
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

    toLocationId(): UInt64 {
        return coordsToLocationId(this)
    }
}

export function coordsToLocationId(coords: CoordinatesType): UInt64 {
    const c = Coordinates.from(coords)
    const mask = BigInt(0xffffffff)
    const x = BigInt(c.x.toNumber()) & mask
    const y = BigInt(c.y.toNumber()) & mask
    const id = (x << BigInt(32)) | y
    return UInt64.from(id)
}

export interface Distance {
    origin: ServerContract.ActionParams.Type.coordinates
    destination: ServerContract.ActionParams.Type.coordinates
    distance: UInt16
}

export type ResourceCategory = 'metal' | 'precious' | 'gas' | 'mineral' | 'organic'
export type ResourceTier = 't1' | 't2' | 't3' | 't4' | 't5'

@Struct.type('item')
export class Item extends Struct {
    @Struct.field(UInt16)
    id!: UInt16
    @Struct.field('string')
    name!: string
    @Struct.field('string')
    description!: string
    @Struct.field(UInt32)
    mass!: UInt32
    @Struct.field('string')
    category!: ResourceCategory
    @Struct.field('string')
    tier!: ResourceTier
    @Struct.field('string')
    color!: string
}
