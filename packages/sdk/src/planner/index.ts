import type {GathererStats} from '../types/capabilities'
import type {ServerContract} from '../contracts'
import {calc_gather_duration, calc_gather_energy} from '../capabilities/gathering'
import {calc_rechargetime} from '../travel/travel'
import {projectRemainingAt, type Projectable} from '../scheduling/projection'
import {laneKeyForModule, placedStart, selectGatherLane} from '../scheduling/lanes'
import {LANE_BARRIER} from '../scheduling/schedule'
import {TaskType} from '../types'

export type GatherLane = ServerContract.Types.gatherer_lane

export interface LanePlanEntry {
    slot: number
    quantity: number
}

export type PlanTarget = {quantity: number} | 'max'

export interface GatherPlanEntity extends Projectable {
    gatherer_lanes: ServerContract.Types.gatherer_lane[]
    loader_lanes: ServerContract.Types.loader_lane[]
}

export interface GatherLimpet {
    slot: number
    quantity: number
    durationSeconds: number
}

export interface GatherCycle {
    rechargeBefore: boolean
    rechargeSeconds: number
    limpets: GatherLimpet[]
    gatherSeconds: number
    batchOre: number
}

export type FillCap = 'reserve' | 'hold' | 'requested' | 'horizon'

export interface GatherPlan {
    cycles: GatherCycle[]
    cycleCount: number
    totalOre: number
    totalSeconds: number
    cap: FillCap
    reachingCount: number
    totalLimpets: number
    warnings: string[]
    endEnergy: number
}

export interface BuildGatherPlanOpts {
    richness: number
    itemMass: number
    holdRoom: number
    reserveRemaining: number
    now: Date
    startEnergy?: number
    epochtime?: number
}

export interface GatherSink {
    id: string
    holdRoom: number
}

export interface GatherAllocation {
    id: string
    quantity: number
    plan: GatherPlan
}

export interface MultiGatherPlan extends GatherPlan {
    allocations: GatherAllocation[]
}

const MAX_CYCLES = 10_000

interface GatherClock {
    horizonMs: number
    lanes: Map<number, number>
    allEndMs: number
}

function startClock(
    entity: GatherPlanEntity,
    reaching: ServerContract.Types.gatherer_lane[],
    now: Date,
    epochtime: number
): GatherClock {
    const lanes = new Map<number, number>()
    for (const l of reaching) {
        const slot = l.slot_index.toNumber()
        lanes.set(slot, placedStart(entity, TaskType.GATHER, laneKeyForModule(slot), now).getTime())
    }
    return {
        horizonMs: now.getTime() + epochtime * 1000,
        lanes,
        allEndMs: placedStart(entity, TaskType.RECHARGE, LANE_BARRIER, now).getTime(),
    }
}

function advanceClock(clock: GatherClock, cycle: GatherCycle): GatherClock {
    const lanes = new Map(clock.lanes)
    let allEndMs = clock.allEndMs
    if (cycle.rechargeBefore) {
        const start = Math.max(allEndMs, ...lanes.values())
        allEndMs = start + cycle.rechargeSeconds * 1000
        for (const slot of lanes.keys()) lanes.set(slot, Math.max(lanes.get(slot)!, allEndMs))
    }
    for (const limpet of cycle.limpets) {
        const end = lanes.get(limpet.slot)! + limpet.durationSeconds * 1000
        lanes.set(limpet.slot, end)
        allEndMs = Math.max(allEndMs, end)
    }
    return {horizonMs: clock.horizonMs, lanes, allEndMs}
}

function withinHorizon(clock: GatherClock, cycle: GatherCycle): boolean {
    const next = advanceClock(clock, cycle)
    return cycle.limpets.every((l) => next.lanes.get(l.slot)! <= clock.horizonMs)
}

const MAX_TRANSFER_QTY = 10000

export function allocateProportional(
    lanes: {slot: number; weight: number}[],
    total: number
): LanePlanEntry[] {
    if (lanes.length === 0) return []
    const weightSum = lanes.reduce((s, l) => s + l.weight, 0)
    if (weightSum === 0) return []

    const entries: LanePlanEntry[] = lanes.map((l) => ({
        slot: l.slot,
        quantity: Math.floor((total * l.weight) / weightSum),
    }))

    let remainder = total - entries.reduce((s, e) => s + e.quantity, 0)
    for (let i = 0; remainder > 0; i = (i + 1) % entries.length) {
        entries[i].quantity++
        remainder--
    }

    return entries
}

function laneStats(lane: ServerContract.Types.gatherer_lane): GathererStats {
    return lane as unknown as GathererStats
}

export function gatherEnergyCost(
    lane: ServerContract.Types.gatherer_lane,
    quantity: number,
    stratum: number,
    itemMass: number,
    richness: number
): number {
    if (quantity <= 0) return 0
    const dur = Number(calc_gather_duration(laneStats(lane), itemMass, quantity, stratum, richness))
    return Number(calc_gather_energy(laneStats(lane), dur))
}

export function splitCost(
    reaching: ServerContract.Types.gatherer_lane[],
    quantity: number,
    stratum: number,
    itemMass: number,
    richness: number
): number {
    if (quantity <= 0) return 0
    const weights = reaching.map((l) => ({
        slot: l.slot_index.toNumber(),
        weight: l.yield.toNumber(),
    }))
    const split = allocateProportional(weights, quantity)
    return split.reduce((sum, e) => {
        const lane = reaching.find((l) => l.slot_index.toNumber() === e.slot)!
        return sum + gatherEnergyCost(lane, e.quantity, stratum, itemMass, richness)
    }, 0)
}

// Binary search is exact because splitCost is monotonic non-decreasing in Q.
export function maxQtyForCharge(
    reaching: ServerContract.Types.gatherer_lane[],
    hi: number,
    capacity: number,
    stratum: number,
    itemMass: number,
    richness: number
): number {
    if (hi <= 0) return 0
    if (splitCost(reaching, hi, stratum, itemMass, richness) <= capacity) return hi
    let lo = 0
    let high = hi
    while (lo < high) {
        const mid = Math.ceil((lo + high) / 2)
        if (splitCost(reaching, mid, stratum, itemMass, richness) <= capacity) lo = mid
        else high = mid - 1
    }
    return lo
}

export function buildGatherPlan(
    entity: GatherPlanEntity,
    stratum: number,
    target: PlanTarget,
    opts: BuildGatherPlanOpts
): GatherPlan {
    return planGather(entity, stratum, target, opts).plan
}

function planGather(
    entity: GatherPlanEntity,
    stratum: number,
    target: PlanTarget,
    opts: BuildGatherPlanOpts,
    startingClock?: GatherClock
): {plan: GatherPlan; clock?: GatherClock} {
    const {richness, itemMass, holdRoom, reserveRemaining, now} = opts
    const warnings: string[] = []

    const reaching = entity.gatherer_lanes.filter((l) => l.depth.toNumber() >= stratum)
    if (reaching.length === 0) throw new Error('no gatherer reaches this stratum')
    if (!entity.generator) throw new Error('entity has no generator')

    const blocked = entity.gatherer_lanes.length - reaching.length
    if (blocked > 0) {
        warnings.push(
            `${blocked} of ${entity.gatherer_lanes.length} limpets can't reach this depth`
        )
    }

    const capacity = entity.generator.capacity.toNumber()
    const rechargeRate = entity.generator.recharge.toNumber()
    let energy = opts.startEnergy ?? Number(projectRemainingAt(entity, now).energy)
    let clock =
        startingClock ??
        (opts.epochtime !== undefined
            ? startClock(entity, reaching, now, opts.epochtime)
            : undefined)

    const requested = target === 'max' ? Infinity : target.quantity
    let fillTarget = requested
    let cap: FillCap = 'requested'
    if (holdRoom < fillTarget) {
        fillTarget = holdRoom
        cap = 'hold'
    }
    if (reserveRemaining < fillTarget) {
        fillTarget = reserveRemaining
        cap = 'reserve'
    }
    fillTarget = Math.max(0, Math.floor(fillTarget))

    const weights = reaching.map((l) => ({
        slot: l.slot_index.toNumber(),
        weight: l.yield.toNumber(),
    }))
    const buildCycle = (batch: number): {cycle: GatherCycle; energyAfter: number} => {
        const costFull = splitCost(reaching, batch, stratum, itemMass, richness)
        const rechargeBefore = energy < costFull
        const rechargeSeconds = rechargeBefore
            ? Number(calc_rechargetime(capacity, energy, rechargeRate))
            : 0
        const split = allocateProportional(weights, batch).filter((e) => e.quantity > 0)
        const limpets: GatherLimpet[] = split.map((e) => {
            const lane = reaching.find((l) => l.slot_index.toNumber() === e.slot)!
            const dur = Number(
                calc_gather_duration(laneStats(lane), itemMass, e.quantity, stratum, richness)
            )
            return {slot: e.slot, quantity: e.quantity, durationSeconds: dur}
        })
        const actualCost = limpets.reduce((sum, l) => {
            const lane = reaching.find((r) => r.slot_index.toNumber() === l.slot)!
            return sum + Number(calc_gather_energy(laneStats(lane), l.durationSeconds))
        }, 0)
        const gatherSeconds = limpets.reduce((m, l) => Math.max(m, l.durationSeconds), 0)
        return {
            cycle: {rechargeBefore, rechargeSeconds, limpets, gatherSeconds, batchOre: batch},
            energyAfter: Math.max(0, (rechargeBefore ? capacity : energy) - actualCost),
        }
    }

    const cycles: GatherCycle[] = []
    let remaining = fillTarget
    let guard = 0
    while (remaining > 0 && guard++ < MAX_CYCLES) {
        let batch = maxQtyForCharge(reaching, remaining, capacity, stratum, itemMass, richness)
        if (batch <= 0) {
            warnings.push('a single gather cannot fit within one full charge')
            break
        }

        let built = buildCycle(batch)
        if (clock && !withinHorizon(clock, built.cycle)) {
            let lo = 0
            let hi = batch - 1
            while (lo < hi) {
                const mid = Math.ceil((lo + hi) / 2)
                if (withinHorizon(clock, buildCycle(mid).cycle)) lo = mid
                else hi = mid - 1
            }
            cap = 'horizon'
            if (lo === 0) break
            batch = lo
            built = buildCycle(batch)
            remaining = batch
        }

        cycles.push(built.cycle)
        energy = built.energyAfter
        if (clock) clock = advanceClock(clock, built.cycle)
        remaining -= batch
    }

    const totalOre = cycles.reduce((s, c) => s + c.batchOre, 0)
    const totalSeconds = cycles.reduce((s, c) => s + c.rechargeSeconds + c.gatherSeconds, 0)
    return {
        plan: {
            cycles,
            cycleCount: cycles.length,
            totalOre,
            totalSeconds,
            cap,
            reachingCount: reaching.length,
            totalLimpets: entity.gatherer_lanes.length,
            warnings,
            endEnergy: energy,
        },
        clock,
    }
}

export function buildMultiGatherPlan(
    entity: GatherPlanEntity,
    stratum: number,
    target: PlanTarget,
    sinks: GatherSink[],
    opts: Omit<BuildGatherPlanOpts, 'holdRoom'>
): MultiGatherPlan {
    const reaching = entity.gatherer_lanes.filter((l) => l.depth.toNumber() >= stratum)
    if (reaching.length === 0) throw new Error('no gatherer reaches this stratum')
    if (!entity.generator) throw new Error('entity has no generator')

    const totalRoom = sinks.reduce((sum, sink) => sum + Math.max(0, sink.holdRoom), 0)
    const requested = target === 'max' ? Infinity : target.quantity
    let fillTarget = requested
    let cap: FillCap = 'requested'
    if (totalRoom < fillTarget) {
        fillTarget = totalRoom
        cap = 'hold'
    }
    if (opts.reserveRemaining < fillTarget) {
        fillTarget = opts.reserveRemaining
        cap = 'reserve'
    }
    let left = Math.max(0, Math.floor(fillTarget))

    const allocations: GatherAllocation[] = []
    let energy = opts.startEnergy
    let reserve = opts.reserveRemaining
    let clock: GatherClock | undefined
    for (const sink of sinks) {
        const quantity = Math.min(left, Math.max(0, Math.floor(sink.holdRoom)))
        if (quantity <= 0) continue
        const built = planGather(
            entity,
            stratum,
            {quantity},
            {...opts, holdRoom: quantity, reserveRemaining: reserve, startEnergy: energy},
            clock
        )
        const plan = built.plan
        clock = built.clock
        if (plan.cap === 'horizon') cap = 'horizon'
        if (plan.totalOre <= 0) break
        allocations.push({id: sink.id, quantity: plan.totalOre, plan})
        energy = plan.endEnergy
        reserve -= plan.totalOre
        left -= plan.totalOre
        if (plan.cap === 'horizon') break
    }

    const cycles = allocations.flatMap((a) => a.plan.cycles)
    return {
        cycles,
        cycleCount: cycles.length,
        totalOre: allocations.reduce((s, a) => s + a.plan.totalOre, 0),
        totalSeconds: allocations.reduce((s, a) => s + a.plan.totalSeconds, 0),
        cap,
        reachingCount: reaching.length,
        totalLimpets: entity.gatherer_lanes.length,
        warnings: [...new Set(allocations.flatMap((a) => a.plan.warnings))],
        endEnergy: energy ?? Number(projectRemainingAt(entity, opts.now).energy),
        allocations,
    }
}

export interface SingleGatherPlan {
    laneKey: number
    quantity: number
    energyCost: number
    needsRecharge: boolean
}

// None of these are PRECISION-scaled: stratum/itemMass/richness/energy fields are plain units, same as maxQtyForCharge/splitCost.
export interface SingleGatherInput {
    modules: ServerContract.Types.module_entry[]
    entityItemId: number
    lanes: ServerContract.Types.lane[]
    gathererLanes: GatherLane[]
    stratum: number
    desiredQuantity: number
    itemMass: number
    richness: number
    generatorCapacity: number
    currentEnergy: number
}

export function planSingleGather(opts: SingleGatherInput): SingleGatherPlan {
    const {
        modules,
        entityItemId,
        lanes,
        gathererLanes,
        stratum,
        desiredQuantity,
        itemMass,
        richness,
        generatorCapacity,
        currentEnergy,
    } = opts

    const laneKey = selectGatherLane(modules, entityItemId, lanes, stratum)
    const lane = gathererLanes.find((l) => l.slot_index.toNumber() === laneKey - 1)
    if (!lane) throw new Error('gatherer lane not found for selected slot')

    const quantity = maxQtyForCharge(
        [lane],
        desiredQuantity,
        generatorCapacity,
        stratum,
        itemMass,
        richness
    )
    const energyCost = splitCost([lane], quantity, stratum, itemMass, richness)
    return {laneKey, quantity, energyCost, needsRecharge: currentEnergy < energyCost}
}

export function planParallelTransfer(
    entity: GatherPlanEntity,
    target: PlanTarget
): LanePlanEntry[] {
    const lanes = entity.loader_lanes.filter((l) => l.thrust.toNumber() > 0)
    if (lanes.length === 0) return []

    const requestedQty = target === 'max' ? MAX_TRANSFER_QTY : target.quantity

    const laneWeights = lanes.map((l) => ({
        slot: l.slot_index.toNumber(),
        weight: l.thrust.toNumber(),
    }))

    return allocateProportional(laneWeights, requestedQty).filter((e) => e.quantity > 0)
}
