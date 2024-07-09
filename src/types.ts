import {UInt16, UInt16Type, UInt64, UInt64Type} from '@wharfkit/antelope'
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

export interface Good {
    id: UInt16
    name: string
    description: string
    base_price: UInt64
    mass: UInt64
}

export interface GoodType {
    id: UInt16Type
    name: string
    description: string
    base_price: UInt64Type
    mass: UInt64Type
}

export interface GoodPrice {
    good: Good
    price: UInt64
}

export interface Coordinates extends ServerContract.ActionParams.Type.coordinates {}
