import type {ServerContract} from '../contracts'
import type {TaskType} from '../types'

type Schedule = ServerContract.Types.schedule
type Task = ServerContract.Types.task

export function laneDuration(schedule: Schedule): number {
    return schedule.tasks.reduce((sum, task) => sum + task.duration.toNumber(), 0)
}

export function laneRawElapsed(schedule: Schedule, now: Date): number {
    const started = schedule.started.toDate()
    return Math.floor((now.getTime() - started.getTime()) / 1000)
}

export function laneElapsed(schedule: Schedule, now: Date): number {
    return Math.max(0, laneRawElapsed(schedule, now))
}

export function laneStartsIn(schedule: Schedule, now: Date): number {
    return Math.max(0, -laneRawElapsed(schedule, now))
}

export function laneRemaining(schedule: Schedule, now: Date): number {
    return Math.max(0, laneDuration(schedule) - laneRawElapsed(schedule, now))
}

export function laneComplete(schedule: Schedule, now: Date): boolean {
    if (schedule.tasks.length === 0) return false
    return laneRemaining(schedule, now) === 0
}

export function laneProgress(schedule: Schedule, now: Date): number {
    const duration = laneDuration(schedule)
    if (duration === 0) return schedule.tasks.length > 0 ? 1 : 0
    return Math.min(1, laneElapsed(schedule, now) / duration)
}

export function currentTaskIndexForLane(schedule: Schedule, now: Date): number {
    if (schedule.tasks.length === 0) return -1
    if (laneRawElapsed(schedule, now) < 0) return -1
    const elapsed = laneElapsed(schedule, now)
    let timeAccum = 0
    for (let i = 0; i < schedule.tasks.length; i++) {
        const taskDuration = schedule.tasks[i].duration.toNumber()
        if (elapsed < timeAccum + taskDuration) return i
        timeAccum += taskDuration
    }
    return -1
}

export function currentTask(schedule: Schedule, now: Date): Task | undefined {
    const index = currentTaskIndexForLane(schedule, now)
    if (index < 0) return undefined
    return schedule.tasks[index]
}

export function currentTaskType(schedule: Schedule, now: Date): TaskType | undefined {
    const task = currentTask(schedule, now)
    return task ? (task.type.toNumber() as TaskType) : undefined
}

export function laneTaskStartTime(schedule: Schedule, index: number): number {
    if (index < 0 || index >= schedule.tasks.length) return 0
    let timeAccum = 0
    for (let i = 0; i < index; i++) {
        timeAccum += schedule.tasks[i].duration.toNumber()
    }
    return timeAccum
}

export function laneTaskElapsed(schedule: Schedule, index: number, now: Date): number {
    if (index < 0 || index >= schedule.tasks.length) return 0
    const elapsed = laneElapsed(schedule, now)
    const taskStart = laneTaskStartTime(schedule, index)
    const taskDuration = schedule.tasks[index].duration.toNumber()
    if (elapsed <= taskStart) return 0
    return Math.min(elapsed - taskStart, taskDuration)
}

export function laneTaskRemaining(schedule: Schedule, index: number, now: Date): number {
    if (index < 0 || index >= schedule.tasks.length) return 0
    const taskDuration = schedule.tasks[index].duration.toNumber()
    return Math.max(0, taskDuration - laneTaskElapsed(schedule, index, now))
}

export function laneTaskComplete(schedule: Schedule, index: number, now: Date): boolean {
    if (index < 0 || index >= schedule.tasks.length) return false
    const taskDuration = schedule.tasks[index].duration.toNumber()
    return laneTaskElapsed(schedule, index, now) >= taskDuration
}

export function laneTaskInProgress(schedule: Schedule, index: number, now: Date): boolean {
    if (index < 0 || index >= schedule.tasks.length) return false
    const taskElapsed = laneTaskElapsed(schedule, index, now)
    const taskDuration = schedule.tasks[index].duration.toNumber()
    return taskElapsed > 0 && taskElapsed < taskDuration
}

export function laneCompletesAt(schedule: Schedule, index: number): Date {
    const startedMs = schedule.started.toDate().getTime()
    const endSec =
        laneTaskStartTime(schedule, index) + (schedule.tasks[index]?.duration.toNumber() ?? 0)
    return new Date(startedMs + endSec * 1000)
}

export function currentTaskProgress(schedule: Schedule, now: Date): number {
    const index = currentTaskIndexForLane(schedule, now)
    if (index < 0) return 0
    const elapsed = laneTaskElapsed(schedule, index, now)
    const duration = schedule.tasks[index].duration.toNumber()
    if (duration === 0) return 1
    return Math.min(1, elapsed / duration)
}

export function currentTaskProgressFloatForLane(schedule: Schedule, now: Date): number {
    if (schedule.tasks.length === 0) return 0
    const index = currentTaskIndexForLane(schedule, now)
    if (index < 0) return 0
    const task = schedule.tasks[index]
    const durationMs = task.duration.toNumber() * 1000
    if (durationMs === 0) return 1
    const startedMs = schedule.started.toDate().getTime()
    const taskStartMs = startedMs + laneTaskStartTime(schedule, index) * 1000
    const elapsedMs = now.getTime() - taskStartMs
    if (elapsedMs <= 0) return 0
    return Math.min(1, elapsedMs / durationMs)
}
