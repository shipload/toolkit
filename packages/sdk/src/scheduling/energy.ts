import type {ServerContract} from '../contracts'
import {TaskType} from '../types'
import {createProjectedEntity, type Projectable} from './projection'
import {orderedTasks, unappliedTasks} from './schedule'
import {taskEnergyDrawNeedsCoordinates, taskEnergyEffect} from './task-effects'

type Task = ServerContract.Types.task

export function energyAtTime(entity: Projectable, now: Date): number {
    const projected = createProjectedEntity(entity)
    const capacity = projected.generator ? Number(projected.generator.capacity) : undefined

    const clamp = (value: number): number => {
        const floored = Math.max(0, value)
        return capacity !== undefined ? Math.min(capacity, floored) : floored
    }

    let running = Number(projected.energy)

    const ordered = orderedTasks(entity)
    if (ordered.length === 0) return clamp(running)

    const nowMs = now.getTime()

    for (const {task, startsAt} of ordered) {
        const duration = task.duration.toNumber()
        const elapsed = Math.min(
            Math.max(0, Math.floor((nowMs - startsAt.getTime()) / 1000)),
            duration
        )
        const complete = elapsed >= duration
        const inProgress = !complete && elapsed > 0 && elapsed < duration

        if (!complete && !inProgress) continue

        const fraction = complete ? 1 : duration === 0 ? 1 : elapsed / duration

        if (task.type.toNumber() === TaskType.RECHARGE) {
            if (capacity !== undefined) {
                running = complete ? capacity : running + (capacity - running) * fraction
            }
        } else {
            const cost = Number(task.energy_cost ?? 0)
            running -= cost * fraction
        }

        running = clamp(running)
    }

    return clamp(running)
}

// Mirrors calc_task_effect's energy branch (projection.cpp): the step this task's type applies to running energy.
function applyTaskEnergyEffect(
    taskType: number,
    hasCoordinates: boolean,
    capacity: number | undefined,
    cost: number | undefined,
    energy: number
): number {
    const effect = taskEnergyEffect(taskType)
    if (effect === 'fills') return capacity !== undefined ? capacity : energy
    if (effect === 'zeroes') return cost === undefined ? 0 : energy > cost ? energy - cost : 0
    if (cost === undefined) return energy
    if (effect === 'draws' && (!taskEnergyDrawNeedsCoordinates(taskType) || hasCoordinates)) {
        return energy > cost ? energy - cost : 0
    }
    return energy
}

function taskCost(task: Task): number | undefined {
    return task.energy_cost !== undefined ? Number(task.energy_cost) : undefined
}

// Walks tasks in schedule order, gating on funding at each draw; false on the first shortfall.
function tasksFundedFrom(
    tasks: readonly {task: Task}[],
    capacity: number | undefined,
    baseEnergy: number
): boolean {
    let energy = baseEnergy
    for (const {task} of tasks) {
        const cost = taskCost(task)
        if (cost !== undefined && energy < cost) return false
        energy = applyTaskEnergyEffect(
            task.type.toNumber(),
            task.coordinates !== undefined,
            capacity,
            cost,
            energy
        )
    }
    return true
}

// Mirrors walk_pending_energy(require_funded=true) / energy_draws_funded in projection.cpp.
export function energyDrawsFunded(entity: Projectable, baseEnergy: number): boolean {
    const projected = createProjectedEntity(entity)
    const capacity = projected.generator ? Number(projected.generator.capacity) : undefined
    return tasksFundedFrom(unappliedTasks(entity), capacity, baseEnergy)
}
