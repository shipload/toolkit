import {UInt16, UInt32, UInt64, UInt8} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {
    CAP_DEMOLISH,
    CAP_MODULES,
    CAP_UNDEPLOY,
    CAP_WRAP,
    type EntityClass,
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
        return schedule.isIdle(this)
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

    get gatherer(): {yield: UInt16; drain: UInt32; depth: UInt16} | undefined {
        if (this.gatherer_lanes.length === 0) return undefined
        let totalYield = 0
        let totalDrain = 0
        let maxDepth = 0
        for (const l of this.gatherer_lanes) {
            totalYield += Number(l.yield)
            totalDrain += Number(l.drain)
            const d = Number(l.depth)
            if (d > maxDepth) maxDepth = d
        }
        return {
            yield: UInt16.from(Math.min(totalYield, 65535)),
            drain: UInt32.from(totalDrain),
            depth: UInt16.from(maxDepth),
        }
    }

    get loaders(): {mass: UInt32; thrust: UInt16; quantity: UInt8} | undefined {
        if (this.loader_lanes.length === 0) return undefined
        const count = this.loader_lanes.length
        let totalMass = 0
        let totalThrust = 0
        for (const l of this.loader_lanes) {
            totalMass += Number(l.mass)
            totalThrust += Number(l.thrust)
        }
        return {
            mass: UInt32.from(Math.floor(totalMass / count)),
            thrust: UInt16.from(Math.min(totalThrust, 65535)),
            quantity: UInt8.from(count),
        }
    }

    get crafter(): {speed: UInt16; drain: UInt32} | undefined {
        if (this.crafter_lanes.length === 0) return undefined
        let totalSpeed = 0
        let totalDrain = 0
        for (const l of this.crafter_lanes) {
            totalSpeed += Number(l.speed)
            totalDrain += Number(l.drain)
        }
        return {
            speed: UInt16.from(Math.min(totalSpeed, 65535)),
            drain: UInt32.from(totalDrain),
        }
    }

    isLoading(now: Date): boolean {
        return schedule.isLoading(this, now)
    }

    isUnloading(now: Date): boolean {
        return schedule.isUnloading(this, now)
    }
}
