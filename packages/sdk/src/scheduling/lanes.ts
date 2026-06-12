import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import type {ModuleType} from '../types'
import {getLane, type ScheduleData} from './schedule'

type ModuleEntry = ServerContract.Types.module_entry
type Lane = ServerContract.Types.lane
type Schedule = ServerContract.Types.schedule

export function laneKeyForModule(slotIndex: number): number {
    return slotIndex + 1
}

function laneIsFree(lanes: Lane[], laneKey: number): boolean {
    const lane = lanes.find((entry) => entry.lane_key.toNumber() === laneKey)
    return lane ? lane.schedule.tasks.length === 0 : true
}

export function workerLaneKey(
    modules: ModuleEntry[],
    moduleSubtype: ModuleType,
    lanes: Lane[]
): number {
    const occupiedMatchingLaneKeys: number[] = []

    for (let slotIndex = 0; slotIndex < modules.length; slotIndex++) {
        const installed = modules[slotIndex].installed
        if (!installed) continue
        if (getItem(installed.item_id).moduleType !== moduleSubtype) continue

        const laneKey = laneKeyForModule(slotIndex)
        if (laneIsFree(lanes, laneKey)) return laneKey
        occupiedMatchingLaneKeys.push(laneKey)
    }

    if (occupiedMatchingLaneKeys.length > 0) {
        return Math.min(...occupiedMatchingLaneKeys)
    }

    throw new Error(`No installed ${moduleSubtype} worker module`)
}

export function rawScheduleEnd(schedule: Schedule): Date {
    const durationSec = schedule.tasks.reduce((sum, task) => sum + task.duration.toNumber(), 0)
    return new Date(schedule.started.toDate().getTime() + durationSec * 1000)
}

export function candidateLaneCompletesAt(
    entity: ScheduleData,
    laneKey: number,
    durationSec: number,
    now: Date
): Date {
    const lane = getLane(entity, laneKey)
    const startMs = lane
        ? Math.max(rawScheduleEnd(lane.schedule).getTime(), now.getTime())
        : now.getTime()

    return new Date(startMs + durationSec * 1000)
}
