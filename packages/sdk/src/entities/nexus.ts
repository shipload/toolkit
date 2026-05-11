import type {UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import type {CoordinatesType} from '../types'
import {Location} from './location'

export interface NexusStateInput {
    id: UInt64Type
    owner: string
    name: string
    coordinates: CoordinatesType | {x: number; y: number; z?: number}
}

export class Nexus extends ServerContract.Types.entity_info {
    get name(): string {
        return this.entity_name
    }

    get entityClass(): 'orbital' {
        return 'orbital'
    }

    get location(): Location {
        return Location.from(this.coordinates)
    }

    get orbitalAltitude(): number {
        return this.coordinates.z?.toNumber() || 0
    }
}
