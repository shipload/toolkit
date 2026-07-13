import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {getEntityLayout} from '../data/recipes-runtime'
import {decodeStat} from '../derivation/crafting'
import {gathererDepthForTier} from '../derivation/capabilities'
import {applySlotMultiplier, getSlotAmp} from '../entities/slot-multiplier'
import {
    computeGathererYield,
    computeGathererDrain,
    computeLoaderThrust,
    computeLoaderMass,
    computeCrafterSpeed,
    computeCrafterDrain,
    computeBuilderSpeed,
    computeBuilderDrain,
} from '../nft/description'
import type {ModuleType} from '../types'
import {getLane, LANE_MOBILITY, type ScheduleData} from './schedule'

type ModuleEntry = ServerContract.Types.module_entry
type Lane = ServerContract.Types.lane
type Schedule = ServerContract.Types.schedule

export interface ResolvedGathererLane {
    slotIndex: number
    yield: number
    drain: number
    depth: number
    outputPct: number
}

export interface ResolvedBuilderLane {
    slotIndex: number
    speed: number
    drain: number
    outputPct: number
}

export interface ResolvedCrafterLane {
    slotIndex: number
    speed: number
    drain: number
    outputPct: number
}

export interface ResolvedLoaderLane {
    slotIndex: number
    thrust: number
    mass: number
    outputPct: number
    valid: boolean
}

export function laneKeyForModule(slotIndex: number): number {
    return slotIndex + 1
}

function laneIsFree(lanes: Lane[], laneKey: number): boolean {
    const lane = lanes.find((entry) => entry.lane_key.toNumber() === laneKey)
    return lane ? lane.schedule.tasks.length === 0 : true
}

export function resolveLaneGatherer(
    modules: ModuleEntry[],
    entityItemId: number,
    laneKey: number
): ResolvedGathererLane {
    const idx = laneKey - 1
    const installed = idx >= 0 && idx < modules.length ? modules[idx].installed : undefined
    if (!installed) throw new Error('gatherer lane has no module')
    const item = getItem(Number(installed.item_id.value ?? installed.item_id))
    if (item.moduleType !== 'gatherer') throw new Error('lane module is not a gatherer')
    const stats = BigInt(installed.stats.toString())
    const str = decodeStat(stats, 0)
    const tol = decodeStat(stats, 1)
    const con = decodeStat(stats, 2)
    const layout = getEntityLayout(entityItemId)?.slots ?? []
    const amp = getSlotAmp(layout, idx)
    const yieldVal = applySlotMultiplier(computeGathererYield(str), amp)
    const drain = computeGathererDrain(con)
    const depth = gathererDepthForTier(tol, item.tier ?? 1)
    return {slotIndex: idx, yield: yieldVal, drain, depth, outputPct: amp}
}

// Encapsulates the gather handler's lane selection (gathering.cpp:108-112): both error paths.
export function selectGatherLane(
    modules: ModuleEntry[],
    entityItemId: number,
    lanes: Lane[],
    stratum: number,
    explicitSlot?: number
): number {
    if (explicitSlot !== undefined) {
        const laneKey = laneKeyForModule(explicitSlot)
        const lane = resolveLaneGatherer(modules, entityItemId, laneKey)
        if (stratum > lane.depth) throw new Error('stratum exceeds gatherer depth')
        return laneKey
    }
    return workerLaneKey(modules, 'gatherer', lanes, stratum)
}

export function resolveLaneCrafter(
    modules: ModuleEntry[],
    entityItemId: number,
    laneKey: number
): ResolvedCrafterLane {
    const idx = laneKey - 1
    const installed = idx >= 0 && idx < modules.length ? modules[idx].installed : undefined
    if (!installed) throw new Error('crafter lane has no module')
    const item = getItem(Number(installed.item_id.value ?? installed.item_id))
    if (item.moduleType !== 'crafter') throw new Error('lane module is not a crafter')
    const stats = BigInt(installed.stats.toString())
    const rea = decodeStat(stats, 0)
    const fin = decodeStat(stats, 1)
    const layout = getEntityLayout(entityItemId)?.slots ?? []
    const amp = getSlotAmp(layout, idx)
    const speed = applySlotMultiplier(computeCrafterSpeed(rea), amp)
    const drain = computeCrafterDrain(fin)
    return {slotIndex: idx, speed, drain, outputPct: amp}
}

export function resolveLaneBuilder(
    modules: ModuleEntry[],
    entityItemId: number,
    laneKey: number
): ResolvedBuilderLane {
    const idx = laneKey - 1
    const installed = idx >= 0 && idx < modules.length ? modules[idx].installed : undefined
    if (!installed) throw new Error('builder lane has no module')
    const item = getItem(Number(installed.item_id.value ?? installed.item_id))
    if (item.moduleType !== 'builder') throw new Error('lane module is not a builder')
    const stats = BigInt(installed.stats.toString())
    const coh = decodeStat(stats, 0)
    const tol = decodeStat(stats, 1)
    const layout = getEntityLayout(entityItemId)?.slots ?? []
    const amp = getSlotAmp(layout, idx)
    const speed = applySlotMultiplier(computeBuilderSpeed(coh), amp)
    const drain = computeBuilderDrain(tol)
    return {slotIndex: idx, speed, drain, outputPct: amp}
}

// LANE_MOBILITY or a missing module soft-returns valid=false (never throws); callers check `valid`.
export function resolveLaneLoader(
    modules: ModuleEntry[],
    entityItemId: number,
    laneKey: number
): ResolvedLoaderLane {
    if (laneKey === LANE_MOBILITY) {
        return {slotIndex: -1, thrust: 0, mass: 0, outputPct: 0, valid: false}
    }
    const idx = laneKey - 1
    const installed = idx >= 0 && idx < modules.length ? modules[idx].installed : undefined
    if (!installed) {
        return {slotIndex: idx, thrust: 0, mass: 0, outputPct: 0, valid: false}
    }
    const stats = BigInt(installed.stats.toString())
    const ins = decodeStat(stats, 0)
    const pla = decodeStat(stats, 1)
    const layout = getEntityLayout(entityItemId)?.slots ?? []
    const amp = getSlotAmp(layout, idx)
    const thrust = applySlotMultiplier(computeLoaderThrust(pla), amp)
    const mass = computeLoaderMass(ins)
    return {slotIndex: idx, thrust, mass, outputPct: amp, valid: true}
}

export function workerLaneKey(
    modules: ModuleEntry[],
    moduleSubtype: ModuleType,
    lanes: Lane[],
    stratum?: number
): number {
    if (moduleSubtype === 'gatherer' && stratum !== undefined) {
        let lowestReaching: number | undefined
        for (let i = 0; i < modules.length; i++) {
            const installed = modules[i].installed
            if (!installed) continue
            const item = getItem(Number(installed.item_id.value ?? installed.item_id))
            if (item.moduleType !== 'gatherer') continue
            const stats = BigInt(installed.stats.toString())
            const tol = decodeStat(stats, 1)
            const depth = gathererDepthForTier(tol, item.tier ?? 1)
            if (depth < stratum) continue
            const laneKey = laneKeyForModule(i)
            if (lowestReaching === undefined) lowestReaching = laneKey
            if (laneIsFree(lanes, laneKey)) return laneKey
        }
        if (lowestReaching === undefined) throw new Error('no gatherer reaches this stratum')
        return lowestReaching
    }

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
