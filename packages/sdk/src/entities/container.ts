import {UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {CoordinatesType} from '../types'
import {Location} from './location'
import {ScheduleAccessor} from '../scheduling/accessor'
import * as schedule from '../scheduling/schedule'

export interface ContainerStateInput {
    id: UInt64Type
    owner: string
    name: string
    coordinates: CoordinatesType | {x: number; y: number; z?: number}
    hullmass: number
    capacity: number
    cargomass?: number
    cargo?: ServerContract.Types.cargo_item[]
    schedule?: ServerContract.Types.schedule
}

export class Container extends ServerContract.Types.entity_info {
    private _sched?: ScheduleAccessor

    get name(): string {
        return this.entity_name
    }

    get sched(): ScheduleAccessor {
        return (this._sched ??= new ScheduleAccessor(this))
    }

    get isIdle(): boolean {
        return this.is_idle
    }

    isLoading(now: Date): boolean {
        return schedule.isLoading(this, now)
    }

    isUnloading(now: Date): boolean {
        return schedule.isUnloading(this, now)
    }

    get location(): Location {
        return Location.from(this.coordinates)
    }

    get totalMass(): UInt64 {
        return UInt64.from(this.hullmass ?? 0).adding(this.cargomass)
    }

    get maxCapacity(): UInt64 {
        return UInt64.from(this.capacity)
    }

    get availableCapacity(): UInt64 {
        const cargo = UInt64.from(this.cargomass)
        return cargo.gte(this.maxCapacity) ? UInt64.from(0) : this.maxCapacity.subtracting(cargo)
    }

    hasSpace(additionalMass: UInt64): boolean {
        return UInt64.from(this.cargomass).adding(additionalMass).lte(this.maxCapacity)
    }

    get isFull(): boolean {
        return UInt64.from(this.cargomass).gte(this.maxCapacity)
    }

    get orbitalAltitude(): number {
        return this.coordinates.z?.toNumber() || 0
    }
}

export function computeContainerCapabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const density = stats['density'] ?? 500
    const strength = stats['strength'] ?? 500
    const hardness = stats['hardness'] ?? 500
    const saturation = stats['saturation'] ?? 500

    const hullmass = 25000 + 75 * density

    const statSum = strength + hardness + saturation
    const exponent = statSum / 2997
    const capacity = Math.floor(1000000 * 10 ** exponent)

    return {hullmass, capacity}
}

export function computeContainerT2Capabilities(stats: Record<string, number>): {
    hullmass: number
    capacity: number
} {
    const strength = stats['strength'] ?? 0
    const density = stats['density'] ?? 0
    const hardness = stats['hardness'] ?? 0
    const saturation = stats['saturation'] ?? 0

    const hullmass = 20000 + 50 * density

    const statSum = strength + hardness + saturation
    const exponent = statSum / 2500
    const capacity = Math.floor(1500000 * 10 ** exponent)

    return {hullmass, capacity}
}
