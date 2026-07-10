import type {ServerContract} from '../contracts'
import {HoldKind, TaskCancelable, TaskType} from '../types'
import {calcCargoItemMass} from '../capabilities/storage'
import {taskCargoEffect, cargoKey} from './availability'
import * as schedule from './schedule'
import {validateSchedule, type Projectable} from './projection'

export enum CancelBlockReason {
    TASK_NEVER = 'TASK_NEVER',
    BEFORE_START_RUNNING = 'BEFORE_START_RUNNING',
    DONE = 'DONE',
    CONTAINS_LINKED_TASK = 'CONTAINS_LINKED_TASK',
    WOULD_STRAND = 'WOULD_STRAND',
    WOULD_OVERFILL = 'WOULD_OVERFILL',
    NOT_OWNER = 'NOT_OWNER',
}

type Task = InstanceType<typeof ServerContract.Types.task>
type EntityInfo = InstanceType<typeof ServerContract.Types.entity_info>
type EntityRef = InstanceType<typeof ServerContract.Types.entity_ref>
type CargoItem = InstanceType<typeof ServerContract.Types.cargo_item>

export interface CancelRefund {
    giver: EntityRef
    cargo: CargoItem[]
}
export interface CancelReleasedHold {
    counterpart: EntityRef
    kind: number
}
export interface CancelEffects {
    refunds: CancelRefund[]
    releasedHolds: CancelReleasedHold[]
    abandonsRunning: boolean
    keepsPlotDeposits?: {plot: EntityRef}
    energyForfeited?: number
}
export interface CancelPlan {
    ok: boolean
    blockedReason?: CancelBlockReason
    range: {count: number; taskIndices: number[]}
    effects: CancelEffects
}
export interface CancelEligibilityInput {
    now: Date
    counterparts?: Map<string, EntityInfo>
}

const EMPTY_EFFECTS: CancelEffects = {refunds: [], releasedHolds: [], abandonsRunning: false}

function postCancelEntity(entity: EntityInfo, laneKey: number, fromTaskIndex: number): EntityInfo {
    const clone = (entity.constructor as typeof ServerContract.Types.entity_info).from(
        JSON.parse(JSON.stringify(entity.toJSON()))
    ) as EntityInfo
    const lane = clone.lanes.find((l) => l.lane_key.toNumber() === laneKey)!
    lane.schedule.tasks = lane.schedule.tasks.slice(0, fromTaskIndex)
    return clone
}

function feasibleAfterCancel(post: EntityInfo): boolean {
    const ordered = schedule.orderedTasks(post as unknown as Projectable)
    const base = new Map<string, number>()
    for (const c of post.cargo ?? []) {
        const k = cargoKey(c)
        base.set(k, (base.get(k) ?? 0) + c.quantity.toNumber())
    }
    const isConsumer = (t: Task) =>
        t.type.toNumber() === TaskType.CRAFT || t.type.toNumber() === TaskType.UNLOAD
    for (const self of ordered) {
        if (!isConsumer(self.task)) continue
        const map = new Map(base)
        for (const other of ordered) {
            if (other.completesAt.getTime() >= self.completesAt.getTime()) continue
            for (const out of taskCargoEffect(other.task).added) {
                map.set(cargoKey(out), (map.get(cargoKey(out)) ?? 0) + out.quantity.toNumber())
            }
        }
        for (const other of ordered) {
            if (other === self) continue
            for (const inp of taskCargoEffect(other.task).removed) {
                const cur = map.get(cargoKey(inp)) ?? 0
                map.set(cargoKey(inp), Math.max(0, cur - inp.quantity.toNumber()))
            }
        }
        for (const inp of taskCargoEffect(self.task).removed) {
            if ((map.get(cargoKey(inp)) ?? 0) < inp.quantity.toNumber()) return false
        }
    }
    try {
        validateSchedule(post as unknown as Projectable)
    } catch {
        return false
    }
    return true
}

interface Timing {
    startsAt: number
    completesAt: number
    running: boolean
    done: boolean
}

function laneTiming(
    lane: {schedule: {started: {toDate(): Date}; tasks: Task[]}},
    nowMs: number
): Timing[] {
    const startedMs = lane.schedule.started.toDate().getTime()
    let endSec = 0
    return lane.schedule.tasks.map((t) => {
        const startsAt = startedMs + endSec * 1000
        endSec += t.duration.toNumber()
        const completesAt = startedMs + endSec * 1000
        return {
            startsAt,
            completesAt,
            running: nowMs >= startsAt && nowMs < completesAt,
            done: nowMs >= completesAt,
        }
    })
}

export function cancelEligibility(
    entity: EntityInfo,
    laneKey: number,
    fromTaskIndex: number,
    input: CancelEligibilityInput
): CancelPlan {
    const lane = (entity.lanes ?? []).find((l) => l.lane_key.equals(laneKey))
    if (!lane || fromTaskIndex < 0 || fromTaskIndex >= lane.schedule.tasks.length) {
        return {ok: false, range: {count: 0, taskIndices: []}, effects: {...EMPTY_EFFECTS}}
    }

    const tasks = lane.schedule.tasks
    const timing = laneTiming(lane, input.now.getTime())
    const taskIndices: number[] = []
    for (let i = fromTaskIndex; i < tasks.length; i++) taskIndices.push(i)
    const range = {count: taskIndices.length, taskIndices}

    const block = (blockedReason: CancelBlockReason): CancelPlan => ({
        ok: false,
        blockedReason,
        range,
        effects: {...EMPTY_EFFECTS},
    })

    for (const i of taskIndices) {
        const t = tasks[i]
        if (t.entitygroup && !t.entitygroup.equals(0))
            return block(CancelBlockReason.CONTAINS_LINKED_TASK)
    }

    for (const i of taskIndices) {
        const t = tasks[i]
        if (timing[i].done) return block(CancelBlockReason.DONE)
        if (t.cancelable.equals(TaskCancelable.NEVER) && !t.type.equals(TaskType.IDLE))
            return block(CancelBlockReason.TASK_NEVER)
        if (t.cancelable.equals(TaskCancelable.BEFORE_START) && timing[i].running)
            return block(CancelBlockReason.BEFORE_START_RUNNING)
    }

    const post = postCancelEntity(entity, laneKey, fromTaskIndex)
    if (!feasibleAfterCancel(post)) return block(CancelBlockReason.WOULD_STRAND)

    const effects: CancelEffects = {refunds: [], releasedHolds: [], abandonsRunning: false}
    let energyForfeited = 0
    for (const i of taskIndices) {
        const t = tasks[i]
        if (timing[i].running && t.cancelable.equals(TaskCancelable.ALWAYS))
            effects.abandonsRunning = true
        if (t.energy_cost) energyForfeited += t.energy_cost.toNumber()
        if (t.type.equals(TaskType.BUILDPLOT) && t.couplings.length > 0)
            effects.keepsPlotDeposits = {plot: t.couplings[0].counterpart}
        for (const c of t.couplings) {
            const kind = c.kind.toNumber()
            effects.releasedHolds.push({counterpart: c.counterpart, kind})
            if (kind === HoldKind.PULL) {
                effects.refunds.push({giver: c.counterpart, cargo: t.cargo})
                const giver = input.counterparts?.get(c.counterpart.entity_id.toString())
                if (giver) {
                    const returned = t.cargo.reduce(
                        (s, c) => s + calcCargoItemMass(c).toNumber(),
                        0
                    )
                    const cap = giver.capacity ? giver.capacity.toNumber() : Number.MAX_SAFE_INTEGER
                    if (giver.cargomass.toNumber() + returned > cap) {
                        return {
                            ok: false,
                            blockedReason: CancelBlockReason.WOULD_OVERFILL,
                            range,
                            effects: {...EMPTY_EFFECTS},
                        }
                    }
                }
            }
        }
    }
    if (energyForfeited > 0) effects.energyForfeited = energyForfeited

    return {ok: true, range, effects}
}
