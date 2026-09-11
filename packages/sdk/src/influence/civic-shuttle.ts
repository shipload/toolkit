import type {UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {JOB_QUEUE_CAP} from '../scheduling/jobs'
import {laneKeyForModule, resolveLaneLoader} from '../scheduling/lanes'
import {orderedTasks, type ScheduleData} from '../scheduling/schedule'
import {HoldKind, TaskType} from '../types'

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

export function civicShuttleBays(
    modules: ModuleEntry[],
    entityItemId: number,
    lanes: Lane[]
): CivicShuttleBay[] {
    const bays: CivicShuttleBay[] = []
    for (let slotIndex = 0; slotIndex < modules.length; slotIndex++) {
        const installed = modules[slotIndex].installed
        if (!installed) continue
        if (getItem(installed.item_id).moduleType !== 'loader') continue
        const laneKey = laneKeyForModule(slotIndex)
        const loader = resolveLaneLoader(modules, entityItemId, laneKey)
        const lane = lanes.find((l) => l.lane_key.toNumber() === laneKey)
        const queued = lane ? lane.schedule.tasks.length : 0
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

// Mirrors worker_lane_key_or_mobility for loaders: first free bay, else the lowest bay.
export function selectCivicShuttleBay(
    modules: ModuleEntry[],
    entityItemId: number,
    lanes: Lane[]
): CivicShuttleBay | undefined {
    const bays = civicShuttleBays(modules, entityItemId, lanes)
    return bays.find((bay) => bay.queued === 0) ?? bays[0]
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
    callable: boolean
}

export function pendingCivicTransfers(entity: ScheduleData): PendingCivicTransfer[] {
    const tailIndex = new Map<number, number>()
    for (const l of entity.lanes ?? []) {
        tailIndex.set(l.lane_key.toNumber(), l.schedule.tasks.length - 1)
    }
    const out: PendingCivicTransfer[] = []
    for (const entry of orderedTasks(entity)) {
        if (entry.task.type.toNumber() !== TaskType.SHUTTLE) continue
        const pull = entry.task.couplings.find((c) => c.kind.toNumber() === HoldKind.PULL)
        const push = entry.task.couplings.find((c) => c.kind.toNumber() === HoldKind.PUSH)
        if (!pull || !push) continue
        const isTail = tailIndex.get(entry.laneKey) === entry.taskIndex
        out.push({
            laneKey: entry.laneKey,
            taskIndex: entry.taskIndex,
            senderId: pull.counterpart.entity_id,
            receiverId: push.counterpart.entity_id,
            cargo: entry.task.cargo,
            startsAt: entry.startsAt,
            completesAt: entry.completesAt,
            isTail,
            callable: isTail && !entry.task.entitygroup,
        })
    }
    return out
}

// Mirrors civic_transfers_for: the sender side of every shuttle the building holds, by owner.
export function civicTransfersFrom(
    entity: ScheduleData,
    senderIds: Array<UInt64 | string | number>
): PendingCivicTransfer[] {
    const owned = new Set(senderIds.map((id) => String(id)))
    return pendingCivicTransfers(entity).filter((t) => owned.has(String(t.senderId)))
}

export function civicTransfersAtCap(
    entity: ScheduleData,
    senderIds: Array<UInt64 | string | number>
): boolean {
    return civicTransfersFrom(entity, senderIds).length >= CIVIC_TRANSFER_PER_PLAYER_CAP
}
