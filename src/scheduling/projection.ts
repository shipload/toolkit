import {UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Coordinates, PRECISION, TaskType} from '../types'
import {distanceBetweenCoordinates, lerp} from '../travel/travel'
import {getGood} from '../market/goods'
import * as schedule from './schedule'
import {ScheduleData} from './schedule'

/**
 * Projected state of an entity after scheduled tasks complete.
 * Mirrors contract's projected_entity struct.
 */
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
}

/**
 * Interface for entities that can be projected.
 * Ships and Warehouses both implement this.
 */
export interface Projectable extends ScheduleData {
    location: Coordinates
    energy: UInt16
    mass: UInt32
    generator?: ServerContract.Types.energy_stats
    engines?: ServerContract.Types.movement_stats
    loaders?: ServerContract.Types.loader_stats
    capacity?: UInt64
    calcCargoMass(): UInt64
}

/**
 * Create initial projected entity state from a projectable entity.
 */
export function createProjectedEntity(entity: Projectable): ProjectedEntity {
    const cargoMass = entity.calcCargoMass()
    const shipMass = UInt32.from(entity.mass)
    const loaders = entity.loaders

    return {
        location: Coordinates.from(entity.location),
        energy: UInt16.from(entity.energy),
        cargoMass,
        shipMass,
        capacity: entity.capacity,
        engines: entity.engines,
        generator: entity.generator,
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

/**
 * Apply a recharge task to projected state.
 */
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

/**
 * Apply a flight task to projected state.
 */
function applyFlightTask(
    projected: ProjectedEntity,
    task: ServerContract.Types.task,
    options: {complete: boolean; progress?: number}
): void {
    if (!task.location || !projected.engines) return

    const origin = projected.location
    const destination = Coordinates.from(task.location)
    const distance = distanceBetweenCoordinates(origin, task.location)
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

/**
 * Apply a load task to projected state.
 */
function applyLoadTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    for (const item of task.cargo) {
        const good = getGood(item.good_id)
        projected.cargoMass = projected.cargoMass.adding(good.mass.multiplying(item.quantity))
    }
}

/**
 * Apply an unload task to projected state.
 */
function applyUnloadTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    for (const item of task.cargo) {
        const good = getGood(item.good_id)
        const cargoMass = good.mass.multiplying(item.quantity)
        projected.cargoMass = projected.cargoMass.gt(cargoMass)
            ? projected.cargoMass.subtracting(cargoMass)
            : UInt64.from(0)
    }
}

/**
 * Project entity state after all scheduled tasks complete.
 * Mirrors contract's project_ship/project_warehouse methods.
 */
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
            case TaskType.FLIGHT:
                applyFlightTask(projected, task, {complete: true})
                break
            case TaskType.LOAD:
                applyLoadTask(projected, task)
                break
            case TaskType.UNLOAD:
                applyUnloadTask(projected, task)
                break
        }
    }

    return projected
}

/**
 * Project entity state at a specific time (partial task execution).
 */
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
            case TaskType.FLIGHT:
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
        }
    }

    return projected
}
