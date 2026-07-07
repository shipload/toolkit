import type {GathererStats} from '../types/capabilities'
import type {ServerContract} from '../contracts'
import {calc_gather_duration, calc_gather_energy} from '../capabilities/gathering'
import {calc_rechargetime} from '../travel/travel'
import {projectRemainingAt, type Projectable} from '../scheduling/projection'

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

export type FillCap = 'reserve' | 'hold' | 'requested'

export interface GatherPlan {
    cycles: GatherCycle[]
    cycleCount: number
    totalOre: number
    totalSeconds: number
    cap: FillCap
    reachingCount: number
    totalLimpets: number
    warnings: string[]
}

export interface BuildGatherPlanOpts {
    richness: number
    itemMass: number
    holdRoom: number
    reserveRemaining: number
    now: Date
}

const MAX_CYCLES = 10_000

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
    let energy = Number(projectRemainingAt(entity, now).energy)

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

    const cycles: GatherCycle[] = []
    let remaining = fillTarget
    let guard = 0
    while (remaining > 0 && guard++ < MAX_CYCLES) {
        const batch = maxQtyForCharge(reaching, remaining, capacity, stratum, itemMass, richness)
        if (batch <= 0) {
            warnings.push('a single gather cannot fit within one full charge')
            break
        }

        const costFull = splitCost(reaching, batch, stratum, itemMass, richness)
        const rechargeBefore = energy < costFull
        const rechargeSeconds = rechargeBefore
            ? Number(calc_rechargetime(capacity, energy, rechargeRate))
            : 0
        if (rechargeBefore) energy = capacity

        const weights = reaching.map((l) => ({
            slot: l.slot_index.toNumber(),
            weight: l.yield.toNumber(),
        }))
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
        energy = Math.max(0, energy - actualCost)

        const gatherSeconds = limpets.reduce((m, l) => Math.max(m, l.durationSeconds), 0)
        cycles.push({rechargeBefore, rechargeSeconds, limpets, gatherSeconds, batchOre: batch})
        remaining -= batch
    }

    const totalOre = cycles.reduce((s, c) => s + c.batchOre, 0)
    const totalSeconds = cycles.reduce((s, c) => s + c.rechargeSeconds + c.gatherSeconds, 0)
    return {
        cycles,
        cycleCount: cycles.length,
        totalOre,
        totalSeconds,
        cap,
        reachingCount: reaching.length,
        totalLimpets: entity.gatherer_lanes.length,
        warnings,
    }
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
