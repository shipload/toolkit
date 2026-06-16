import {TaskType} from '../types'
import {createProjectedEntity, type Projectable} from './projection'
import {orderedTasks} from './schedule'

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
