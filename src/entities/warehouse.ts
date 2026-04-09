import {UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {CoordinatesType} from '../types'
import {Location} from './location'
import {ScheduleAccessor} from '../scheduling/accessor'
import {InventoryAccessor} from './inventory-accessor'
import {EntityInventory} from './entity-inventory'
import * as schedule from '../scheduling/schedule'

export interface WarehouseStateInput {
    id: UInt64Type
    owner: string
    name: string
    coordinates: CoordinatesType | {x: number; y: number; z?: number}
    hullmass?: number
    capacity: number
    loaders?: ServerContract.Types.loader_stats
    schedule?: ServerContract.Types.schedule
    cargo?: ServerContract.Types.cargo_item[]
}

export class Warehouse extends ServerContract.Types.entity_info {
    private _sched?: ScheduleAccessor
    private _inv?: InventoryAccessor

    get name(): string {
        return this.entity_name
    }

    get inv(): InventoryAccessor {
        return (this._inv ??= new InventoryAccessor(this))
    }

    get inventory(): EntityInventory[] {
        return this.inv.items
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

    get totalCargoMass(): UInt64 {
        return this.inv.totalMass
    }

    get maxCapacity(): UInt64 {
        return UInt64.from(this.capacity)
    }

    get availableCapacity(): UInt64 {
        const cargo = this.totalCargoMass
        return cargo.gte(this.maxCapacity) ? UInt64.from(0) : this.maxCapacity.subtracting(cargo)
    }

    hasSpace(goodMass: UInt64, quantity: number): boolean {
        return this.totalCargoMass.adding(goodMass.multiplying(quantity)).lte(this.maxCapacity)
    }

    get isFull(): boolean {
        return this.totalCargoMass.gte(this.maxCapacity)
    }

    getCargoForItem(goodId: UInt64Type): EntityInventory | undefined {
        return this.inv.forItem(goodId)
    }

    get orbitalAltitude(): number {
        return this.coordinates.z?.toNumber() || 0
    }

    get totalMass(): UInt64 {
        const hull = this.hullmass ? UInt64.from(this.hullmass) : UInt64.from(0)
        return hull.adding(this.totalCargoMass)
    }
}
