import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import taskTypes from '../data/task-types.json'
import {getEntityLayout} from '../data/recipes-runtime'
import {decodeStat} from '../derivation/crafting'
import {gathererDepthForTier, computeGathererYield} from '../derivation/capabilities'
import {applySlotMultiplier, getSlotAmp} from '../entities/slot-multiplier'
import {
    computeGathererDrain,
    computeLoaderThrust,
    computeLoaderPayload,
    computeCrafterSpeed,
    computeCrafterDrain,
    computeBuilderSpeed,
    computeBuilderDrain,
} from '../nft/description'
import {TaskType, type ModuleType} from '../types'
import {getLane, LANE_BARRIER, LANE_MOBILITY, type ScheduleData} from './schedule'

type ModuleEntry = ServerContract.Types.module_entry
type Lane = ServerContract.Types.lane
type Schedule = ServerContract.Types.schedule
type Hold = ServerContract.Types.hold

const HOLD_BUILD = 4
const HOLD_UPGRADE = 6
const TASK_TRAITS = new Map(taskTypes.types.map((t) => [t.type, t]))

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
    payload: number
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
    const yieldVal = applySlotMultiplier(computeGathererYield(str, item.tier ?? 1), amp)
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
    const speed = applySlotMultiplier(computeCrafterSpeed(rea, item.tier ?? 1), amp)
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
    const res = decodeStat(stats, 0)
    const fin = decodeStat(stats, 1)
    const layout = getEntityLayout(entityItemId)?.slots ?? []
    const amp = getSlotAmp(layout, idx)
    const speed = applySlotMultiplier(computeBuilderSpeed(res, item.tier ?? 1), amp)
    const drain = computeBuilderDrain(fin)
    return {slotIndex: idx, speed, drain, outputPct: amp}
}

// LANE_MOBILITY or a missing module soft-returns valid=false (never throws); callers check `valid`.
export function resolveLaneLoader(
    modules: ModuleEntry[],
    entityItemId: number,
    laneKey: number
): ResolvedLoaderLane {
    if (laneKey === LANE_MOBILITY) {
        return {slotIndex: -1, thrust: 0, payload: 0, outputPct: 0, valid: false}
    }
    const idx = laneKey - 1
    const installed = idx >= 0 && idx < modules.length ? modules[idx].installed : undefined
    if (!installed) {
        return {slotIndex: idx, thrust: 0, payload: 0, outputPct: 0, valid: false}
    }
    const item = getItem(Number(installed.item_id.value ?? installed.item_id))
    const stats = BigInt(installed.stats.toString())
    const ins = decodeStat(stats, 0)
    const pla = decodeStat(stats, 1)
    const layout = getEntityLayout(entityItemId)?.slots ?? []
    const amp = getSlotAmp(layout, idx)
    const thrust = Math.max(1, applySlotMultiplier(computeLoaderThrust(pla, item.tier ?? 1), amp))
    const payload = computeLoaderPayload(ins)
    return {slotIndex: idx, thrust, payload, outputPct: amp, valid: true}
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

function maxHoldUntil(holds: Hold[], rechargeBlockingOnly: boolean): number {
    let latest = 0
    for (const h of holds) {
        const kind = Number(h.kind)
        if (rechargeBlockingOnly && kind !== HOLD_BUILD && kind !== HOLD_UPGRADE) continue
        latest = Math.max(latest, h.until.toDate().getTime())
    }
    return latest
}

function taskBarrier(entity: ScheduleData, taskType: number, laneKey: number): number {
    const lanes = entity.lanes ?? []
    const holds = entity.holds ?? []
    const isRecharge = taskType === TaskType.RECHARGE
    if (isRecharge || laneKey === LANE_BARRIER) {
        const lanesEnd = lanes.reduce(
            (latest, l) => Math.max(latest, rawScheduleEnd(l.schedule).getTime()),
            0
        )
        return Math.max(lanesEnd, maxHoldUntil(holds, isRecharge))
    }
    const traits = TASK_TRAITS.get(taskType)
    const afterMoves = traits?.positionBound ?? false
    const afterBound = traits?.mobility ?? false
    let barrier = 0
    for (const l of lanes) {
        let completesAt = l.schedule.started.toDate().getTime()
        for (const t of l.schedule.tasks) {
            completesAt += t.duration.toNumber() * 1000
            if (completesAt <= barrier) continue
            const type = Number(t.type)
            if (type === TaskType.RECHARGE) {
                barrier = completesAt
                continue
            }
            const pending = TASK_TRAITS.get(type)
            const bindsPosition =
                (pending?.positionBound ?? false) ||
                (type === TaskType.CRAFT && t.coordinates !== undefined && t.coordinates !== null)
            if ((afterMoves && pending?.mobility) || (afterBound && bindsPosition)) {
                barrier = completesAt
            }
        }
    }
    return afterBound ? Math.max(barrier, maxHoldUntil(holds, false)) : barrier
}

export function placedStart(
    entity: ScheduleData,
    taskType: number,
    laneKey: number,
    now: Date,
    minStart?: Date
): Date {
    const blockSecond = Math.floor(now.getTime() / 1000) * 1000
    const earliest = Math.max(
        taskBarrier(entity, taskType, laneKey),
        minStart?.getTime() ?? 0,
        blockSecond
    )
    const lane = getLane(entity, laneKey)
    const laneEnd = lane ? rawScheduleEnd(lane.schedule).getTime() : blockSecond
    if (earliest <= laneEnd) return new Date(laneEnd)
    return new Date(laneEnd + Math.ceil((earliest - laneEnd) / 1000) * 1000)
}
