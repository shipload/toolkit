import {ServerContract} from '../contracts'
import {TaskType} from '../types'

type Schedule = ServerContract.Types.schedule
type Task = ServerContract.Types.task

export interface ScheduleData {
    schedule?: Schedule
}

export interface Scheduleable extends ScheduleData {
    hasSchedule: boolean
    isIdle: boolean
    tasks: Task[]
    scheduleDuration(): number
    scheduleElapsed(now: Date): number
    scheduleRemaining(now: Date): number
    scheduleComplete(now: Date): boolean
    currentTaskIndex(now: Date): number
    currentTask(now: Date): Task | undefined
    currentTaskType(now: Date): TaskType | undefined
    getTaskStartTime(index: number): number
    getTaskElapsed(index: number, now: Date): number
    getTaskRemaining(index: number, now: Date): number
    isTaskComplete(index: number, now: Date): boolean
    isTaskInProgress(index: number, now: Date): boolean
    currentTaskProgress(now: Date): number
    scheduleProgress(now: Date): number
}

export function hasSchedule(entity: ScheduleData): boolean {
    return !!entity.schedule && entity.schedule.tasks.length > 0
}

export function isIdle(entity: ScheduleData): boolean {
    return !hasSchedule(entity)
}

export function getTasks(entity: ScheduleData): Task[] {
    return entity.schedule?.tasks || []
}

export function scheduleDuration(entity: ScheduleData): number {
    if (!entity.schedule) return 0
    return entity.schedule.tasks.reduce((sum, task) => sum + task.duration.toNumber(), 0)
}

export function scheduleElapsed(entity: ScheduleData, now: Date): number {
    if (!entity.schedule) return 0
    const started = entity.schedule.started.toDate()
    const elapsed = Math.floor((now.getTime() - started.getTime()) / 1000)
    return Math.max(0, elapsed)
}

export function scheduleRemaining(entity: ScheduleData, now: Date): number {
    if (!entity.schedule) return 0
    const duration = scheduleDuration(entity)
    const elapsed = scheduleElapsed(entity, now)
    return Math.max(0, duration - elapsed)
}

export function scheduleComplete(entity: ScheduleData, now: Date): boolean {
    return hasSchedule(entity) && scheduleRemaining(entity, now) === 0
}

export function currentTaskIndex(entity: ScheduleData, now: Date): number {
    if (!entity.schedule || entity.schedule.tasks.length === 0) return -1

    const elapsed = scheduleElapsed(entity, now)
    let timeAccum = 0

    for (let i = 0; i < entity.schedule.tasks.length; i++) {
        const taskDuration = entity.schedule.tasks[i].duration.toNumber()
        if (elapsed < timeAccum + taskDuration) {
            return i
        }
        timeAccum += taskDuration
    }

    return entity.schedule.tasks.length - 1
}

export function currentTask(entity: ScheduleData, now: Date): Task | undefined {
    const index = currentTaskIndex(entity, now)
    if (index < 0 || !entity.schedule) return undefined
    return entity.schedule.tasks[index]
}

export function currentTaskType(entity: ScheduleData, now: Date): TaskType | undefined {
    const task = currentTask(entity, now)
    if (!task) return undefined
    return task.type.toNumber() as TaskType
}

export function getTaskStartTime(entity: ScheduleData, index: number): number {
    if (!entity.schedule || index < 0 || index >= entity.schedule.tasks.length) return 0
    let timeAccum = 0
    for (let i = 0; i < index; i++) {
        timeAccum += entity.schedule.tasks[i].duration.toNumber()
    }
    return timeAccum
}

export function getTaskElapsed(entity: ScheduleData, index: number, now: Date): number {
    if (!entity.schedule || index < 0 || index >= entity.schedule.tasks.length) return 0

    const elapsed = scheduleElapsed(entity, now)
    const taskStart = getTaskStartTime(entity, index)
    const taskDuration = entity.schedule.tasks[index].duration.toNumber()

    if (elapsed <= taskStart) return 0
    const elapsedInTask = elapsed - taskStart
    return Math.min(elapsedInTask, taskDuration)
}

export function getTaskRemaining(entity: ScheduleData, index: number, now: Date): number {
    if (!entity.schedule || index < 0 || index >= entity.schedule.tasks.length) return 0

    const taskDuration = entity.schedule.tasks[index].duration.toNumber()
    const taskElapsed = getTaskElapsed(entity, index, now)
    return Math.max(0, taskDuration - taskElapsed)
}

export function isTaskComplete(entity: ScheduleData, index: number, now: Date): boolean {
    if (!entity.schedule || index < 0 || index >= entity.schedule.tasks.length) return false

    const taskDuration = entity.schedule.tasks[index].duration.toNumber()
    const taskElapsed = getTaskElapsed(entity, index, now)
    return taskElapsed >= taskDuration
}

export function isTaskInProgress(entity: ScheduleData, index: number, now: Date): boolean {
    if (!entity.schedule || index < 0 || index >= entity.schedule.tasks.length) return false

    const taskElapsed = getTaskElapsed(entity, index, now)
    const taskDuration = entity.schedule.tasks[index].duration.toNumber()
    return taskElapsed > 0 && taskElapsed < taskDuration
}

export function currentTaskProgress(entity: ScheduleData, now: Date): number {
    const task = currentTask(entity, now)
    if (!task) return 0
    const index = currentTaskIndex(entity, now)
    const elapsed = getTaskElapsed(entity, index, now)
    const duration = task.duration.toNumber()
    if (duration === 0) return 1
    return Math.min(1, elapsed / duration)
}

export function scheduleProgress(entity: ScheduleData, now: Date): number {
    const duration = scheduleDuration(entity)
    if (duration === 0) return hasSchedule(entity) ? 1 : 0
    const elapsed = scheduleElapsed(entity, now)
    return Math.min(1, elapsed / duration)
}

export function isTaskType(entity: ScheduleData, taskType: TaskType, now: Date): boolean {
    return currentTaskType(entity, now) === taskType
}

export function isInFlight(entity: ScheduleData, now: Date): boolean {
    return isTaskType(entity, TaskType.TRAVEL, now)
}

export function isRecharging(entity: ScheduleData, now: Date): boolean {
    return isTaskType(entity, TaskType.RECHARGE, now)
}

export function isLoading(entity: ScheduleData, now: Date): boolean {
    return isTaskType(entity, TaskType.LOAD, now)
}

export function isUnloading(entity: ScheduleData, now: Date): boolean {
    return isTaskType(entity, TaskType.UNLOAD, now)
}

export function isGathering(entity: ScheduleData, now: Date): boolean {
    return isTaskType(entity, TaskType.GATHER, now)
}
