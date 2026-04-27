import type {ServerContract} from '../contracts'
import type {TaskType} from '../types'
import type {ScheduleData} from './schedule'
import * as schedule from './schedule'

type Task = ServerContract.Types.task

export class ScheduleAccessor {
    constructor(private entity: ScheduleData) {}

    get hasSchedule(): boolean {
        return schedule.hasSchedule(this.entity)
    }

    get isIdle(): boolean {
        return schedule.isIdle(this.entity)
    }

    get tasks(): Task[] {
        return schedule.getTasks(this.entity)
    }

    duration(): number {
        return schedule.scheduleDuration(this.entity)
    }

    elapsed(now: Date): number {
        return schedule.scheduleElapsed(this.entity, now)
    }

    remaining(now: Date): number {
        return schedule.scheduleRemaining(this.entity, now)
    }

    complete(now: Date): boolean {
        return schedule.scheduleComplete(this.entity, now)
    }

    currentTaskIndex(now: Date): number {
        return schedule.currentTaskIndex(this.entity, now)
    }

    currentTask(now: Date): Task | undefined {
        return schedule.currentTask(this.entity, now)
    }

    currentTaskType(now: Date): TaskType | undefined {
        return schedule.currentTaskType(this.entity, now)
    }

    taskStartTime(index: number): number {
        return schedule.getTaskStartTime(this.entity, index)
    }

    taskElapsed(index: number, now: Date): number {
        return schedule.getTaskElapsed(this.entity, index, now)
    }

    taskRemaining(index: number, now: Date): number {
        return schedule.getTaskRemaining(this.entity, index, now)
    }

    taskComplete(index: number, now: Date): boolean {
        return schedule.isTaskComplete(this.entity, index, now)
    }

    taskInProgress(index: number, now: Date): boolean {
        return schedule.isTaskInProgress(this.entity, index, now)
    }

    currentTaskProgress(now: Date): number {
        return schedule.currentTaskProgress(this.entity, now)
    }

    progress(now: Date): number {
        return schedule.scheduleProgress(this.entity, now)
    }
}

export function createScheduleAccessor(entity: ScheduleData): ScheduleAccessor {
    return new ScheduleAccessor(entity)
}
