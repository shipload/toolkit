import {Name, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Coordinates, PRECISION, TaskType} from '../types'
import {
    capsHasLoaders,
    capsHasMovement,
    capsHasStorage,
    EntityCapabilities,
    EntityState,
} from '../types/capabilities'
import {distanceBetweenCoordinates, lerp} from '../travel/travel'
import {calcCargoMass} from '../capabilities/storage'
import {getItem} from '../market/items'
import * as schedule from './schedule'
import {ScheduleData} from './schedule'

export interface ProjectedEntity {
    location: Coordinates
    energy: UInt16
    cargoMass: UInt64
    shipMass: UInt32
    capacity?: UInt64
    engines?: ServerContract.Types.movement_stats
    loaders?: ServerContract.Types.loader_stats
    generator?: ServerContract.Types.energy_stats
    readonly totalMass: UInt64

    hasMovement(): boolean
    hasStorage(): boolean
    hasLoaders(): boolean

    capabilities(): EntityCapabilities
    state(): EntityState
}

export interface Projectable extends ScheduleData {
    coordinates: Coordinates | ServerContract.Types.coordinates
    energy?: UInt16
    hullmass?: UInt32
    generator?: ServerContract.Types.energy_stats
    engines?: ServerContract.Types.movement_stats
    loaders?: ServerContract.Types.loader_stats
    capacity?: UInt32
    cargo: ServerContract.Types.cargo_item[]
    cargomass: UInt32
    owner?: Name
}

function getHullMass(entity: Projectable): UInt32 {
    return UInt32.from(entity.hullmass ?? 0)
}

export function createProjectedEntity(entity: Projectable): ProjectedEntity {
    const cargoMass = calcCargoMass(entity)
    const shipMass = getHullMass(entity)
    const loaders = entity.loaders
    const engines = entity.engines
    const generator = entity.generator
    const capacity = entity.capacity

    const projected: ProjectedEntity = {
        location: Coordinates.from(entity.coordinates),
        energy: UInt16.from(entity.energy ?? 0),
        cargoMass,
        shipMass,
        capacity: capacity ? UInt64.from(capacity) : undefined,
        engines,
        generator,
        loaders,

        get totalMass() {
            let mass = UInt64.from(this.shipMass).adding(this.cargoMass)
            if (this.loaders) {
                mass = mass.adding(this.loaders.mass.multiplying(this.loaders.quantity))
            }
            return mass
        },

        hasMovement() {
            return capsHasMovement(this.capabilities())
        },

        hasStorage() {
            return capsHasStorage(this.capabilities())
        },

        hasLoaders() {
            return capsHasLoaders(this.capabilities())
        },

        capabilities(): EntityCapabilities {
            return {
                hullmass: this.shipMass,
                capacity: this.capacity ? UInt32.from(this.capacity) : undefined,
                engines: this.engines,
                generator: this.generator,
                loaders: this.loaders,
            }
        },

        state(): EntityState {
            return {
                owner: entity.owner ?? Name.from(''),
                location: ServerContract.Types.coordinates.from(this.location),
                energy: this.energy,
                cargomass: UInt32.from(this.cargoMass),
                cargo: entity.cargo,
            }
        },
    }

    return projected
}

function applyRechargeTask(
    projected: ProjectedEntity,
    _task: ServerContract.Types.task,
    options: {complete: boolean; progress?: number}
): void {
    if (!projected.generator) return

    if (options.complete) {
        projected.energy = UInt16.from(projected.generator.capacity)
    } else if (options.progress !== undefined) {
        const capacity = Number(projected.generator.capacity)
        const currentEnergy = Number(projected.energy)
        const rechargeAmount = (capacity - currentEnergy) * options.progress
        projected.energy = UInt16.from(Math.min(capacity, currentEnergy + rechargeAmount))
    }
}

function applyFlightTask(
    projected: ProjectedEntity,
    task: ServerContract.Types.task,
    options: {complete: boolean; progress?: number}
): void {
    if (!task.coordinates || !projected.engines) return

    const origin = projected.location
    const destination = Coordinates.from(task.coordinates)
    const distance = distanceBetweenCoordinates(origin, task.coordinates)
    const energyUsage = distance.dividing(PRECISION).multiplying(projected.engines.drain)

    if (options.complete) {
        projected.energy = projected.energy.gt(energyUsage)
            ? UInt16.from(projected.energy.subtracting(energyUsage))
            : UInt16.from(0)
        projected.location = destination
    } else if (options.progress !== undefined) {
        const interpolated = lerp(origin, destination, options.progress)
        projected.location = Coordinates.from({
            x: Math.round(interpolated.x),
            y: Math.round(interpolated.y),
        })
        const partialEnergy = UInt64.from(Math.floor(Number(energyUsage) * options.progress))
        projected.energy = projected.energy.gt(partialEnergy)
            ? UInt16.from(projected.energy.subtracting(partialEnergy))
            : UInt16.from(0)
    }
}

function getItemMass(item_id: UInt16 | number): UInt32 {
    const item = getItem(item_id)
    return item.mass
}

function applyLoadTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    for (const item of task.cargo) {
        const good_mass = getItemMass(item.item_id)
        projected.cargoMass = projected.cargoMass.adding(good_mass.multiplying(item.quantity))
    }
}

function applyUnloadTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    for (const item of task.cargo) {
        const good_mass = getItemMass(item.item_id)
        const cargoMass = good_mass.multiplying(item.quantity)
        projected.cargoMass = projected.cargoMass.gt(cargoMass)
            ? projected.cargoMass.subtracting(cargoMass)
            : UInt64.from(0)
    }
}

function applyExtractTask(
    projected: ProjectedEntity,
    task: ServerContract.Types.task,
    options: {complete: boolean}
): void {
    if (!options.complete) return

    if (task.energy_cost) {
        const energyCost = UInt16.from(task.energy_cost)
        projected.energy = projected.energy.gt(energyCost)
            ? UInt16.from(projected.energy.subtracting(energyCost))
            : UInt16.from(0)
    }

    for (const item of task.cargo) {
        const good_mass = getItemMass(item.item_id)
        projected.cargoMass = projected.cargoMass.adding(good_mass.multiplying(item.quantity))
    }
}

export function projectEntity(entity: Projectable): ProjectedEntity {
    const projected = createProjectedEntity(entity)

    if (!entity.schedule) {
        return projected
    }

    for (const task of entity.schedule.tasks) {
        switch (task.type.toNumber()) {
            case TaskType.RECHARGE:
                applyRechargeTask(projected, task, {complete: true})
                break
            case TaskType.TRAVEL:
                applyFlightTask(projected, task, {complete: true})
                break
            case TaskType.LOAD:
                applyLoadTask(projected, task)
                break
            case TaskType.UNLOAD:
                applyUnloadTask(projected, task)
                break
            case TaskType.EXTRACT:
                applyExtractTask(projected, task, {complete: true})
                break
        }
    }

    return projected
}

export function projectEntityAt(entity: Projectable, now: Date): ProjectedEntity {
    const projected = createProjectedEntity(entity)

    if (!entity.schedule || entity.schedule.tasks.length === 0) {
        return projected
    }

    for (let i = 0; i < entity.schedule.tasks.length; i++) {
        const task = entity.schedule.tasks[i]
        const taskComplete = schedule.isTaskComplete(entity, i, now)
        const taskInProgress = schedule.isTaskInProgress(entity, i, now)

        if (!taskComplete && !taskInProgress) {
            break
        }

        const progress = taskInProgress
            ? schedule.getTaskElapsed(entity, i, now) / task.duration.toNumber()
            : undefined

        switch (task.type.toNumber()) {
            case TaskType.RECHARGE:
                applyRechargeTask(projected, task, {complete: taskComplete, progress})
                break
            case TaskType.TRAVEL:
                applyFlightTask(projected, task, {complete: taskComplete, progress})
                break
            case TaskType.LOAD:
                if (taskComplete) {
                    applyLoadTask(projected, task)
                }
                break
            case TaskType.UNLOAD:
                if (taskComplete) {
                    applyUnloadTask(projected, task)
                }
                break
            case TaskType.EXTRACT:
                if (taskComplete) {
                    applyExtractTask(projected, task, {complete: true})
                }
                break
        }
    }

    return projected
}
