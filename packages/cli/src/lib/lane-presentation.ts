import {getItem, schedule, type ServerTypes} from '@shipload/sdk'

export type LaneKind = 'mobility' | 'worker' | 'barrier'
export type LaneSectionStatus = 'active' | 'waiting' | 'ready to resolve' | 'done' | 'queued'

export interface LaneLabelSource {
    modules?: ServerTypes.module_entry[]
}

export interface LaneLabelOptions {
    compact?: boolean
}

export interface LaneFrontState {
    status: LaneSectionStatus
    activeIndex: number
    startsIn_s: number
    remaining_s: number
    totalRemaining_s: number
    progress: number
}

type NumberLike = number | bigint | string | {toNumber(): number}
type StartedLike = Date | string | {toDate(): Date} | {toMilliseconds(): number}

interface LaneTaskLike {
    duration?: NumberLike
    duration_s?: NumberLike
    type?: NumberLike
}

interface LaneScheduleLike {
    started: StartedLike
    tasks?: LaneTaskLike[]
}

interface LaneLike {
    schedule: LaneScheduleLike
}

const WORKER_CAPABILITIES = new Set(['gatherer', 'loader', 'crafter', 'builder'])
const TIMEZONE_SUFFIX_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i

function asNumber(value: NumberLike | undefined): number {
    if (value === undefined) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'bigint') return Number(value)
    if (typeof value === 'string') return Number(value)
    return value.toNumber()
}

function startedDate(started: StartedLike): Date {
    if (started instanceof Date) return started
    if (typeof started === 'string') {
        const timestamp = started.includes('T') && !TIMEZONE_SUFFIX_RE.test(started) ? `${started}Z` : started
        return new Date(timestamp)
    }
    if ('toDate' in started) return started.toDate()
    return new Date(started.toMilliseconds())
}

function taskDuration_s(task: LaneTaskLike): number {
    return Math.max(0, asNumber(task.duration_s ?? task.duration))
}

function clampProgress(value: number): number {
    return Math.max(0, Math.min(1, value))
}

export function laneKind(laneKey: number): LaneKind {
    if (laneKey === schedule.LANE_MOBILITY) return 'mobility'
    if (laneKey === schedule.LANE_BARRIER) return 'barrier'
    return 'worker'
}

function laneSortRank(laneKey: number): number {
    switch (laneKind(laneKey)) {
        case 'mobility':
            return 0
        case 'worker':
            return 1
        case 'barrier':
            return 2
    }
}

export function sortLaneKeysSemantic(keys: number[]): number[] {
    return [...keys].sort((a, b) => {
        const rankDelta = laneSortRank(a) - laneSortRank(b)
        return rankDelta === 0 ? a - b : rankDelta
    })
}

function workerCapability(source: LaneLabelSource, laneKey: number): string {
    const installed = source.modules?.[laneKey - 1]?.installed
    if (!installed) return 'worker'

    try {
        const moduleType = getItem(installed.item_id).moduleType
        return moduleType && WORKER_CAPABILITIES.has(moduleType) ? moduleType : 'worker'
    } catch {
        return 'worker'
    }
}

export function laneLabel(
    source: LaneLabelSource,
    laneKey: number,
    opts: LaneLabelOptions = {}
): string {
    switch (laneKind(laneKey)) {
        case 'mobility':
            return opts.compact ? 'mob' : 'mobility'
        case 'barrier':
            return 'barrier'
        case 'worker':
            return `L${laneKey} ${workerCapability(source, laneKey)}`
    }
}

export function laneFront(scheduleData: LaneScheduleLike, now: Date): LaneFrontState {
    const tasks = scheduleData.tasks ?? []
    const durations = tasks.map(taskDuration_s)
    const totalDuration_s = durations.reduce((sum, duration) => sum + duration, 0)

    if (tasks.length === 0) {
        return {
            status: 'done',
            activeIndex: -1,
            startsIn_s: 0,
            remaining_s: 0,
            totalRemaining_s: 0,
            progress: 1,
        }
    }

    const startMs = startedDate(scheduleData.started).getTime()
    const nowMs = now.getTime()

    if (nowMs < startMs) {
        const startsIn_s = Math.ceil((startMs - nowMs) / 1000)
        return {
            status: 'waiting',
            activeIndex: -1,
            startsIn_s,
            remaining_s: durations[0] ?? 0,
            totalRemaining_s: startsIn_s + totalDuration_s,
            progress: 0,
        }
    }

    const elapsed_s = Math.floor((nowMs - startMs) / 1000)
    let elapsedBeforeTask_s = 0
    for (let i = 0; i < durations.length; i++) {
        const duration_s = durations[i] ?? 0
        if (elapsed_s < elapsedBeforeTask_s + duration_s) {
            const taskElapsed_s = Math.max(0, elapsed_s - elapsedBeforeTask_s)
            const remaining_s = Math.max(0, duration_s - taskElapsed_s)
            const queued_s = durations
                .slice(i + 1)
                .reduce((sum, duration) => sum + duration, 0)
            return {
                status: 'active',
                activeIndex: i,
                startsIn_s: 0,
                remaining_s,
                totalRemaining_s: remaining_s + queued_s,
                progress: duration_s === 0 ? 1 : clampProgress(taskElapsed_s / duration_s),
            }
        }
        elapsedBeforeTask_s += duration_s
    }

    return {
        status: 'ready to resolve',
        activeIndex: -1,
        startsIn_s: 0,
        remaining_s: 0,
        totalRemaining_s: 0,
        progress: 1,
    }
}

export function laneSectionStatus(lane: LaneLike, now: Date): LaneSectionStatus {
    const front = laneFront(lane.schedule, now)
    if (front.status === 'waiting') return front.status

    const tasks = lane.schedule.tasks ?? []
    const completedTaskCount = front.status === 'active' ? front.activeIndex : tasks.length

    if (completedTaskCount > 0) {
        return 'ready to resolve'
    }
    if (front.status === 'active') return front.status
    return 'done'
}
