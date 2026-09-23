import type {UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {JOB_QUEUE_CAP} from '../scheduling/jobs'
import {laneKeyForModule, resolveLaneLoader} from '../scheduling/lanes'
import {orderedTasks, type ScheduleData} from '../scheduling/schedule'
import {HoldKind, TaskCancelable, TaskType} from '../types'

type CargoItem = ServerContract.Types.cargo_item
type Lane = ServerContract.Types.lane
type ModuleEntry = ServerContract.Types.module_entry

export const CIVIC_TRANSFER_PER_PLAYER_CAP = 4

export interface CivicShuttleBay {
    laneKey: number
    slotIndex: number
    thrust: number
    mass: number
    outputPct: number
    queued: number
    full: boolean
}

function unfinishedTasks(lane: Lane | undefined, now: Date): number {
    if (!lane) return 0
    const startedMs = lane.schedule.started.toDate().getTime()
    const nowMs = now.getTime()
    let endSec = 0
    let count = 0
    for (const task of lane.schedule.tasks) {
        endSec += task.duration.toNumber()
        if (startedMs + endSec * 1000 > nowMs) count++
    }
    return count
}

export function civicShuttleBays(
    modules: ModuleEntry[],
    entityItemId: number,
    lanes: Lane[],
    now: Date = new Date()
): CivicShuttleBay[] {
    const bays: CivicShuttleBay[] = []
    for (let slotIndex = 0; slotIndex < modules.length; slotIndex++) {
        const installed = modules[slotIndex].installed
        if (!installed) continue
        if (getItem(installed.item_id).moduleType !== 'loader') continue
        const laneKey = laneKeyForModule(slotIndex)
        const loader = resolveLaneLoader(modules, entityItemId, laneKey)
        const lane = lanes.find((l) => l.lane_key.toNumber() === laneKey)
        const queued = unfinishedTasks(lane, now)
        bays.push({
            laneKey,
            slotIndex,
            thrust: loader.thrust,
            mass: loader.mass,
            outputPct: loader.outputPct,
            queued,
            full: queued >= JOB_QUEUE_CAP,
        })
    }
    return bays
}

function laneEndMs(lane: Lane | undefined, nowMs: number): number {
    if (!lane) return nowMs
    let endSec = 0
    for (const task of lane.schedule.tasks) endSec += task.duration.toNumber()
    return Math.max(nowMs, lane.schedule.started.toDate().getTime() + endSec * 1000)
}

// Mirrors cargo.cpp pick_civic_bay: earliest finish among bays below the queue cap.
export function selectCivicShuttleBay(
    modules: ModuleEntry[],
    entityItemId: number,
    lanes: Lane[],
    now: Date = new Date(),
    durationFor: (bay: CivicShuttleBay) => number = () => 0,
    minStart?: Date
): CivicShuttleBay | undefined {
    const bays = civicShuttleBays(modules, entityItemId, lanes, now)
    const nowMs = now.getTime()
    const floorMs = Math.max(nowMs, minStart?.getTime() ?? nowMs)
    let best: CivicShuttleBay | undefined
    let bestEnd = Infinity
    for (const bay of bays) {
        if (bay.full) continue
        const lane = lanes.find((l) => l.lane_key.toNumber() === bay.laneKey)
        const start = Math.max(laneEndMs(lane, nowMs), floorMs)
        const end = start + durationFor(bay) * 1000
        if (end < bestEnd) {
            best = bay
            bestEnd = end
        }
    }
    return best ?? bays[0]
}

export interface PendingCivicTransfer {
    laneKey: number
    taskIndex: number
    senderId: UInt64
    receiverId: UInt64
    cargo: CargoItem[]
    startsAt: Date
    completesAt: Date
    isTail: boolean
    complete: boolean
    callable: boolean
}

export function pendingCivicTransfers(
    entity: ScheduleData,
    now: Date = new Date()
): PendingCivicTransfer[] {
    const tailIndex = new Map<number, number>()
    for (const l of entity.lanes ?? []) {
        tailIndex.set(l.lane_key.toNumber(), l.schedule.tasks.length - 1)
    }
    const out: PendingCivicTransfer[] = []
    for (const entry of orderedTasks(entity)) {
        const type = entry.task.type.toNumber()
        if (type === TaskType.CIVIC_DEPOSIT || type === TaskType.CIVIC_WITHDRAW) {
            const side = entry.task.couplings[0]
            if (!side) continue
            const isTail = tailIndex.get(entry.laneKey) === entry.taskIndex
            const complete = entry.completesAt.getTime() <= now.getTime()
            out.push({
                laneKey: entry.laneKey,
                taskIndex: entry.taskIndex,
                senderId: side.counterpart.entity_id,
                receiverId: side.counterpart.entity_id,
                cargo: entry.task.cargo,
                startsAt: entry.startsAt,
                completesAt: entry.completesAt,
                isTail,
                complete,
                callable:
                    isTail &&
                    !complete &&
                    !entry.task.entitygroup &&
                    entry.task.cancelable.toNumber() !== TaskCancelable.NEVER,
            })
            continue
        }
        if (type !== TaskType.SHUTTLE) continue
        const pull = entry.task.couplings.find((c) => c.kind.toNumber() === HoldKind.PULL)
        const push = entry.task.couplings.find((c) => c.kind.toNumber() === HoldKind.PUSH)
        if (!pull || !push) continue
        const isTail = tailIndex.get(entry.laneKey) === entry.taskIndex
        const complete = entry.completesAt.getTime() <= now.getTime()
        out.push({
            laneKey: entry.laneKey,
            taskIndex: entry.taskIndex,
            senderId: pull.counterpart.entity_id,
            receiverId: push.counterpart.entity_id,
            cargo: entry.task.cargo,
            startsAt: entry.startsAt,
            completesAt: entry.completesAt,
            isTail,
            complete,
            callable: isTail && !complete && !entry.task.entitygroup,
        })
    }
    return out
}

// Mirrors civic_transfers_for: the sender side of every shuttle the building holds, by owner.
export function civicTransfersFrom(
    entity: ScheduleData,
    senderIds: Array<UInt64 | string | number>,
    now: Date = new Date()
): PendingCivicTransfer[] {
    const owned = new Set(senderIds.map((id) => String(id)))
    return pendingCivicTransfers(entity, now).filter((t) => owned.has(String(t.senderId)))
}

export function civicTransfersAtCap(
    entity: ScheduleData,
    senderIds: Array<UInt64 | string | number>,
    now: Date = new Date()
): boolean {
    return (
        civicTransfersFrom(entity, senderIds, now).filter((t) => !t.complete).length >=
        CIVIC_TRANSFER_PER_PLAYER_CAP
    )
}
