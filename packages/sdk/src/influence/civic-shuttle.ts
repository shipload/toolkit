import type {UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {CIVIC_SETTLE_LIMIT, JOB_QUEUE_CAP} from '../scheduling/jobs'
import {laneKeyForModule, resolveLaneLoader} from '../scheduling/lanes'
import {orderedTasks, resolveOrder, type ScheduleData} from '../scheduling/schedule'
import {HoldKind, TaskCancelable, TaskType} from '../types'

type CargoItem = ServerContract.Types.cargo_item
type Lane = ServerContract.Types.lane
type ModuleEntry = ServerContract.Types.module_entry

export interface CivicShuttleBay {
    laneKey: number
    slotIndex: number
    thrust: number
    payload: number
    outputPct: number
    queued: number
    full: boolean
    unsettled: boolean
    gapped: boolean
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

// Mirrors lanes.hpp lanes_left_landed: bays still fronted by a landed task once the first `budget` landed tasks settle.
export function lanesLeftLanded(lanes: Lane[], now: Date, budget: number): number[] {
    const nowMs = now.getTime()
    const out: number[] = []
    if (budget === 0) {
        for (const lane of lanes) {
            const front = lane.schedule.tasks[0]
            if (!front) continue
            const frontEnd =
                lane.schedule.started.toDate().getTime() + front.duration.toNumber() * 1000
            if (frontEnd <= nowMs) out.push(lane.lane_key.toNumber())
        }
        return out
    }
    let settled = 0
    for (const entry of orderedTasks({lanes})) {
        if (entry.completesAt.getTime() > nowMs) break
        if (settled < budget) {
            settled++
            continue
        }
        if (!out.includes(entry.laneKey)) out.push(entry.laneKey)
    }
    return out
}

// The default budget is the booking's: its bay prologue settles CIVIC_SETTLE_LIMIT landed tasks before it picks.
export function civicShuttleBays(
    modules: ModuleEntry[],
    entityItemId: number,
    lanes: Lane[],
    now: Date = new Date(),
    minStart?: Date,
    settleBudget: number = CIVIC_SETTLE_LIMIT
): CivicShuttleBay[] {
    const bays: CivicShuttleBay[] = []
    const nowMs = now.getTime()
    const startMs = minStart?.getTime() ?? nowMs
    const unsettled = lanesLeftLanded(lanes, now, settleBudget)
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
            payload: loader.payload,
            outputPct: loader.outputPct,
            queued,
            full: queued >= JOB_QUEUE_CAP,
            unsettled: unsettled.includes(laneKey),
            gapped: needsIdleGap(lane, startMs, nowMs),
        })
    }
    return bays
}

function floorSecond(ms: number): number {
    return Math.floor(ms / 1000) * 1000
}

function laneEndMs(lane: Lane | undefined, nowMs: number): number {
    if (!lane) return nowMs
    let endSec = 0
    for (const task of lane.schedule.tasks) endSec += task.duration.toNumber()
    return Math.max(nowMs, lane.schedule.started.toDate().getTime() + endSec * 1000)
}

// Mirrors placement.hpp lane_needs_idle_gap: a start past the lane's end would push an idle gap onto a shared lane.
function needsIdleGap(lane: Lane | undefined, startMs: number, nowMs: number): boolean {
    return floorSecond(startMs) > laneEndMs(lane, floorSecond(nowMs))
}

// Mirrors cargo.cpp pick_earliest_loader_lane: earliest finish among settled bays below the queue cap that need no idle gap.
export function selectCivicShuttleBay(
    modules: ModuleEntry[],
    entityItemId: number,
    lanes: Lane[],
    now: Date = new Date(),
    durationFor: (bay: CivicShuttleBay) => number = () => 0,
    minStart?: Date,
    settleBudget: number = CIVIC_SETTLE_LIMIT
): CivicShuttleBay | undefined {
    const bays = civicShuttleBays(modules, entityItemId, lanes, now, minStart, settleBudget)
    const nowMs = now.getTime()
    const floorMs = Math.max(nowMs, minStart?.getTime() ?? nowMs)
    let best: CivicShuttleBay | undefined
    let bestEnd = Infinity
    for (const bay of bays) {
        if (bay.full || bay.unsettled || bay.gapped) continue
        const lane = lanes.find((l) => l.lane_key.toNumber() === bay.laneKey)
        const start = Math.max(laneEndMs(lane, nowMs), floorMs)
        const end = start + durationFor(bay) * 1000
        if (end < bestEnd) {
            best = bay
            bestEnd = end
        }
    }
    if (best) return best
    // resolve_civic_carrier refuses in this order: every bay booked, then an unsettled bay, then the arrival gap
    if (bays.every((bay) => bay.full)) return bays[0]
    return (
        bays.find((bay) => bay.unsettled && !bay.full) ??
        bays.find((bay) => bay.unsettled) ??
        bays.find((bay) => !bay.full)
    )
}

// Count-less civic resolves (CIVIC_SETTLE_LIMIT tasks each) that reach the backlog's end, or entityIds' last due task.
export function civicSettleRounds(
    entity: ScheduleData,
    now: Date,
    entityIds?: Array<UInt64 | string | number>
): number {
    const due = resolveOrder(entity, now)
    let depth = due.length
    if (entityIds) {
        const ids = new Set(entityIds.map((id) => String(id)))
        depth = 0
        due.forEach((event, i) => {
            if (event.task.couplings.some((c) => ids.has(String(c.counterpart.entity_id)))) {
                depth = i + 1
            }
        })
    }
    return Math.ceil(depth / CIVIC_SETTLE_LIMIT)
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

// The sender side of every transfer the building holds, narrowed to the given senders.
export function civicTransfersFrom(
    entity: ScheduleData,
    senderIds: Array<UInt64 | string | number>,
    now: Date = new Date()
): PendingCivicTransfer[] {
    const owned = new Set(senderIds.map((id) => String(id)))
    return pendingCivicTransfers(entity, now).filter((t) => owned.has(String(t.senderId)))
}
