import {UInt64, type UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import type {CoordinatesType} from '../types'
import {type FloatPosition, getInterpolatedPosition} from '../travel/travel'
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

    get entityClass(): 'mobile' {
        return 'mobile'
    }

    get canUndeploy(): boolean {
        return true
    }

    get sched(): ScheduleAccessor {
        this._sched ??= new ScheduleAccessor(this)
        return this._sched
    }

    get isIdle(): boolean {
        return this.is_idle
    }

    interpolatedPositionAt(now: Date): FloatPosition {
        const taskIndex = this.sched.currentTaskIndex(now)
        const progress = this.sched.currentTaskProgressFloat(now)
        return getInterpolatedPosition(this, taskIndex, progress)
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
    const density = stats.density
    const strength = stats.strength
    const hardness = stats.hardness
    const saturation = stats.saturation

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
    const strength = stats.strength
    const density = stats.density
    const hardness = stats.hardness
    const saturation = stats.saturation

    const hullmass = 20000 + 50 * density

    const statSum = strength + hardness + saturation
    const exponent = statSum / 2500
    const capacity = Math.floor(1500000 * 10 ** exponent)

    return {hullmass, capacity}
}
