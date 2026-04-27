import {UInt16, UInt16Type, UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Coordinates, CoordinatesType} from '../types'
import {
    getDestinationLocation,
    getPositionAt,
    getFlightOrigin as travelGetFlightOrigin,
} from '../travel/travel'
import {
    ProjectedEntity,
    projectFromCurrentState as sharedProjectFromCurrentState,
    projectFromCurrentStateAt as sharedProjectFromCurrentStateAt,
} from '../scheduling/projection'
import {Location} from './location'
import {ScheduleAccessor} from '../scheduling/accessor'
import {InventoryAccessor} from './inventory-accessor'
import {EntityInventory} from './entity-inventory'
import {
    energyPercent as calcEnergyPercent,
    needsRecharge as calcNeedsRecharge,
    hasEnergyForDistance,
    maxTravelDistance,
} from '../capabilities/movement'
import * as schedule from '../scheduling/schedule'

export interface PackedModuleInput {
    itemId: UInt16Type
    stats: UInt64Type
}

export interface ShipStateInput {
    id: UInt64Type
    owner: string
    name: string
    coordinates: CoordinatesType | {x: number; y: number; z?: number}
    hullmass?: number
    capacity?: number
    energy?: number
    modules?: PackedModuleInput[]
    schedule?: ServerContract.Types.schedule
    cargo?: ServerContract.Types.cargo_item[]
}

type MovementEntity = {
    engines: ServerContract.Types.movement_stats
    generator: ServerContract.Types.energy_stats
    energy: UInt16
}

export class Ship extends ServerContract.Types.entity_info {
    private _sched?: ScheduleAccessor
    private _inv?: InventoryAccessor

    get name(): string {
        return this.entity_name
    }

    get inv(): InventoryAccessor {
        this._inv ??= new InventoryAccessor(this)
        return this._inv
    }

    get inventory(): EntityInventory[] {
        return this.inv.items
    }

    get sched(): ScheduleAccessor {
        this._sched ??= new ScheduleAccessor(this)
        return this._sched
    }

    get maxDistance(): UInt32 {
        if (!this.generator || !this.engines) return UInt32.from(0)
        return maxTravelDistance(this as MovementEntity)
    }

    get isIdle(): boolean {
        return this.is_idle
    }

    getFlightOrigin(flightTaskIndex: number): Coordinates {
        return Coordinates.from(travelGetFlightOrigin(this, flightTaskIndex))
    }

    destinationLocation(): Coordinates | undefined {
        const dest = getDestinationLocation(this)
        return dest ? Coordinates.from(dest) : undefined
    }

    positionAt(now: Date): Coordinates {
        const taskIndex = this.sched.currentTaskIndex(now)
        const progress = this.sched.currentTaskProgress(now)
        return Coordinates.from(getPositionAt(this, taskIndex, progress))
    }

    isInFlight(now: Date): boolean {
        return schedule.isInFlight(this, now)
    }

    isRecharging(now: Date): boolean {
        return schedule.isRecharging(this, now)
    }

    isLoading(now: Date): boolean {
        return schedule.isLoading(this, now)
    }

    isUnloading(now: Date): boolean {
        return schedule.isUnloading(this, now)
    }

    isGathering(now: Date): boolean {
        return schedule.isGathering(this, now)
    }

    get hasEngines(): boolean {
        return this.engines !== undefined
    }

    get hasGenerator(): boolean {
        return this.generator !== undefined
    }

    get hasGatherer(): boolean {
        return this.gatherer !== undefined
    }

    get hasWarp(): boolean {
        return this.warp !== undefined
    }

    project(): ProjectedEntity {
        return sharedProjectFromCurrentState(this)
    }

    projectAt(now: Date): ProjectedEntity {
        return sharedProjectFromCurrentStateAt(this, now)
    }

    get location(): Location {
        return Location.from(this.coordinates)
    }

    get totalCargoMass(): UInt64 {
        return this.inv.totalMass
    }

    get totalMass(): UInt64 {
        let mass = UInt64.from(this.hullmass ?? 0).adding(this.totalCargoMass)
        if (this.loaders) {
            mass = mass.adding(UInt64.from(this.loaders.mass).multiplying(this.loaders.quantity))
        }
        return mass
    }

    get maxCapacity(): UInt64 {
        return UInt64.from(this.capacity)
    }

    hasSpace(goodMass: UInt64, quantity: number): boolean {
        return this.totalMass.adding(goodMass.multiplying(quantity)).lte(this.maxCapacity)
    }

    get availableCapacity(): UInt64 {
        return this.totalMass.gte(this.maxCapacity)
            ? UInt64.from(0)
            : this.maxCapacity.subtracting(this.totalMass)
    }

    getCargoForItem(goodId: UInt64Type): EntityInventory | undefined {
        return this.inv.forItem(goodId)
    }

    get sellableCargo(): EntityInventory[] {
        return this.inv.sellable
    }

    get hasSellableCargo(): boolean {
        return this.inv.hasSellable
    }

    get sellableGoodsCount(): number {
        return this.inv.sellableCount
    }

    get isFull(): boolean {
        return this.totalMass.gte(this.maxCapacity)
    }

    get energyPercent(): number {
        if (!this.generator || this.energy === undefined) return 0
        return calcEnergyPercent(this as MovementEntity)
    }

    get needsRecharge(): boolean {
        if (!this.generator || this.energy === undefined) return false
        return calcNeedsRecharge(this as MovementEntity)
    }

    hasEnergyFor(distance: UInt64): boolean {
        if (!this.engines || !this.generator || this.energy === undefined) return false
        return hasEnergyForDistance(this as MovementEntity, distance)
    }
}
