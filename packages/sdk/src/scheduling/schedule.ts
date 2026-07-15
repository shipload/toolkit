import type {ServerContract} from '../contracts'
import {TaskType} from '../types'
import * as core from './lane-core'

type Schedule = ServerContract.Types.schedule
type Task = ServerContract.Types.task
type Lane = ServerContract.Types.lane
type Hold = ServerContract.Types.hold

export const LANE_MOBILITY = 0
export const LANE_BARRIER = 255

export interface ScheduleData {
    lanes?: Lane[]
    holds?: Hold[]
}

export interface LaneView {
    laneKey: number
    schedule: Schedule
}

export {
    laneStartsIn,
    currentTaskIndexForLane,
    laneTaskComplete,
    laneTaskInProgress,
    laneCompletesAt,
    currentTaskProgressFloatForLane,
} from './lane-core'

export function getLanes(entity: ScheduleData): LaneView[] {
    const lanes = entity.lanes
    if (!lanes || lanes.length === 0) return []
    return lanes.map((l) => ({laneKey: l.lane_key.toNumber(), schedule: l.schedule}))
}

export function getLane(entity: ScheduleData, laneKey: number): LaneView | undefined {
    const lanes = entity.lanes
    if (!lanes) return undefined
    for (const l of lanes) {
        if (l.lane_key.toNumber() === laneKey) return {laneKey, schedule: l.schedule}
    }
    return undefined
}

export function mobilityLane(entity: ScheduleData): LaneView | undefined {
    return getLane(entity, LANE_MOBILITY)
}

export function hasSchedule(entity: ScheduleData): boolean {
    const lanes = entity.lanes
    if (!lanes) return false
    return lanes.some((l) => l.schedule.tasks.length > 0)
}

export function hasHolds(entity: ScheduleData): boolean {
    const holds = entity.holds
    return !!holds && holds.length > 0
}

export function isIdle(entity: ScheduleData): boolean {
    return !hasSchedule(entity) && !hasHolds(entity)
}

// Mirrors is_capper_task_type: demolish/undeploy cap a plan — no further appends once queued.
export function isCapperTaskType(taskType: number): boolean {
    return taskType === TaskType.UNDEPLOY || taskType === TaskType.DEMOLISH
}

export function hasPendingCapper(entity: ScheduleData): boolean {
    for (const l of entity.lanes ?? []) {
        for (const t of l.schedule.tasks) {
            if (isCapperTaskType(t.type.toNumber())) return true
        }
    }
    return false
}

export function isEntityIdle(entity: ScheduleData, now: Date): boolean {
    if (hasHolds(entity)) return false
    const lanes = entity.lanes
    if (!lanes) return true
    return lanes.every((l) => core.currentTaskIndexForLane(l.schedule, now) < 0)
}

export function entityIdleAt(entity: ScheduleData, _now: Date): Date | undefined {
    const lanes = entity.lanes
    if (!lanes) return undefined
    let maxMs: number | undefined
    for (const l of lanes) {
        if (l.schedule.tasks.length === 0) continue
        const endMs = l.schedule.started.toDate().getTime() + core.laneDuration(l.schedule) * 1000
        if (maxMs === undefined || endMs > maxMs) maxMs = endMs
    }
    return maxMs === undefined ? undefined : new Date(maxMs)
}

export function getTasks(entity: ScheduleData): Task[] {
    const lanes = entity.lanes
    if (!lanes) return []
    return lanes.flatMap((l) => l.schedule.tasks)
}

export function scheduleDuration(entity: ScheduleData): number {
    let max = 0
    for (const l of entity.lanes ?? []) max = Math.max(max, core.laneDuration(l.schedule))
    return max
}

export function scheduleElapsed(entity: ScheduleData, now: Date): number {
    let max = 0
    for (const l of entity.lanes ?? []) max = Math.max(max, core.laneElapsed(l.schedule, now))
    return max
}

export function scheduleRemaining(entity: ScheduleData, now: Date): number {
    let remaining = 0
    for (const l of entity.lanes ?? []) {
        remaining = Math.max(remaining, core.laneRemaining(l.schedule, now))
    }
    return remaining
}

export function scheduleComplete(entity: ScheduleData, now: Date): boolean {
    const lanes = entity.lanes
    if (!lanes) return false
    let hasAnyTask = false
    let remaining = 0
    for (const l of lanes) {
        if (l.schedule.tasks.length > 0) hasAnyTask = true
        remaining = Math.max(remaining, core.laneRemaining(l.schedule, now))
    }
    if (!hasAnyTask) return false
    return remaining === 0
}

// Mirrors lane_front_complete && !capper_front_gated for own-entity holds (workshop/undeploy-target gates need cross-entity context this ScheduleData lacks).
export function hasResolvable(entity: ScheduleData, now: Date): boolean {
    for (const l of entity.lanes ?? []) {
        if (!core.laneTaskComplete(l.schedule, 0, now)) continue
        const front = l.schedule.tasks[0]
        if (isCapperTaskType(front.type.toNumber()) && hasHolds(entity)) continue
        return true
    }
    return false
}

export function currentTaskForLane(
    entity: ScheduleData,
    laneKey: number,
    now: Date
): Task | undefined {
    const lane = getLane(entity, laneKey)
    return lane ? core.currentTask(lane.schedule, now) : undefined
}

export function currentTaskTypeForLane(
    entity: ScheduleData,
    laneKey: number,
    now: Date
): TaskType | undefined {
    const lane = getLane(entity, laneKey)
    return lane ? core.currentTaskType(lane.schedule, now) : undefined
}

export function activeTasks(entity: ScheduleData, now: Date): Task[] {
    const out: Task[] = []
    for (const l of entity.lanes ?? []) {
        const idx = core.currentTaskIndexForLane(l.schedule, now)
        if (idx >= 0) out.push(l.schedule.tasks[idx])
    }
    return out
}

export interface ResolvedEvent {
    laneKey: number
    taskIndex: number
    task: Task
    completesAt: Date
}

// Canonical lane-front order (mirrors contract front_precedes): completion, then RECHARGE-last, then lane key.
function frontPrecedes(
    a: {completesAt: Date; task: Task; laneKey: number},
    b: {completesAt: Date; task: Task; laneKey: number}
): number {
    if (a.completesAt.getTime() !== b.completesAt.getTime()) {
        return a.completesAt.getTime() - b.completesAt.getTime()
    }
    const aRecharge = a.task.type.toNumber() === TaskType.RECHARGE
    const bRecharge = b.task.type.toNumber() === TaskType.RECHARGE
    if (aRecharge !== bRecharge) return aRecharge ? 1 : -1
    return a.laneKey - b.laneKey
}

// Completed lane-fronts in canonical order (mirrors contract front_precedes).
export function resolveOrder(entity: ScheduleData, now: Date): ResolvedEvent[] {
    const events: ResolvedEvent[] = []
    for (const l of entity.lanes ?? []) {
        const laneKey = l.lane_key.toNumber()
        const startedMs = l.schedule.started.toDate().getTime()
        let endSec = 0
        for (let i = 0; i < l.schedule.tasks.length; i++) {
            const task = l.schedule.tasks[i]
            endSec += task.duration.toNumber()
            const completesAt = new Date(startedMs + endSec * 1000)
            if (completesAt.getTime() > now.getTime()) break
            events.push({laneKey, taskIndex: i, task, completesAt})
        }
    }
    events.sort(frontPrecedes)
    return events
}

export interface OrderedTask {
    laneKey: number
    taskIndex: number
    task: Task
    startsAt: Date
    completesAt: Date
}

// Every task across all lanes in canonical order (mirrors contract front_precedes).
export function orderedTasks(entity: ScheduleData): OrderedTask[] {
    const out: OrderedTask[] = []
    for (const l of entity.lanes ?? []) {
        const laneKey = l.lane_key.toNumber()
        const startedMs = l.schedule.started.toDate().getTime()
        let endSec = 0
        for (let i = 0; i < l.schedule.tasks.length; i++) {
            const task = l.schedule.tasks[i]
            const startsAt = new Date(startedMs + endSec * 1000)
            endSec += task.duration.toNumber()
            const completesAt = new Date(startedMs + endSec * 1000)
            out.push({laneKey, taskIndex: i, task, startsAt, completesAt})
        }
    }
    out.sort(frontPrecedes)
    return out
}

export function laneRemainingOf(entity: ScheduleData, laneKey: number, now: Date): number {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneRemaining(lane.schedule, now) : 0
}

export function laneStartsInOf(entity: ScheduleData, laneKey: number, now: Date): number {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneStartsIn(lane.schedule, now) : 0
}

export function laneCompleteOf(entity: ScheduleData, laneKey: number, now: Date): boolean {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneComplete(lane.schedule, now) : false
}

export function laneProgressOf(entity: ScheduleData, laneKey: number, now: Date): number {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneProgress(lane.schedule, now) : 0
}

export function laneTaskElapsedOf(
    entity: ScheduleData,
    laneKey: number,
    index: number,
    now: Date
): number {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneTaskElapsed(lane.schedule, index, now) : 0
}

export function laneTaskRemainingOf(
    entity: ScheduleData,
    laneKey: number,
    index: number,
    now: Date
): number {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneTaskRemaining(lane.schedule, index, now) : 0
}

export function laneTaskCompleteOf(
    entity: ScheduleData,
    laneKey: number,
    index: number,
    now: Date
): boolean {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneTaskComplete(lane.schedule, index, now) : false
}

export function laneTaskInProgressOf(
    entity: ScheduleData,
    laneKey: number,
    index: number,
    now: Date
): boolean {
    const lane = getLane(entity, laneKey)
    return lane ? core.laneTaskInProgress(lane.schedule, index, now) : false
}

export function currentTaskIndexOf(entity: ScheduleData, laneKey: number, now: Date): number {
    const lane = getLane(entity, laneKey)
    return lane ? core.currentTaskIndexForLane(lane.schedule, now) : -1
}

function entityDoesTaskType(entity: ScheduleData, taskType: TaskType, now: Date): boolean {
    return activeTasks(entity, now).some((t) => t.type.toNumber() === taskType)
}

export function isInFlight(entity: ScheduleData, now: Date): boolean {
    const lane = mobilityLane(entity)
    if (!lane) return false
    const t = core.currentTaskType(lane.schedule, now)
    return t === TaskType.TRAVEL || t === TaskType.TRANSIT
}

export function isRecharging(entity: ScheduleData, now: Date): boolean {
    return entityDoesTaskType(entity, TaskType.RECHARGE, now)
}

export function isLoading(entity: ScheduleData, now: Date): boolean {
    return entityDoesTaskType(entity, TaskType.LOAD, now)
}

export function isUnloading(entity: ScheduleData, now: Date): boolean {
    return entityDoesTaskType(entity, TaskType.UNLOAD, now)
}

export function isGathering(entity: ScheduleData, now: Date): boolean {
    return entityDoesTaskType(entity, TaskType.GATHER, now)
}
