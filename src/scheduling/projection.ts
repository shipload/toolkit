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
import {
    ENTITY_CAPACITY_EXCEEDED,
    RECIPE_INPUTS_EXCESS,
    RECIPE_INPUTS_INSUFFICIENT,
    RECIPE_INPUTS_INVALID,
    RECIPE_INPUTS_MIXED,
    RECIPE_NOT_FOUND,
    SHIP_CARGO_NOT_LOADED,
} from '../errors'
import {
    getComponentById,
    getEntityRecipeByItemId,
    getModuleRecipeByItemId,
    RecipeInput,
} from '../data/recipes'
import {getItem} from '../market/items'
import {distanceBetweenCoordinates, lerp} from '../travel/travel'
import {
    calcStacksMass,
    cargoItemToStack,
    CargoStack,
    mergeStacks,
    removeFromStacks,
    stackToCargoItem,
} from '../capabilities/storage'
import * as schedule from './schedule'
import {ScheduleData} from './schedule'

export interface ProjectedEntity {
    location: Coordinates
    energy: UInt16
    cargo: CargoStack[]
    shipMass: UInt32
    capacity?: UInt64
    engines?: ServerContract.Types.movement_stats
    loaders?: ServerContract.Types.loader_stats
    generator?: ServerContract.Types.energy_stats
    hauler?: ServerContract.Types.hauler_stats
    readonly cargoMass: UInt64
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
    hauler?: ServerContract.Types.hauler_stats
    capacity?: UInt32
    cargo: ServerContract.Types.cargo_item[]
    cargomass: UInt32
    owner?: Name
}

function getHullMass(entity: Projectable): UInt32 {
    return UInt32.from(entity.hullmass ?? 0)
}

export function createProjectedEntity(entity: Projectable): ProjectedEntity {
    const shipMass = getHullMass(entity)
    const loaders = entity.loaders
    const engines = entity.engines
    const generator = entity.generator
    const hauler = entity.hauler
    const capacity = entity.capacity

    const cargo: CargoStack[] = entity.cargo.map(cargoItemToStack)

    const projected: ProjectedEntity = {
        location: Coordinates.from(entity.coordinates),
        energy: UInt16.from(entity.energy ?? 0),
        cargo,
        shipMass,
        capacity: capacity ? UInt64.from(capacity) : undefined,
        engines,
        generator,
        hauler,
        loaders,

        get cargoMass() {
            return calcStacksMass(this.cargo)
        },

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
                cargo: this.cargo.map(stackToCargoItem),
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

function addCargoItem(projected: ProjectedEntity, item: ServerContract.Types.cargo_item): void {
    projected.cargo = mergeStacks(projected.cargo, cargoItemToStack(item))
}

function removeCargoItem(projected: ProjectedEntity, item: ServerContract.Types.cargo_item): void {
    projected.cargo = removeFromStacks(projected.cargo, cargoItemToStack(item))
}

function applyAddCargoTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    for (const item of task.cargo) {
        addCargoItem(projected, item)
    }
}

function applyRemoveCargoTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    for (const item of task.cargo) {
        removeCargoItem(projected, item)
    }
}

function applyEnergyCost(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    if (!task.energy_cost) return
    const energyCost = UInt16.from(task.energy_cost)
    projected.energy = projected.energy.gt(energyCost)
        ? UInt16.from(projected.energy.subtracting(energyCost))
        : UInt16.from(0)
}

function applyGatherTask(
    projected: ProjectedEntity,
    task: ServerContract.Types.task,
    options: {complete: boolean}
): void {
    if (!options.complete) return
    applyEnergyCost(projected, task)
    if (!task.entitytarget) {
        applyAddCargoTask(projected, task)
    }
}

function applyCraftTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    applyEnergyCost(projected, task)
    if (task.cargo.length === 0) return

    for (let i = 0; i < task.cargo.length - 1; i++) {
        removeCargoItem(projected, task.cargo[i])
    }
    addCargoItem(projected, task.cargo[task.cargo.length - 1])
}

function applyDeployTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    applyEnergyCost(projected, task)
    if (task.cargo.length > 0) {
        removeCargoItem(projected, task.cargo[0])
    }
}

function applyTask(projected: ProjectedEntity, task: ServerContract.Types.task): void {
    switch (task.type.toNumber()) {
        case TaskType.RECHARGE:
            applyRechargeTask(projected, task, {complete: true})
            break
        case TaskType.TRAVEL:
            applyFlightTask(projected, task, {complete: true})
            break
        case TaskType.LOAD:
        case TaskType.UNWRAP:
            applyAddCargoTask(projected, task)
            break
        case TaskType.UNLOAD:
        case TaskType.WRAP:
            applyRemoveCargoTask(projected, task)
            break
        case TaskType.GATHER:
            applyGatherTask(projected, task, {complete: true})
            break
        case TaskType.CRAFT:
            applyCraftTask(projected, task)
            break
        case TaskType.DEPLOY:
            applyDeployTask(projected, task)
            break
    }
}

export interface ProjectionOptions {
    upToTaskIndex?: number
}

export function projectEntity(entity: Projectable, options?: ProjectionOptions): ProjectedEntity {
    const projected = createProjectedEntity(entity)
    if (!entity.schedule || entity.schedule.tasks.length === 0) return projected

    const tasks = entity.schedule.tasks
    const taskCount =
        options?.upToTaskIndex !== undefined
            ? Math.max(0, Math.min(options.upToTaskIndex, tasks.length))
            : tasks.length

    for (let i = 0; i < taskCount; i++) {
        applyTask(projected, tasks[i])
    }
    return projected
}

function getRecipeForOutput(outputItemId: number): RecipeInput[] | undefined {
    const component = getComponentById(outputItemId)
    if (component) return component.recipe
    const moduleRecipe = getModuleRecipeByItemId(outputItemId)
    if (moduleRecipe) return moduleRecipe.recipe
    const entityRecipe = getEntityRecipeByItemId(outputItemId)
    if (entityRecipe) return entityRecipe.recipe
    return undefined
}

function validateCraftTask(
    task: ServerContract.Types.task,
    projected: ProjectedEntity
): void {
    if (task.cargo.length === 0) return

    const output = task.cargo[task.cargo.length - 1]
    const inputs = task.cargo.slice(0, -1)
    const craftQuantity = output.quantity.toNumber()

    const recipe = getRecipeForOutput(output.item_id.toNumber())
    if (!recipe) throw new Error(RECIPE_NOT_FOUND)

    const groupedInputs: ServerContract.Types.cargo_item[][] = recipe.map(() => [])
    for (const input of inputs) {
        let matched = false
        for (let ri = 0; ri < recipe.length; ri++) {
            const req = recipe[ri]
            if (req.itemId && req.itemId > 0) {
                if (input.item_id.toNumber() === req.itemId) {
                    groupedInputs[ri].push(input)
                    matched = true
                    break
                }
            } else if (req.category) {
                const item = getItem(input.item_id)
                if (item.category === req.category) {
                    groupedInputs[ri].push(input)
                    matched = true
                    break
                }
            }
        }
        if (!matched) throw new Error(RECIPE_INPUTS_INVALID)
    }

    for (let ri = 0; ri < recipe.length; ri++) {
        const stacks = groupedInputs[ri]
        let provided = 0
        for (const stack of stacks) {
            provided += stack.quantity.toNumber()
        }
        const required = recipe[ri].quantity * craftQuantity
        if (provided < required) throw new Error(RECIPE_INPUTS_INSUFFICIENT)
        if (provided !== required) throw new Error(RECIPE_INPUTS_EXCESS)

        if (!recipe[ri].itemId && stacks.length > 1) {
            const firstItemId = stacks[0].item_id.toNumber()
            for (let si = 1; si < stacks.length; si++) {
                if (stacks[si].item_id.toNumber() !== firstItemId) {
                    throw new Error(RECIPE_INPUTS_MIXED)
                }
            }
        }
    }

    for (const input of inputs) {
        let found = false
        for (const pc of projected.cargo) {
            if (
                pc.item_id.toNumber() === input.item_id.toNumber() &&
                pc.stats.toString() === input.stats.toString()
            ) {
                if (pc.quantity.toNumber() < input.quantity.toNumber()) {
                    throw new Error(RECIPE_INPUTS_INSUFFICIENT)
                }
                found = true
                break
            }
        }
        if (!found) throw new Error(SHIP_CARGO_NOT_LOADED)
    }
}

export function validateSchedule(entity: Projectable): void {
    if (!entity.schedule || entity.schedule.tasks.length === 0) return

    const projected = createProjectedEntity(entity)
    for (const task of entity.schedule.tasks) {
        if (task.type.toNumber() === TaskType.CRAFT) {
            validateCraftTask(task, projected)
        }
        applyTask(projected, task)
        if (projected.capacity && projected.cargoMass.gt(projected.capacity)) {
            throw new Error(ENTITY_CAPACITY_EXCEEDED)
        }
    }
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
            case TaskType.UNWRAP:
                if (taskComplete) applyAddCargoTask(projected, task)
                break
            case TaskType.UNLOAD:
            case TaskType.WRAP:
                if (taskComplete) applyRemoveCargoTask(projected, task)
                break
            case TaskType.GATHER:
                if (taskComplete) applyGatherTask(projected, task, {complete: true})
                break
            case TaskType.CRAFT:
                if (taskComplete) applyCraftTask(projected, task)
                break
            case TaskType.DEPLOY:
                if (taskComplete) applyDeployTask(projected, task)
                break
        }
    }

    return projected
}
