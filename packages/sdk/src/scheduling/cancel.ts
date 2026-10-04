import {ServerContract} from '../contracts'
import type {Cluster} from '../managers/cluster'
import {HoldKind, TaskCancelable, TaskType} from '../types'
import {calcCargoItemMass} from '../capabilities/storage'
import * as errors from '../errors'
import {
    taskCargoEffect,
    cargoKey,
    hasSourceCoupling,
    incomingSources,
    isIncomingCouplingKind,
    type IncomingSource,
} from './availability'
import * as schedule from './schedule'
import {laneTaskComplete, laneTaskInProgress} from './lane-core'
import {energyDrawsFunded} from './energy'
import {projectEntity, type Projectable} from './projection'
import {isConsumerTask, isMobilityTask} from './task-effects'
import {incomingHoldMass, projectedPeakCargomass} from './unwrap'

export enum CancelBlockReason {
    NEEDS = 'NEEDS',
    PLOT = 'PLOT',
    NO_LANE = 'NO_LANE',
    NO_TASKS = 'NO_TASKS',
    GROUP_IN_RANGE = 'GROUP_IN_RANGE',
    GROUP_MISSING = 'GROUP_MISSING',
    GROUP_NOT_AT_TAIL = 'GROUP_NOT_AT_TAIL',
    GROUP_BELOW_LATER_TASK = 'GROUP_BELOW_LATER_TASK',
    DONE = 'DONE',
    TASK_NEVER = 'TASK_NEVER',
    BEFORE_START_RUNNING = 'BEFORE_START_RUNNING',
    WOULD_STRAND = 'WOULD_STRAND',
    WOULD_STRAND_COUNTERPART = 'WOULD_STRAND_COUNTERPART',
    GIVER_CAPPED = 'GIVER_CAPPED',
    WOULD_OVERFILL = 'WOULD_OVERFILL',
    GIVER_MISSING = 'GIVER_MISSING',
    CLUSTER_FULL = 'CLUSTER_FULL',
    INCONSISTENT = 'INCONSISTENT',
}

// Each contract refusal in errors.CANCEL_REFUSALS and the reason the preview reports for it.
export const CANCEL_REFUSAL_REASONS: ReadonlyMap<string, CancelBlockReason> = new Map([
    [errors.PLOT_CANCEL_NOT_ALLOWED, CancelBlockReason.PLOT],
    [errors.CANCEL_LANE_NOT_FOUND, CancelBlockReason.NO_LANE],
    [errors.SHIP_NO_TASKS_TO_CANCEL, CancelBlockReason.NO_TASKS],
    [errors.CANCEL_GROUP_IN_RANGE, CancelBlockReason.GROUP_IN_RANGE],
    [errors.GROUP_NOT_FOUND, CancelBlockReason.GROUP_MISSING],
    [errors.CANCEL_GROUP_NOT_AT_TAIL, CancelBlockReason.GROUP_NOT_AT_TAIL],
    [errors.CANCEL_GROUP_BELOW_LATER_TASK, CancelBlockReason.GROUP_BELOW_LATER_TASK],
    [errors.CANCEL_TASK_COMPLETE, CancelBlockReason.DONE],
    [errors.CANCEL_TASK_NEVER, CancelBlockReason.TASK_NEVER],
    [errors.SHIP_CANNOT_CANCEL_TASK, CancelBlockReason.BEFORE_START_RUNNING],
    [errors.CANCEL_WOULD_STRAND, CancelBlockReason.WOULD_STRAND],
    [errors.CANCEL_GIVER_CAPPED, CancelBlockReason.GIVER_CAPPED],
    [errors.CANCEL_WOULD_OVERFILL, CancelBlockReason.WOULD_OVERFILL],
    [errors.CANCEL_PAIRED_NOT_FOUND, CancelBlockReason.GIVER_MISSING],
    [errors.CANCEL_CLUSTER_CANNOT_ABSORB, CancelBlockReason.CLUSTER_FULL],
])

// The contract message a refusal reason stands for; NEEDS and INCONSISTENT have none.
export function cancelRefusalMessage(reason: CancelBlockReason): string | undefined {
    if (reason === CancelBlockReason.WOULD_STRAND_COUNTERPART) return errors.CANCEL_WOULD_STRAND
    for (const [message, mapped] of CANCEL_REFUSAL_REASONS) if (mapped === reason) return message
    return undefined
}

type Task = InstanceType<typeof ServerContract.Types.task>
type Lane = InstanceType<typeof ServerContract.Types.lane>
type EntityInfo = InstanceType<typeof ServerContract.Types.entity_info>
type EntityRef = InstanceType<typeof ServerContract.Types.entity_ref>
type CargoItem = InstanceType<typeof ServerContract.Types.cargo_item>
type Coordinates = {x: {toString(): string}; y: {toString(): string}}

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
export interface CancelHubSite {
    owner: string
    x: number
    y: number
}
export interface CancelNeeds {
    entities: string[]
    hubs: string[]
    groups: string[]
    hubSites: CancelHubSite[]
}
export interface CancelPlan {
    ok: boolean
    blockedReason?: CancelBlockReason
    blockedByCounterpart?: EntityRef
    needs?: CancelNeeds
    cascade?: string[]
    range: {count: number; taskIndices: number[]}
    effects: CancelEffects
}
export interface CancelLookup<T> {
    get(key: string): T | undefined
}
export interface CancelEligibilityInput {
    now: Date
    counterparts?: CancelLookup<EntityInfo>
    groupParticipants?: CancelLookup<readonly string[]>
    clusters?: CancelLookup<Cluster>
    hubAt?: (owner: string, x: number, y: number) => string | undefined
}

const FLIGHT_LANE_BASE = 200
const FLIGHT_LANE_CAP = 8
const CO_LOCATED_HOLD_KINDS = new Set<number>([
    HoldKind.PUSH,
    HoldKind.GATHER,
    HoldKind.PULL,
    HoldKind.SOURCE,
])

interface Refusal {
    reason: CancelBlockReason
    counterpart?: EntityRef
}

class CancelContext {
    readonly needs: CancelNeeds = {
        entities: [],
        hubs: [],
        groups: [],
        hubSites: [],
    }
    constructor(
        readonly input: CancelEligibilityInput,
        readonly self: EntityInfo
    ) {}

    entity(id: string): EntityInfo | undefined {
        if (id === this.self.id.toString()) return this.self
        const found = this.input.counterparts?.get(id)
        if (!found && !this.needs.entities.includes(id)) this.needs.entities.push(id)
        return found
    }

    cluster(hubId: string): Cluster | undefined {
        const found = this.input.clusters?.get(hubId)
        if (!found && !this.needs.hubs.includes(hubId)) this.needs.hubs.push(hubId)
        return found
    }

    hubAt(owner: string, at: Coordinates): string | undefined {
        const x = Number(at.x.toString())
        const y = Number(at.y.toString())
        const found = this.input.hubAt?.(owner, x, y)
        const known = this.needs.hubSites.some((h) => h.owner === owner && h.x === x && h.y === y)
        if (!found && !known) this.needs.hubSites.push({owner, x, y})
        return found
    }

    groupParticipants(groupId: string): readonly string[] | undefined {
        const found = this.input.groupParticipants?.get(groupId)
        if (!found && !this.needs.groups.includes(groupId)) this.needs.groups.push(groupId)
        return found
    }

    get missing(): boolean {
        const n = this.needs
        return n.entities.length + n.hubs.length + n.groups.length + n.hubSites.length > 0
    }
}

function sameSite(a: Coordinates, b: Coordinates): boolean {
    return a.x.toString() === b.x.toString() && a.y.toString() === b.y.toString()
}

function withTasks(lane: Lane, tasks: Task[]): Lane {
    const sched = Object.assign(
        Object.create(Object.getPrototypeOf(lane.schedule)),
        lane.schedule,
        {
            tasks,
        }
    )
    return Object.assign(Object.create(Object.getPrototypeOf(lane)), lane, {
        schedule: sched,
    })
}

function withRow(entity: EntityInfo, over: {lanes?: Lane[]; cargomass?: number}): EntityInfo {
    const copy = Object.assign(Object.create(Object.getPrototypeOf(entity)), entity) as EntityInfo
    if (over.lanes) copy.lanes = over.lanes
    if (over.cargomass !== undefined) {
        ;(copy as unknown as {cargomass: number}).cargomass = over.cargomass
    }
    return copy
}

function capacityOf(entity: EntityInfo): number {
    return entity.capacity ? entity.capacity.toNumber() : 0
}

function popTrailingIdles(tasks: Task[]): void {
    while (tasks.length > 0 && tasks[tasks.length - 1].type.equals(TaskType.IDLE)) tasks.pop()
}

function cargoEqual(a: readonly CargoItem[], b: readonly CargoItem[]): boolean {
    if (a.length !== b.length) return false
    return a.every((item, i) => item.equals(b[i]))
}

interface PairedLaunchCancel {
    target: EntityRef
    holdId: string
    cargo: CargoItem[]
}

// Mirrors remove_paired_launch in cancel.cpp; 'not-tail' is the contract's paired-flight assert.
function remove_paired_launch(
    lanes: Lane[],
    startsAtMs: number,
    target: EntityRef,
    cargo: readonly CargoItem[]
): PairedLaunchCancel | 'not-tail' | undefined {
    for (let li = 0; li < lanes.length; li++) {
        const l = lanes[li]
        const key = l.lane_key.toNumber()
        if (key < FLIGHT_LANE_BASE || key >= FLIGHT_LANE_BASE + FLIGHT_LANE_CAP) continue
        let taskStartsAt = l.schedule.started.toDate().getTime()
        const tasks = l.schedule.tasks
        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i]
            if (
                t.type.equals(TaskType.LAUNCH) &&
                taskStartsAt === startsAtMs &&
                t.couplings.length === 1 &&
                t.couplings[0].counterpart.equals(target) &&
                cargoEqual(t.cargo, cargo)
            ) {
                if (i + 1 !== tasks.length) return 'not-tail'
                const paired = {
                    target: t.couplings[0].counterpart,
                    holdId: t.couplings[0].hold.toString(),
                    cargo: t.cargo,
                }
                const kept = tasks.slice(0, i)
                popTrailingIdles(kept)
                lanes[li] = withTasks(l, kept)
                return paired
            }
            taskStartsAt += t.duration.toNumber() * 1000
        }
    }
    return undefined
}

// Mirrors server::incoming_fits: projected peak plus every incoming hold's mass stays within capacity.
function incoming_fits(row: EntityInfo, at: Date, addMass: number, capacity: number): boolean {
    return projectedPeakCargomass(row, at, addMass + incomingHoldMass(row.holds)) <= capacity
}

// Mirrors cargo_return_refusal in cancel.cpp.
function cargo_return_refusal(
    row: EntityInfo,
    mass: number,
    capacity: number,
    now: Date
): CancelBlockReason | undefined {
    if (schedule.hasPendingCapper(row)) return CancelBlockReason.GIVER_CAPPED
    if (!incoming_fits(row, now, mass, capacity)) return CancelBlockReason.WOULD_OVERFILL
    return undefined
}

// Mirrors group_tail_lane_key in cancel.cpp.
function group_tail_lane_key(lanes: readonly Lane[], groupId: string): number | undefined {
    for (const l of lanes) {
        const tasks = l.schedule.tasks
        if (tasks.length === 0) continue
        const tail = tasks[tasks.length - 1]
        if (tail.entitygroup !== undefined && tail.entitygroup.toString() === groupId)
            return l.lane_key.toNumber()
    }
    return undefined
}

// Mirrors lane_tail_group in cancel.cpp.
function lane_tail_group(lanes: readonly Lane[], laneKey: number): string | undefined {
    for (const l of lanes) {
        if (!l.lane_key.equals(laneKey) || l.schedule.tasks.length === 0) continue
        return l.schedule.tasks[l.schedule.tasks.length - 1].entitygroup?.toString()
    }
    return undefined
}

function lanesReferenceGroup(lanes: readonly Lane[], groupId: string): boolean {
    return lanes.some((l) => l.schedule.tasks.some((t) => t.entitygroup?.toString() === groupId))
}

function consumersFed(
    row: EntityInfo,
    pending: readonly schedule.OrderedTask[],
    incoming: readonly IncomingSource[]
): boolean {
    const base = new Map<string, number>()
    for (const c of row.cargo ?? []) {
        const k = cargoKey(c as unknown as CargoItem)
        base.set(k, (base.get(k) ?? 0) + c.quantity.toNumber())
    }
    for (const self of pending) {
        if (!isConsumerTask(self.task.type.toNumber())) continue
        const at = self.completesAt.getTime()
        const map = new Map(base)
        const credit = (item: CargoItem) =>
            map.set(cargoKey(item), (map.get(cargoKey(item)) ?? 0) + item.quantity.toNumber())
        for (const other of pending) {
            if (other.completesAt.getTime() >= at) continue
            for (const out of taskCargoEffect(other.task).added) credit(out)
        }
        for (const src of incoming) {
            if (src.until.getTime() >= at) continue
            for (const item of src.items) credit(item)
        }
        for (const other of pending) {
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
    return true
}

// Mirrors post_cancel_queue_feasible in cancel.cpp; a check whose data is missing is skipped and recorded as a need.
function post_cancel_queue_feasible(
    ctx: CancelContext,
    row: EntityInfo,
    lanes: Lane[],
    excludedHoldIds: readonly string[] = []
): boolean {
    const probe = withRow(row, {lanes})
    const pending = schedule.unappliedTasks(probe)

    if (pending.some((p) => isConsumerTask(p.task.type.toNumber()))) {
        let complete = true
        const incoming = incomingSources(
            row,
            (id) => {
                const found = ctx.entity(id)
                if (!found) complete = false
                return found
            },
            excludedHoldIds
        )
        if (complete && !consumersFed(row, pending, incoming)) return false
    }

    if (!incoming_fits(probe, new Date(0), 0, capacityOf(row))) return false

    let pos: Coordinates = row.coordinates
    for (const p of pending) {
        const at = p.task.coordinates
        if (at === undefined) continue
        if (isMobilityTask(p.task.type.toNumber())) pos = at
        else if (!sameSite(at, pos)) return false
    }

    const positionAt = (atMs: number): Coordinates => {
        let at: Coordinates = row.coordinates
        for (const p of pending) {
            if (p.completesAt.getTime() > atMs) break
            if (isMobilityTask(p.task.type.toNumber()) && p.task.coordinates !== undefined)
                at = p.task.coordinates
        }
        return at
    }

    const selfId = row.id.toString()
    for (const h of row.holds ?? []) {
        if (!CO_LOCATED_HOLD_KINDS.has(h.kind.toNumber())) continue
        const holdId = h.id.toString()
        if (excludedHoldIds.includes(holdId)) continue
        const cp = ctx.entity(h.counterpart.entity_id.toString())
        if (!cp) continue
        let site: Coordinates | undefined
        search: for (const l of cp.lanes ?? []) {
            for (const t of l.schedule.tasks) {
                for (const c of t.couplings) {
                    if (
                        c.hold.toString() === holdId &&
                        c.counterpart.entity_id.toString() === selfId
                    ) {
                        site = t.coordinates
                        break
                    }
                }
                if (site) break search
            }
        }
        if (!site) site = projectEntity(cp as unknown as Projectable).location
        if (!sameSite(positionAt(h.until.toDate().getTime()), site)) return false
    }

    if (!energyDrawsFunded(probe as unknown as Projectable, row.energy ? row.energy.toNumber() : 0))
        return false

    for (const l of lanes) {
        const capper = l.schedule.tasks.find((t) => schedule.isCapperTaskType(t.type.toNumber()))
        if (!capper) continue
        const targetSideOnly = capper.type.equals(TaskType.UNDEPLOY)
        const applies =
            !targetSideOnly ||
            (capper.subject !== undefined && capper.subject.entity_id.toString() === selfId)
        if (applies) {
            const end = projectEntity(probe as unknown as Projectable)
            if (end.cargo.some((c) => Number(c.quantity.toString()) > 0)) return false
        }
        break
    }

    return true
}

interface ImplResult {
    refusal?: Refusal
    effects: CancelEffects
}

function sortIds(ids: string[]): string[] {
    return ids.sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0))
}

// Mirrors cancel_entity_impl in cancel.cpp.
function cancel_entity_impl(
    ctx: CancelContext,
    entity: EntityInfo,
    laneKey: number,
    count: number
): ImplResult {
    const effects: CancelEffects = {
        refunds: [],
        releasedHolds: [],
        abandonsRunning: false,
    }
    const refuse = (reason: CancelBlockReason, counterpart?: EntityRef): ImplResult => ({
        refusal: {reason, counterpart},
        effects,
    })
    const now = ctx.input.now
    const lane = (entity.lanes ?? []).find((l) => l.lane_key.equals(laneKey))
    if (!lane || lane.schedule.tasks.length === 0) return refuse(CancelBlockReason.NO_LANE)
    const tasks = lane.schedule.tasks
    if (count > tasks.length) return refuse(CancelBlockReason.NO_TASKS)

    const onesided: {
        kind: number
        counterpart: EntityRef
        holdId: string
        cargo: CargoItem[]
    }[] = []
    const clustercrafts: {
        couplings: Task['couplings']
        inputs: CargoItem[]
    }[] = []
    const events: {task: Task; completesAt: number}[] = []
    const startedMs = lane.schedule.started.toDate().getTime()

    for (let i = 0; i < count; i++) {
        const index = tasks.length - 1 - i
        const t = tasks[index]
        const type = t.type.toNumber()
        if (
            type !== TaskType.IDLE &&
            laneTaskComplete(lane.schedule, index, now) &&
            !schedule.isCapperTaskType(type)
        )
            return refuse(CancelBlockReason.DONE)
        if (t.cancelable.equals(TaskCancelable.NEVER) && type !== TaskType.IDLE)
            return refuse(CancelBlockReason.TASK_NEVER)
        if (
            t.cancelable.equals(TaskCancelable.BEFORE_START) &&
            laneTaskInProgress(lane.schedule, index, now)
        )
            return refuse(CancelBlockReason.BEFORE_START_RUNNING)

        let offset = 0
        for (let j = 0; j <= index; j++) offset += tasks[j].duration.toNumber()
        const completesAt = startedMs + offset * 1000

        const clustercraft = type === TaskType.CRAFT && hasSourceCoupling(t)
        const sources: Task['couplings'] = []
        for (const c of t.couplings) {
            if (clustercraft && c.kind.equals(HoldKind.SOURCE)) {
                sources.push(c)
                continue
            }
            onesided.push({
                kind: c.kind.toNumber(),
                counterpart: c.counterpart,
                holdId: c.hold.toString(),
                cargo: t.cargo,
            })
        }
        if (clustercraft)
            clustercrafts.push({
                couplings: sources,
                inputs: t.cargo.slice(0, -1),
            })
        events.push({task: t, completesAt})

        if (
            laneTaskInProgress(lane.schedule, index, now) &&
            t.cancelable.equals(TaskCancelable.ALWAYS)
        )
            effects.abandonsRunning = true
        if (t.energy_cost && t.energy_cost.toNumber() > 0)
            effects.energyForfeited = (effects.energyForfeited ?? 0) + t.energy_cost.toNumber()
        if (t.type.equals(TaskType.BUILDPLOT) && t.couplings.length > 0)
            effects.keepsPlotDeposits = {plot: t.couplings[0].counterpart}
        for (const c of t.couplings) {
            effects.releasedHolds.push({
                counterpart: c.counterpart,
                kind: c.kind.toNumber(),
            })
            if (c.kind.equals(HoldKind.PULL))
                effects.refunds.push({giver: c.counterpart, cargo: t.cargo})
        }
    }

    const working = (entity.lanes ?? []).slice()
    const targetIndex = working.indexOf(lane)
    const kept = tasks.slice(0, tasks.length - count)
    popTrailingIdles(kept)
    working[targetIndex] = withTasks(lane, kept)

    const paired: PairedLaunchCancel[] = []
    for (const ev of events) {
        if (!ev.task.type.equals(TaskType.CHARGE)) continue
        if (!ev.task.subject || ev.task.cargo.length === 0)
            return refuse(CancelBlockReason.INCONSISTENT)
        const found = remove_paired_launch(working, ev.completesAt, ev.task.subject, ev.task.cargo)
        if (!found || found === 'not-tail') return refuse(CancelBlockReason.INCONSISTENT)
        paired.push(found)
    }

    if (!post_cancel_queue_feasible(ctx, entity, working))
        return refuse(CancelBlockReason.WOULD_STRAND)

    const released = new Map<string, {ref: EntityRef; holdIds: string[]}>()
    const release = (ref: EntityRef, holdId: string) => {
        const id = ref.entity_id.toString()
        const entry = released.get(id) ?? {ref, holdIds: []}
        entry.holdIds.push(holdId)
        released.set(id, entry)
    }
    for (const oc of onesided)
        if (isIncomingCouplingKind(oc.kind)) release(oc.counterpart, oc.holdId)
    for (const lc of paired) release(lc.target, lc.holdId)
    for (const [id, entry] of released) {
        const cp = ctx.entity(id)
        if (!cp) continue
        if (!post_cancel_queue_feasible(ctx, cp, cp.lanes, entry.holdIds))
            return refuse(CancelBlockReason.WOULD_STRAND_COUNTERPART, entry.ref)
    }

    const massOf = (items: readonly CargoItem[]) =>
        items.reduce((sum, c) => sum + Number(calcCargoItemMass(c)), 0)

    const launchMass = paired.reduce((sum, lc) => sum + massOf(lc.cargo), 0)
    if (launchMass > 0) {
        const probe = withRow(entity, {lanes: working})
        const refusal = cargo_return_refusal(probe, launchMass, capacityOf(entity), now)
        if (refusal) return refuse(refusal)
    }

    const credited = new Map<string, number>()
    for (const oc of onesided) {
        if (oc.kind !== HoldKind.PULL) continue
        const id = oc.counterpart.entity_id.toString()
        const giver = ctx.entity(id)
        if (!giver) continue
        const mass = massOf(oc.cargo)
        const prior = credited.get(id) ?? 0
        const row = withRow(giver, {
            cargomass: giver.cargomass.toNumber() + prior,
        })
        const refusal = cargo_return_refusal(row, mass, capacityOf(giver), now)
        if (refusal) return refuse(refusal, oc.counterpart)
        credited.set(id, prior + mass)
    }

    if (clustercrafts.length > 0) {
        const selfId = entity.id.toString()
        const hubId = ctx.hubAt(entity.owner.toString(), entity.coordinates)
        const cluster = hubId !== undefined ? ctx.cluster(hubId) : undefined
        if (hubId !== undefined && cluster) {
            const memberIds = sortIds([hubId, ...cluster.cells.map((c) => String(c.entity))])
            const storage: {mid: string; member: EntityInfo; capacity: number}[] = []
            let complete = true
            for (const mid of memberIds) {
                const member = ctx.entity(mid)
                if (!member) complete = false
                else if (capacityOf(member) > 0)
                    storage.push({mid, member, capacity: capacityOf(member)})
            }
            if (complete) {
                const placedMass = new Map<string, number>()
                for (const cc of clustercrafts) {
                    const candidates: typeof storage = []
                    for (const c of cc.couplings) {
                        const id = c.counterpart.entity_id.toString()
                        if (candidates.some((x) => x.mid === id)) continue
                        const member = storage.find((x) => x.mid === id)
                        if (member) candidates.push(member)
                    }
                    const origins = candidates.length
                    for (const member of storage) {
                        if (!candidates.slice(0, origins).some((x) => x.mid === member.mid))
                            candidates.push(member)
                    }
                    for (const item of cc.inputs) {
                        const mass = Number(calcCargoItemMass(item))
                        let placed = false
                        for (const {mid, member, capacity} of candidates) {
                            const row = withRow(member, {
                                cargomass: member.cargomass.toNumber() + (placedMass.get(mid) ?? 0),
                            })
                            if (cargo_return_refusal(row, mass, capacity, now)) continue
                            if (mid !== selfId)
                                placedMass.set(mid, (placedMass.get(mid) ?? 0) + mass)
                            placed = true
                            break
                        }
                        if (!placed) return refuse(CancelBlockReason.CLUSTER_FULL)
                    }
                }
            }
        }
    }

    return {effects}
}

function emptyPlan(reason?: CancelBlockReason): CancelPlan {
    return {
        ok: false,
        blockedReason: reason,
        range: {count: 0, taskIndices: []},
        effects: {refunds: [], releasedHolds: [], abandonsRunning: false},
    }
}

// Mirrors server::cancel: the verdict the cancel action gives for cancelling fromTaskIndex through the lane tail.
export function cancelEligibility(
    entity: EntityInfo,
    laneKey: number,
    fromTaskIndex: number,
    input: CancelEligibilityInput
): CancelPlan {
    const lane = (entity.lanes ?? []).find((l) => l.lane_key.equals(laneKey))
    if (!lane || fromTaskIndex < 0 || fromTaskIndex >= lane.schedule.tasks.length) {
        return emptyPlan(lane ? CancelBlockReason.NO_TASKS : CancelBlockReason.NO_LANE)
    }
    const tasks = lane.schedule.tasks
    const taskIndices: number[] = []
    for (let i = fromTaskIndex; i < tasks.length; i++) taskIndices.push(i)
    const range = {count: taskIndices.length, taskIndices}
    const ctx = new CancelContext(input, entity)

    const finish = (result: ImplResult, cascade?: string[]): CancelPlan => {
        if (result.refusal) {
            return {
                ok: false,
                blockedReason: result.refusal.reason,
                blockedByCounterpart: result.refusal.counterpart,
                range,
                effects: {
                    refunds: [],
                    releasedHolds: [],
                    abandonsRunning: false,
                },
            }
        }
        if (ctx.missing) {
            return {
                ok: false,
                blockedReason: CancelBlockReason.NEEDS,
                needs: ctx.needs,
                range,
                effects: {
                    refunds: [],
                    releasedHolds: [],
                    abandonsRunning: false,
                },
            }
        }
        return {
            ok: true,
            range,
            effects: result.effects,
            ...(cascade ? {cascade} : {}),
        }
    }

    if (entity.type.equals('plot')) return {...emptyPlan(CancelBlockReason.PLOT), range}
    if (range.count > 1 && taskIndices.some((i) => tasks[i].entitygroup !== undefined)) {
        return {...emptyPlan(CancelBlockReason.GROUP_IN_RANGE), range}
    }

    const groupId = tasks[tasks.length - 1].entitygroup?.toString()
    if (groupId === undefined) return finish(cancel_entity_impl(ctx, entity, laneKey, range.count))

    const participants = ctx.groupParticipants(groupId)
    if (!participants) return finish({effects: emptyPlan().effects})

    const selfId = entity.id.toString()
    let primary: ImplResult | undefined
    const cascade: string[] = []
    const refuseGroup = (reason: CancelBlockReason, p: EntityInfo) =>
        finish({
            refusal: {
                reason,
                counterpart: ServerContract.Types.entity_ref.from({
                    entity_type: p.type,
                    entity_id: p.id,
                }),
            },
            effects: emptyPlan().effects,
        })
    for (const pid of participants) {
        const p = ctx.entity(pid)
        if (!p) continue
        let participantLane = laneKey
        if (pid !== selfId && lane_tail_group(p.lanes, laneKey) !== groupId) {
            const addressed = p.lanes.find((l) => l.lane_key.equals(laneKey))
            if (addressed?.schedule.tasks.some((t) => t.entitygroup?.toString() === groupId))
                return refuseGroup(CancelBlockReason.GROUP_BELOW_LATER_TASK, p)
            const found = group_tail_lane_key(p.lanes, groupId)
            if (found === undefined) {
                if (lanesReferenceGroup(p.lanes, groupId))
                    return refuseGroup(CancelBlockReason.GROUP_NOT_AT_TAIL, p)
                continue
            }
            participantLane = found
        }
        const result = cancel_entity_impl(ctx, p, participantLane, 1)
        if (result.refusal) return finish(result)
        if (pid === selfId) primary = result
        else cascade.push(pid)
    }
    if (!primary)
        return finish({
            refusal: {reason: CancelBlockReason.INCONSISTENT},
            effects: emptyPlan().effects,
        })
    return finish(primary, cascade)
}
