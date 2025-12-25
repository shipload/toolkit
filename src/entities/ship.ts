import {Name, NameType, UInt16, UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Coordinates, CoordinatesType, PRECISION, TaskType} from '../types'
import {distanceBetweenCoordinates, lerp} from '../travel/travel'
import {Location} from './location'
import {getGood} from '../market/goods'
import * as schedule from '../scheduling/schedule'
import {Scheduleable} from '../scheduling/schedule'
import {EntityInventory} from './entity-inventory'
import {ProjectedEntity} from '../scheduling/projection'

export interface ShipStateInput {
    id: UInt64Type
    owner: NameType
    name: string
    location: CoordinatesType | {x: number; y: number; z?: number}
    mass: number
    capacity: number
    energy: number
    engines: ServerContract.Types.movement_stats
    generator: ServerContract.Types.energy_stats
    loaders: ServerContract.Types.loader_stats
    schedule?: ServerContract.Types.schedule
    cargo?: ServerContract.Types.cargo_item[]
}

export class Ship extends ServerContract.Types.entity_info implements Scheduleable {
    static fromState(state: ShipStateInput): Ship {
        const entityInfo = ServerContract.Types.entity_info.from({
            type: Name.from('ship'),
            id: UInt64.from(state.id),
            owner: Name.from(state.owner),
            entity_name: state.name,
            location: ServerContract.Types.coordinates.from(state.location),
            mass: UInt32.from(state.mass),
            capacity: UInt32.from(state.capacity),
            energy: UInt16.from(state.energy),
            cargomass: UInt32.from(0),
            cargo: state.cargo || [],
            is_idle: !state.schedule,
            current_task_elapsed: UInt32.from(0),
            current_task_remaining: UInt32.from(0),
            pending_tasks: [],
            engines: state.engines,
            generator: state.generator,
            loaders: state.loaders,
            schedule: state.schedule,
        })
        return new Ship(entityInfo)
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

    get maxDistance(): UInt32 {
        if (!this.generator || !this.engines) return UInt32.from(0)
        return UInt32.from(this.generator.capacity)
            .dividing(this.engines.drain)
            .multiplying(PRECISION)
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

    getFlightOrigin(flightTaskIndex: number): Coordinates {
        if (!this.schedule) return this.location

        let origin: Coordinates = this.location
        for (let i = 0; i < flightTaskIndex && i < this.schedule.tasks.length; i++) {
            const task = this.schedule.tasks[i]
            if (task.type.equals(TaskType.FLIGHT) && task.location) {
                origin = task.location
            }
        }
        return origin
    }

    destinationLocation(): Coordinates | undefined {
        if (!this.schedule) return undefined

        for (let i = this.schedule.tasks.length - 1; i >= 0; i--) {
            const task = this.schedule.tasks[i]
            if (task.type.equals(TaskType.FLIGHT) && task.location) {
                return task.location
            }
        }
        return undefined
    }

    positionAt(now: Date): Coordinates {
        if (!this.schedule || this.schedule.tasks.length === 0) {
            return this.location
        }

        const taskIndex = this.currentTaskIndex(now)
        if (taskIndex < 0) return this.location

        const task = this.schedule.tasks[taskIndex]

        if (!task.type.equals(TaskType.FLIGHT) || !task.location) {
            return this.getFlightOrigin(taskIndex)
        }

        const origin = this.getFlightOrigin(taskIndex)
        const destination = task.location
        const progress = this.currentTaskProgress(now)

        const interpolated = lerp(origin, destination, progress)
        return Coordinates.from({
            x: Math.round(interpolated.x),
            y: Math.round(interpolated.y),
        })
    }

    isInFlight(now: Date): boolean {
        const taskType = this.currentTaskType(now)
        return taskType === TaskType.FLIGHT
    }

    isRecharging(now: Date): boolean {
        const taskType = this.currentTaskType(now)
        return taskType === TaskType.RECHARGE
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

    private createProjectedEntity(cargoMass: UInt64): ProjectedEntity {
        const shipMass = UInt32.from(this.mass)
        const loaders = this.loaders
        return {
            location: Coordinates.from(this.location),
            energy: UInt16.from(this.energy),
            cargoMass,
            shipMass,
            engines: this.engines,
            generator: this.generator,
            loaders,
            get totalMass() {
                let mass = UInt64.from(this.shipMass).adding(this.cargoMass)
                if (this.loaders) {
                    mass = mass.adding(this.loaders.mass.multiplying(this.loaders.quantity))
                }
                return mass
            },
        }
    }

    project(): ProjectedEntity {
        const cargoMass = this.calcCargoMass()
        const projected = this.createProjectedEntity(cargoMass)

        if (!this.schedule) {
            return projected
        }

        for (const task of this.schedule.tasks) {
            switch (task.type.toNumber()) {
                case TaskType.RECHARGE:
                    if (projected.generator) {
                        projected.energy = UInt16.from(projected.generator.capacity)
                    }
                    break
                case TaskType.FLIGHT: {
                    if (task.location) {
                        const distance = distanceBetweenCoordinates(
                            projected.location,
                            task.location
                        )
                        if (projected.engines) {
                            const energyUsage = distance
                                .dividing(PRECISION)
                                .multiplying(projected.engines.drain)
                            projected.energy = projected.energy.gt(energyUsage)
                                ? UInt16.from(projected.energy.subtracting(energyUsage))
                                : UInt16.from(0)
                        }
                        projected.location = Coordinates.from(task.location)
                    }
                    break
                }
                case TaskType.LOAD:
                    for (const item of task.cargo) {
                        const good = getGood(item.good_id)
                        projected.cargoMass = projected.cargoMass.adding(
                            good.mass.multiplying(item.quantity)
                        )
                    }
                    break
                case TaskType.UNLOAD:
                    for (const item of task.cargo) {
                        const good = getGood(item.good_id)
                        const cargoMass = good.mass.multiplying(item.quantity)
                        projected.cargoMass = projected.cargoMass.gt(cargoMass)
                            ? projected.cargoMass.subtracting(cargoMass)
                            : UInt64.from(0)
                    }
                    break
            }
        }

        return projected
    }

    projectAt(now: Date): ProjectedEntity {
        const cargoMass = this.calcCargoMass()
        const projected = this.createProjectedEntity(cargoMass)

        if (!this.schedule || this.schedule.tasks.length === 0) {
            return projected
        }

        for (let i = 0; i < this.schedule.tasks.length; i++) {
            const task = this.schedule.tasks[i]
            const taskComplete = this.isTaskComplete(i, now)
            const taskInProgress = this.isTaskInProgress(i, now)

            if (!taskComplete && !taskInProgress) {
                break
            }

            switch (task.type.toNumber()) {
                case TaskType.RECHARGE:
                    if (projected.generator) {
                        if (taskComplete) {
                            projected.energy = UInt16.from(projected.generator.capacity)
                        } else if (taskInProgress) {
                            const progress = this.getTaskElapsed(i, now) / task.duration.toNumber()
                            const capacity = Number(projected.generator.capacity)
                            const currentEnergy = Number(projected.energy)
                            const rechargeAmount = (capacity - currentEnergy) * progress
                            projected.energy = UInt16.from(
                                Math.min(capacity, currentEnergy + rechargeAmount)
                            )
                        }
                    }
                    break
                case TaskType.FLIGHT: {
                    if (task.location && projected.engines) {
                        const origin = projected.location
                        const destination = Coordinates.from(task.location)
                        const distance = distanceBetweenCoordinates(origin, task.location)
                        const energyUsage = distance
                            .dividing(PRECISION)
                            .multiplying(projected.engines.drain)

                        if (taskComplete) {
                            projected.energy = projected.energy.gt(energyUsage)
                                ? UInt16.from(projected.energy.subtracting(energyUsage))
                                : UInt16.from(0)
                            projected.location = destination
                        } else if (taskInProgress) {
                            const progress = this.getTaskElapsed(i, now) / task.duration.toNumber()
                            const interpolated = lerp(origin, destination, progress)
                            projected.location = Coordinates.from({
                                x: Math.round(interpolated.x),
                                y: Math.round(interpolated.y),
                            })
                            const partialEnergy = UInt64.from(
                                Math.floor(Number(energyUsage) * progress)
                            )
                            projected.energy = projected.energy.gt(partialEnergy)
                                ? UInt16.from(projected.energy.subtracting(partialEnergy))
                                : UInt16.from(0)
                        }
                    }
                    break
                }
                case TaskType.LOAD:
                    if (taskComplete) {
                        for (const item of task.cargo) {
                            const good = getGood(item.good_id)
                            projected.cargoMass = projected.cargoMass.adding(
                                good.mass.multiplying(item.quantity)
                            )
                        }
                    }
                    break
                case TaskType.UNLOAD:
                    if (taskComplete) {
                        for (const item of task.cargo) {
                            const good = getGood(item.good_id)
                            const cargoMass = good.mass.multiplying(item.quantity)
                            projected.cargoMass = projected.cargoMass.gt(cargoMass)
                                ? projected.cargoMass.subtracting(cargoMass)
                                : UInt64.from(0)
                        }
                    }
                    break
            }
        }

        return projected
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

    get totalMass(): UInt64 {
        const cargoMass = this.totalCargoMass
        let mass = UInt64.from(this.mass ?? 0).adding(cargoMass)
        if (this.loaders) {
            mass = mass.adding(UInt64.from(this.loaders.mass).multiplying(this.loaders.quantity))
        }
        return mass
    }

    get maxCapacity(): UInt64 {
        return UInt64.from(this.capacity)
    }

    hasSpace(goodMass: UInt64, quantity: number): boolean {
        const additionalMass = goodMass.multiplying(quantity)
        const newTotal = this.totalMass.adding(additionalMass)
        return newTotal.lte(this.maxCapacity)
    }

    get availableCapacity(): UInt64 {
        if (this.totalMass.gte(this.maxCapacity)) {
            return UInt64.from(0)
        }
        return this.maxCapacity.subtracting(this.totalMass)
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

    get sellableCargo(): EntityInventory[] {
        return this.inventory.filter((c) => c.hasCargo)
    }

    get hasSellableCargo(): boolean {
        return this.inventory.some((c) => c.hasCargo)
    }

    get sellableGoodsCount(): number {
        return this.inventory.filter((c) => c.hasCargo).length
    }

    get isFull(): boolean {
        return this.totalMass.gte(this.maxCapacity)
    }

    get energyPercent(): number {
        if (!this.generator) return 0
        return (Number(this.energy ?? 0) / Number(this.generator.capacity)) * 100
    }

    get needsRecharge(): boolean {
        if (!this.generator) return false
        return UInt64.from(this.energy ?? 0).lt(this.generator.capacity)
    }

    hasEnergyFor(distance: UInt64): boolean {
        if (!this.engines) return false
        const energyNeeded = distance.dividing(PRECISION).multiplying(this.engines.drain)
        return UInt64.from(this.energy ?? 0).gte(energyNeeded)
    }

    calculateSaleValue(prices: Map<number, UInt64>): {
        revenue: UInt64
        profit: UInt64
        cost: UInt64
    } {
        if (this.cargo.length === 0) {
            return {revenue: UInt64.from(0), profit: UInt64.from(0), cost: UInt64.from(0)}
        }

        let revenue = UInt64.from(0)
        let cost = UInt64.from(0)

        for (const item of this.cargo) {
            if (UInt32.from(item.quantity).equals(UInt32.from(0))) continue

            const goodId = Number(item.good_id)
            const salePrice = prices.get(goodId)

            if (salePrice) {
                revenue = revenue.adding(salePrice.multiplying(item.quantity))
            }

            cost = cost.adding(item.unit_cost.multiplying(item.quantity))
        }

        const profit = revenue.gte(cost) ? revenue.subtracting(cost) : UInt64.from(0)

        return {
            revenue,
            profit,
            cost,
        }
    }

    calculateSaleValueFromArray(prices: UInt64[]): {
        revenue: UInt64
        profit: UInt64
        cost: UInt64
    } {
        const priceMap = new Map<number, UInt64>()
        prices.forEach((price, index) => {
            priceMap.set(index, price)
        })
        return this.calculateSaleValue(priceMap)
    }

    afterSellGoods(goodsToSell: Array<{goodId: number; quantity: number}>): EntityInventory[] {
        if (this.cargo.length === 0) {
            return []
        }

        return this.cargo.map((item) => {
            const saleItem = goodsToSell.find((s) => Number(item.good_id) === s.goodId)
            if (!saleItem) {
                return new EntityInventory(item)
            }

            const currentQty = Number(item.quantity)
            const newQty = Math.max(0, currentQty - saleItem.quantity)

            return new EntityInventory(
                ServerContract.Types.cargo_item.from({
                    good_id: item.good_id,
                    quantity: UInt32.from(newQty),
                    unit_cost: item.unit_cost,
                })
            )
        })
    }

    afterSellAllGoods(): EntityInventory[] {
        if (this.cargo.length === 0) {
            return []
        }

        return this.cargo.map(
            (item) =>
                new EntityInventory(
                    ServerContract.Types.cargo_item.from({
                        good_id: item.good_id,
                        quantity: UInt32.from(0),
                        unit_cost: item.unit_cost,
                    })
                )
        )
    }
}
