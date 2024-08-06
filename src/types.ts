import {Struct, UInt16, UInt16Type, UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from './contracts'

export const PRECISION = 10000
export const TRAVEL_MAXMASS_PENALTY = 5 // Penalty (in seconds) for exceeding the maximum mass per 1000 unit

export interface CameraPosition extends ServerContract.ActionParams.Type.coordinates {
    z: number
}

export interface Dimensions {
    width: number
    height: number
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
    @Struct.field(UInt64)
    base_price!: UInt64
    @Struct.field(UInt64)
    mass!: UInt64
}

export interface GoodType {
    id: UInt16Type
    name: string
    description: string
    base_price: UInt64Type
    mass: UInt64Type
}

@Struct.type('GoodPrice')
export class GoodPrice extends Struct {
    @Struct.field(UInt16)
    id!: UInt16
    @Struct.field(Good)
    good!: Good
    @Struct.field(UInt64)
    price!: UInt64
    @Struct.field(UInt64)
    supply!: UInt64
}

export interface Coordinates extends ServerContract.ActionParams.Type.coordinates {}
