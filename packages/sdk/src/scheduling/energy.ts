import {TaskType} from '../types'
import {createProjectedEntity, type Projectable} from './projection'
import {currentTaskIndex, currentTaskProgressFloat, isTaskComplete} from './schedule'

export function energyAtTime(entity: Projectable, now: Date): number {
    const projected = createProjectedEntity(entity)
    const capacity = projected.generator ? Number(projected.generator.capacity) : undefined

    const clamp = (value: number): number => {
        const floored = Math.max(0, value)
        return capacity !== undefined ? Math.min(capacity, floored) : floored
    }

    let running = Number(projected.energy)

    const tasks = entity.schedule?.tasks
    if (!tasks || tasks.length === 0) return clamp(running)

    const activeIndex = currentTaskIndex(entity, now)
    const activeProgress = currentTaskProgressFloat(entity, now)

    for (let i = 0; i < tasks.length; i++) {
        const complete = isTaskComplete(entity, i, now)
        if (!complete && i !== activeIndex) break

        const fraction = complete ? 1 : activeProgress

        if (tasks[i].type.toNumber() === TaskType.RECHARGE) {
            if (capacity !== undefined) {
                running = complete ? capacity : running + (capacity - running) * fraction
            }
        } else {
            const cost = Number(tasks[i].energy_cost ?? 0)
            running -= cost * fraction
        }

        running = clamp(running)
    }

    return clamp(running)
}
