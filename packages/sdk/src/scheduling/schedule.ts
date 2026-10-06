import type {TimePoint, UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {ENTITY_CONSTRUCTION_DOCK} from '../data/kind-registry'
import {HoldKind, TaskType} from '../types'
import * as core from './lane-core'

type Schedule = ServerContract.Types.schedule
type Task = ServerContract.Types.task
type Lane = ServerContract.Types.lane
type Hold = ServerContract.Types.hold

export const LANE_MOBILITY = 0
export const LANE_BARRIER = 255

export interface ScheduleData {
    id?: {toString(): string}
    lanes?: Lane[]
    holds?: Hold[]
}

export type ResolveCounterpartLookup = (entityId: UInt64) => ScheduleData | undefined

export interface AnchoredScheduleData extends ScheduleData {
    projected_at?: TimePoint
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

// Mirrors lane_front_complete's self-subject undeploy refusal.
function isSelfUndeployMirror(task: Task, selfId: {toString(): string}): boolean {
    return (
        task.type.toNumber() === TaskType.UNDEPLOY &&
        task.subject !== undefined &&
        task.subject.entity_id.toString() === selfId.toString()
    )
}

// Mirrors target_has_only_mirror_front.
function targetHasOnlyMirrorFront(target: ScheduleData, targetId: {toString(): string}): boolean {
    for (const l of target.lanes ?? []) {
        const realTasks = l.schedule.tasks.filter((t) => t.type.toNumber() !== TaskType.IDLE)
        if (realTasks.length === 0) continue
        if (!isSelfUndeployMirror(realTasks[0], targetId) || realTasks.length > 1) return false
    }
    return true
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

// Mirrors lane_front_complete && !capper_front_gated; the host-side target gate needs lookupCounterpart.
export function hasResolvable(
    entity: ScheduleData,
    now: Date,
    lookupCounterpart?: ResolveCounterpartLookup
): boolean {
    for (const l of entity.lanes ?? []) {
        const front = l.schedule.tasks[0]
        if (!front) continue
        if (entity.id !== undefined && isSelfUndeployMirror(front, entity.id)) continue
        if (!core.laneTaskComplete(l.schedule, 0, now)) continue
        if (isCapperTaskType(front.type.toNumber())) {
            if (hasHolds(entity)) continue
            if (
                front.type.toNumber() === TaskType.UNDEPLOY &&
                front.subject !== undefined &&
                lookupCounterpart &&
                (entity.id === undefined ||
                    front.subject.entity_id.toString() !== entity.id.toString())
            ) {
                const target = lookupCounterpart(front.subject.entity_id)
                if (target) {
                    if (hasHolds(target)) continue
                    if (!targetHasOnlyMirrorFront(target, front.subject.entity_id)) continue
                }
            }
        }
        return true
    }
    return hasFinishedCivicUpgrade(entity, now)
}

function hasFinishedCivicUpgrade(entity: ScheduleData, now: Date): boolean {
    return (entity.holds ?? []).some(
        (h) =>
            h.kind.equals(HoldKind.UPGRADE) &&
            h.counterpart.entity_type.equals(ENTITY_CONSTRUCTION_DOCK) &&
            h.until.toMilliseconds() <= now.getTime()
    )
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

// Mirrors contract tie_rank: a civic draw lands after the recharge it follows.
function tieRank(task: Task): number {
    const type = task.type.toNumber()
    if (type === TaskType.RECHARGE) return 1
    if (type === TaskType.CIVIC_DRAW) return 2
    return 0
}

// Canonical lane-front order (mirrors contract front_precedes): completion, then tie rank, then lane key.
function frontPrecedes(
    a: {completesAt: Date; task: Task; laneKey: number},
    b: {completesAt: Date; task: Task; laneKey: number}
): number {
    if (a.completesAt.getTime() !== b.completesAt.getTime()) {
        return a.completesAt.getTime() - b.completesAt.getTime()
    }
    const rank = tieRank(a.task) - tieRank(b.task)
    if (rank !== 0) return rank
    return a.laneKey - b.laneKey
}

// Completed lane-fronts in canonical order (mirrors contract front_precedes).
export function resolveOrder(entity: ScheduleData, now: Date): ResolvedEvent[] {
    const events: ResolvedEvent[] = []
    for (const l of entity.lanes ?? []) {
        const laneKey = l.lane_key.toNumber()
        const startedMs = l.schedule.started.toDate().getTime()
        const front = l.schedule.tasks[0]
        if (front && entity.id !== undefined && isSelfUndeployMirror(front, entity.id)) continue
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

// Mirrors the contract's completed_task_count_at: inclusive at the anchor.
export function appliedTaskCount(
    entity: AnchoredScheduleData,
    ordered: readonly OrderedTask[]
): number {
    const anchor = entity.projected_at
    if (anchor === undefined) return 0
    const anchorMs = Number(anchor.toMilliseconds())
    let count = 0
    for (const {completesAt} of ordered) {
        if (completesAt.getTime() <= anchorMs) count++
    }
    return count
}

// Tasks an entity_info snapshot has NOT yet folded into its cargo and state.
export function unappliedTasks(entity: AnchoredScheduleData): OrderedTask[] {
    const ordered = orderedTasks(entity)
    return ordered.slice(appliedTaskCount(entity, ordered))
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
