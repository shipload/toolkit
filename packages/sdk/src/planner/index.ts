import type {GathererStats} from '../types/capabilities'
import type {ServerContract} from '../contracts'
import {
    calc_gather_duration,
    calc_gather_energy,
    GATHER_MASS_DIVISOR,
} from '../capabilities/gathering'
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

// massFactor=1 so plan-time cost is conservative; on-chain recomputes with real mass/richness.
const PLAN_ITEM_MASS = GATHER_MASS_DIVISOR
const PLAN_RICHNESS = 1000

// 'max' ceiling; Phase 3 passes a real reserve/capacity cap instead.
const MAX_PLAN_QTY = 10000

function gatherEnergyCost(
    lane: ServerContract.Types.gatherer_lane,
    quantity: number,
    stratum: number
): number {
    const stats = lane as unknown as GathererStats
    const dur = Number(
        calc_gather_duration(stats, PLAN_ITEM_MASS, quantity, stratum, PLAN_RICHNESS)
    )
    return Number(calc_gather_energy(stats, dur))
}

function allocateProportional(
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

export function planParallelGather(
    entity: GatherPlanEntity,
    target: PlanTarget,
    stratum: number,
    now: Date
): LanePlanEntry[] {
    const reaching = entity.gatherer_lanes.filter((l) => l.depth.toNumber() >= stratum)
    if (reaching.length === 0) throw new Error('no gatherer reaches this stratum')

    // Projected energy nets out already-queued/in-flight task costs (contract projected_energy()).
    const energy = entity.generator ? Number(projectRemainingAt(entity, now).energy) : Infinity

    const requestedQty = target === 'max' ? MAX_PLAN_QTY : (target as {quantity: number}).quantity

    // Ascending by yield so slice(1) sheds the lowest-yield lane first when energy-starved.
    let activeLanes = reaching.slice().sort((a, b) => a.yield.toNumber() - b.yield.toNumber())

    while (activeLanes.length > 0) {
        const laneWeights = activeLanes.map((l) => ({
            slot: l.slot_index.toNumber(),
            weight: l.yield.toNumber(),
        }))

        const proposed = allocateProportional(laneWeights, requestedQty)

        const totalEnergyCost = proposed.reduce((sum, entry) => {
            const lane = activeLanes.find((l) => l.slot_index.toNumber() === entry.slot)!
            return sum + gatherEnergyCost(lane, entry.quantity, stratum)
        }, 0)

        if (totalEnergyCost <= energy) {
            return proposed.filter((e) => e.quantity > 0)
        }

        if (activeLanes.length === 1) {
            const lane = activeLanes[0]
            const energyPerUnit = gatherEnergyCost(lane, 1, stratum)
            if (energyPerUnit === 0) return proposed.filter((e) => e.quantity > 0)
            const maxQty = Math.min(requestedQty, Math.floor(energy / energyPerUnit))
            if (maxQty <= 0) return []
            return [{slot: lane.slot_index.toNumber(), quantity: maxQty}]
        }

        activeLanes = activeLanes.slice(1)
    }

    return []
}

export function planParallelTransfer(
    entity: GatherPlanEntity,
    target: PlanTarget
): LanePlanEntry[] {
    const lanes = entity.loader_lanes.filter((l) => l.thrust.toNumber() > 0)
    if (lanes.length === 0) return []

    const requestedQty = target === 'max' ? MAX_PLAN_QTY : (target as {quantity: number}).quantity

    const laneWeights = lanes.map((l) => ({
        slot: l.slot_index.toNumber(),
        weight: l.thrust.toNumber(),
    }))

    return allocateProportional(laneWeights, requestedQty).filter((e) => e.quantity > 0)
}
