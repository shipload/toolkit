import {UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {
    CAP_DEMOLISH,
    CAP_MODULES,
    CAP_UNDEPLOY,
    CAP_WRAP,
    EntityClass,
    getEntityClass,
    kindCan,
} from '../data/kind-registry'
import {InventoryAccessor} from './inventory-accessor'
import {Location} from './location'
import {ScheduleAccessor} from '../scheduling/accessor'
import * as schedule from '../scheduling/schedule'
import type {EntityInventory} from './entity-inventory'

export class Entity extends ServerContract.Types.entity_info {
    private _sched?: ScheduleAccessor
    private _inv?: InventoryAccessor

    get name(): string {
        return this.entity_name
    }

    get location(): Location {
        return Location.from(this.coordinates)
    }

    get isIdle(): boolean {
        return this.is_idle
    }

    get sched(): ScheduleAccessor {
        this._sched ??= new ScheduleAccessor(this)
        return this._sched
    }

    get inv(): InventoryAccessor {
        this._inv ??= new InventoryAccessor(this)
        return this._inv
    }

    get inventory(): EntityInventory[] {
        return this.inv.items
    }

    get totalCargoMass(): UInt64 {
        return this.inv.totalMass
    }

    get maxCapacity(): UInt64 {
        return UInt64.from(this.capacity ?? 0)
    }

    get availableCapacity(): UInt64 {
        const cargo = this.totalCargoMass
        const max = this.maxCapacity
        return cargo.gte(max) ? UInt64.from(0) : max.subtracting(cargo)
    }

    get isFull(): boolean {
        return this.totalCargoMass.gte(this.maxCapacity)
    }

    get totalMass(): UInt64 {
        const hull = this.hullmass ? UInt64.from(this.hullmass) : UInt64.from(0)
        return hull.adding(this.totalCargoMass)
    }

    get entityClass(): EntityClass {
        return getEntityClass(this.type)
    }

    get canWrap(): boolean {
        return kindCan(this.type, CAP_WRAP)
    }

    get canUndeploy(): boolean {
        return kindCan(this.type, CAP_UNDEPLOY)
    }

    get canDemolish(): boolean {
        return kindCan(this.type, CAP_DEMOLISH)
    }

    get canUseModules(): boolean {
        return kindCan(this.type, CAP_MODULES)
    }

    isLoading(now: Date): boolean {
        return schedule.isLoading(this, now)
    }

    isUnloading(now: Date): boolean {
        return schedule.isUnloading(this, now)
    }
}
