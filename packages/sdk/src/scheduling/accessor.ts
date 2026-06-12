import type {ServerContract} from '../contracts'
import type {TaskType} from '../types'
import * as core from './lane-core'
import {
    activeTasks,
    getLane,
    getLanes,
    hasSchedule,
    isIdle,
    LANE_MOBILITY,
    type LaneView,
    type ScheduleData,
} from './schedule'

type Task = ServerContract.Types.task

export class ScheduleAccessor {
    private _laneResolved = false
    private _lane: LaneView | undefined

    constructor(
        private entity: ScheduleData,
        private laneKey: number = LANE_MOBILITY
    ) {}

    private get lane(): LaneView | undefined {
        if (!this._laneResolved) {
            this._lane = getLane(this.entity, this.laneKey)
            this._laneResolved = true
        }
        return this._lane
    }

    forLane(laneKey: number): ScheduleAccessor {
        return new ScheduleAccessor(this.entity, laneKey)
    }

    get lanes(): LaneView[] {
        return getLanes(this.entity)
    }

    get hasSchedule(): boolean {
        return hasSchedule(this.entity)
    }

    get isIdle(): boolean {
        return isIdle(this.entity)
    }

    get tasks(): Task[] {
        return this.lane?.schedule.tasks ?? []
    }

    activeTasks(now: Date): Task[] {
        return activeTasks(this.entity, now)
    }

    duration(): number {
        return this.lane ? core.laneDuration(this.lane.schedule) : 0
    }

    elapsed(now: Date): number {
        return this.lane ? core.laneElapsed(this.lane.schedule, now) : 0
    }

    remaining(now: Date): number {
        return this.lane ? core.laneRemaining(this.lane.schedule, now) : 0
    }

    startsIn(now: Date): number {
        return this.lane ? core.laneStartsIn(this.lane.schedule, now) : 0
    }

    complete(now: Date): boolean {
        return this.lane ? core.laneComplete(this.lane.schedule, now) : false
    }

    currentTaskIndex(now: Date): number {
        return this.lane ? core.currentTaskIndexForLane(this.lane.schedule, now) : -1
    }

    currentTask(now: Date): Task | undefined {
        return this.lane ? core.currentTask(this.lane.schedule, now) : undefined
    }

    currentTaskType(now: Date): TaskType | undefined {
        return this.lane ? core.currentTaskType(this.lane.schedule, now) : undefined
    }

    taskStartTime(index: number): number {
        return this.lane ? core.laneTaskStartTime(this.lane.schedule, index) : 0
    }

    taskElapsed(index: number, now: Date): number {
        return this.lane ? core.laneTaskElapsed(this.lane.schedule, index, now) : 0
    }

    taskRemaining(index: number, now: Date): number {
        return this.lane ? core.laneTaskRemaining(this.lane.schedule, index, now) : 0
    }

    taskComplete(index: number, now: Date): boolean {
        return this.lane ? core.laneTaskComplete(this.lane.schedule, index, now) : false
    }

    taskInProgress(index: number, now: Date): boolean {
        return this.lane ? core.laneTaskInProgress(this.lane.schedule, index, now) : false
    }

    currentTaskProgress(now: Date): number {
        return this.lane ? core.currentTaskProgress(this.lane.schedule, now) : 0
    }

    currentTaskProgressFloat(now: Date): number {
        return this.lane ? core.currentTaskProgressFloatForLane(this.lane.schedule, now) : 0
    }

    progress(now: Date): number {
        return this.lane ? core.laneProgress(this.lane.schedule, now) : 0
    }
}

export function createScheduleAccessor(
    entity: ScheduleData,
    laneKey: number = LANE_MOBILITY
): ScheduleAccessor {
    return new ScheduleAccessor(entity, laneKey)
}
