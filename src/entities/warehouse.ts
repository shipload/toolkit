import {Name, NameType, UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Coordinates, CoordinatesType, TaskType} from '../types'
import {Location} from './location'
import {getGood} from '../market/goods'
import * as schedule from '../scheduling/schedule'
import {Scheduleable} from '../scheduling/schedule'
import {EntityInventory} from './entity-inventory'

export interface WarehouseStateInput {
    id: UInt64Type
    owner: NameType
    name: string
    location: CoordinatesType | {x: number; y: number; z?: number}
    capacity: number
    loaders: ServerContract.Types.loader_stats
    schedule?: ServerContract.Types.schedule
    cargo?: ServerContract.Types.cargo_item[]
}

export class Warehouse extends ServerContract.Types.entity_info implements Scheduleable {
    static fromState(state: WarehouseStateInput): Warehouse {
        const entityInfo = ServerContract.Types.entity_info.from({
            type: Name.from('warehouse'),
            id: UInt64.from(state.id),
            owner: Name.from(state.owner),
            entity_name: state.name,
            location: ServerContract.Types.coordinates.from(state.location),
            capacity: UInt32.from(state.capacity),
            cargomass: UInt32.from(0),
            cargo: state.cargo || [],
            loaders: state.loaders,
            is_idle: !state.schedule,
            current_task_elapsed: UInt32.from(0),
            current_task_remaining: UInt32.from(0),
            pending_tasks: [],
            schedule: state.schedule,
            mass: UInt32.from(0),
            energy: 0,
            engines: ServerContract.Types.movement_stats.from({
                thrust: 0,
                drain: 0,
                maxmass: 0,
            }),
            generator: ServerContract.Types.energy_stats.from({
                capacity: 0,
                recharge: 0,
            }),
        })
        return new Warehouse(entityInfo)
    }

    private _location?: Location
    private _inventory?: EntityInventory[]

    get name(): string {
        return this.entity_name
    }

    get inventory(): EntityInventory[] {
        if (!this._inventory) {
            this._inventory = this.cargo.map((item) => new EntityInventory(item))
        }
        return this._inventory
    }

    get hasSchedule(): boolean {
        return schedule.hasSchedule(this)
    }

    get isIdle(): boolean {
        return this.is_idle
    }

    get tasks(): ServerContract.Types.task[] {
        return schedule.getTasks(this)
    }

    scheduleDuration(): number {
        return schedule.scheduleDuration(this)
    }

    scheduleElapsed(now: Date): number {
        return schedule.scheduleElapsed(this, now)
    }

    scheduleRemaining(now: Date): number {
        return schedule.scheduleRemaining(this, now)
    }

    scheduleComplete(now: Date): boolean {
        return schedule.scheduleComplete(this, now)
    }

    currentTaskIndex(now: Date): number {
        return schedule.currentTaskIndex(this, now)
    }

    currentTask(now: Date): ServerContract.Types.task | undefined {
        return schedule.currentTask(this, now)
    }

    currentTaskType(now: Date): TaskType | undefined {
        return schedule.currentTaskType(this, now)
    }

    getTaskStartTime(index: number): number {
        return schedule.getTaskStartTime(this, index)
    }

    getTaskElapsed(index: number, now: Date): number {
        return schedule.getTaskElapsed(this, index, now)
    }

    getTaskRemaining(index: number, now: Date): number {
        return schedule.getTaskRemaining(this, index, now)
    }

    isTaskComplete(index: number, now: Date): boolean {
        return schedule.isTaskComplete(this, index, now)
    }

    isTaskInProgress(index: number, now: Date): boolean {
        return schedule.isTaskInProgress(this, index, now)
    }

    currentTaskProgress(now: Date): number {
        return schedule.currentTaskProgress(this, now)
    }

    scheduleProgress(now: Date): number {
        return schedule.scheduleProgress(this, now)
    }

    isLoading(now: Date): boolean {
        const taskType = this.currentTaskType(now)
        return taskType === TaskType.LOAD
    }

    isUnloading(now: Date): boolean {
        const taskType = this.currentTaskType(now)
        return taskType === TaskType.UNLOAD
    }

    calcCargoMass(): UInt64 {
        let mass = UInt64.from(0)
        for (const item of this.cargo) {
            const good = getGood(item.good_id)
            mass = mass.adding(good.mass.multiplying(item.quantity))
        }
        return mass
    }

    get currentLocation(): Coordinates {
        return this.location
    }

    get totalCargoMass(): UInt64 {
        return this.inventory.reduce((sum, c) => sum.adding(c.totalMass), UInt64.from(0))
    }

    get cargoValue(): UInt64 {
        return this.inventory.reduce((sum, c) => sum.adding(c.totalCost), UInt64.from(0))
    }

    get maxCapacity(): UInt64 {
        return UInt64.from(this.capacity)
    }

    get availableCapacity(): UInt64 {
        if (this.totalCargoMass.gte(this.maxCapacity)) {
            return UInt64.from(0)
        }
        return this.maxCapacity.subtracting(this.totalCargoMass)
    }

    hasSpace(goodMass: UInt64, quantity: number): boolean {
        const additionalMass = goodMass.multiplying(quantity)
        const newTotal = this.totalCargoMass.adding(additionalMass)
        return newTotal.lte(this.maxCapacity)
    }

    get isFull(): boolean {
        return this.totalCargoMass.gte(this.maxCapacity)
    }

    get locationObject(): Location {
        if (!this._location) {
            this._location = Location.from(this.location)
        }
        return this._location
    }

    setLocation(location: Location): void {
        this._location = location
    }

    getCargoForGood(goodId: UInt64Type): EntityInventory | undefined {
        return this.inventory.find((c) => c.good_id.equals(goodId))
    }

    get orbitalAltitude(): number {
        return this.location.z?.toNumber() || 0
    }
}
