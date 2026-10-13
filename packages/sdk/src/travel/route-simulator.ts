import type {UInt64Type} from '@wharfkit/antelope'
import {HoldKind, PRECISION, TaskType, TRAVEL_MAX_DURATION} from '../types'
import {taskCargoEffect} from '../scheduling/availability'
import {incomingHoldMass} from '../scheduling/unwrap'
import {orderedTasks, type ScheduleData} from '../scheduling/schedule'
import {isMobilityTask, isPositionBoundTask} from '../scheduling/task-effects'
import {
    calc_energyusage,
    calc_group_flighttime,
    calc_rechargetime,
    cargoListMass,
    distanceBetweenPoints,
} from './travel'

export interface CargoEffect {
    atSeconds: number
    delta: number
}

export interface RouteMoverInput {
    ref: {entityType: string; entityId: UInt64Type}
    hasMovement: boolean
    engines?: {thrust: number; drain: number}
    generator?: {capacity: number; recharge: number}
    hauler?: {capacity: number; efficiency: number}
    mass: number
    energy: number
    priorMobilityEnd: number
    narrowBarrierEnd: number
    /** Max end (seconds-from-now) over all this entity's lanes incl. worker/craft; gates recharges like the contract's all_lanes_end. Default 0. */
    allLanesEnd?: number
    /** Queued cargo changes by completion second; a flight departing before one still carries the mass it removes. */
    cargoEffects?: CargoEffect[]
    /** Mass of incoming holds, aboard by departure. */
    incomingMass?: number
}

export interface RouteLegSim {
    from: {x: number; y: number}
    to: {x: number; y: number}
    distanceCells: number
    energyCostByMover: Record<string, number>
    rechargeBefore: boolean
    rechargeSeconds: number
    flightSeconds: number
}

export interface RouteSim {
    legs: RouteLegSim[]
    totalSeconds: number
    reachable: boolean
}

export interface RouteBarriers {
    priorMobilityEnd: number
    narrowBarrierEnd: number
    allLanesEnd: number
    cargoEffects: CargoEffect[]
    incomingMass: number
}

const RECHARGE_BLOCKING_HOLDS: ReadonlySet<number> = new Set<number>([
    HoldKind.BUILD,
    HoldKind.UPGRADE,
])

function secondsFromNow(ms: number, nowMs: number): number {
    return Math.max(0, Math.floor(ms / 1000) - Math.floor(nowMs / 1000))
}

function maxHoldUntilMs(entity: ScheduleData, kinds?: ReadonlySet<number>): number {
    let latest = 0
    for (const h of entity.holds ?? []) {
        if (kinds && !kinds.has(h.kind.toNumber())) continue
        const untilMs = Number(h.until.toMilliseconds())
        if (untilMs > latest) latest = untilMs
    }
    return latest
}

// Mirrors task_barrier in contracts/src/server/include/server/schedule/placement.hpp.
export function routeBarriers(entity: ScheduleData, nowMs: number): RouteBarriers {
    let allLanesEndMs = 0
    let recoverMobilityEndMs = 0
    let recoverPositionEndMs = 0
    const cargoEffects: CargoEffect[] = []

    for (const {task, completesAt} of orderedTasks(entity)) {
        const ms = completesAt.getTime()
        if (ms > allLanesEndMs) allLanesEndMs = ms

        const effect = taskCargoEffect(task)
        const delta = cargoListMass(effect.added) - cargoListMass(effect.removed)
        if (delta !== 0) cargoEffects.push({atSeconds: secondsFromNow(ms, nowMs), delta})

        const type = task.type.toNumber()
        const isRecharge = type === TaskType.RECHARGE
        if (isRecharge || isMobilityTask(type)) {
            if (ms > recoverMobilityEndMs) recoverMobilityEndMs = ms
        }
        if (isRecharge || isPositionBoundTask(type)) {
            if (ms > recoverPositionEndMs) recoverPositionEndMs = ms
        }
    }

    const allHoldUntilMs = maxHoldUntilMs(entity)
    const rechargeHoldUntilMs = maxHoldUntilMs(entity, RECHARGE_BLOCKING_HOLDS)

    return {
        priorMobilityEnd: secondsFromNow(recoverMobilityEndMs, nowMs),
        narrowBarrierEnd: secondsFromNow(Math.max(recoverPositionEndMs, allHoldUntilMs), nowMs),
        allLanesEnd: secondsFromNow(Math.max(allLanesEndMs, rechargeHoldUntilMs), nowMs),
        cargoEffects,
        incomingMass: incomingHoldMass(entity.holds),
    }
}

function stillAboardMass(effects: CargoEffect[] | undefined, departsAt: number): number {
    let late = 0
    for (const e of effects ?? []) if (e.atSeconds > departsAt) late += e.delta
    return Math.max(0, -late)
}

export function simulateRoute(
    movers: RouteMoverInput[],
    waypoints: {x: number; y: number}[],
    origin: {x: number; y: number},
    recharge: boolean
): RouteSim {
    const totalThrust = movers
        .filter((m) => m.hasMovement && m.engines)
        .reduce((sum, m) => sum + m.engines!.thrust, 0)

    const baseMass = movers.reduce((sum, m) => sum + m.mass + (m.incomingMass ?? 0), 0)

    const haulCount = movers.filter((m) => !m.hasMovement).length

    const pooledHaulCap = movers
        .filter((m) => m.hasMovement && m.hauler)
        .reduce((sum, m) => sum + m.hauler!.capacity, 0)

    const weightedHaulEffNum = movers
        .filter((m) => m.hasMovement && m.hauler)
        .reduce((sum, m) => sum + m.hauler!.efficiency * m.hauler!.capacity, 0)

    const energyByMover: Map<string, number> = new Map(
        movers.map((m) => [String(m.ref.entityId), m.energy])
    )

    let reachable = true
    const legs: RouteLegSim[] = []

    const mobilityBarrier = movers.reduce(
        (mx, m) => Math.max(mx, m.priorMobilityEnd, m.narrowBarrierEnd),
        0
    )

    const rechargeFloor = movers
        .filter((m) => m.hasMovement && m.generator)
        .reduce((mx, m) => Math.max(mx, m.allLanesEnd ?? 0), 0)

    let clock = 0

    let from = origin
    for (const to of waypoints) {
        const distance = distanceBetweenPoints(from.x, from.y, to.x, to.y)
        const distanceNum = Number(distance)
        const distanceCells = distanceNum / PRECISION

        const energyCostByMover: Record<string, number> = {}

        for (const m of movers) {
            if (!m.hasMovement || !m.engines) continue
            const key = String(m.ref.entityId)
            energyCostByMover[key] = Number(calc_energyusage(distance, m.engines.drain))
        }

        let rechargeBefore = false
        let rechargeSeconds = 0

        if (recharge) {
            let maxDur = 0
            for (const m of movers) {
                if (!m.hasMovement || !m.generator) continue
                const key = String(m.ref.entityId)
                const curEnergy = energyByMover.get(key) ?? 0
                const dur = Number(
                    calc_rechargetime(m.generator.capacity, curEnergy, m.generator.recharge)
                )
                if (dur > maxDur) maxDur = dur
            }
            rechargeSeconds = maxDur
            rechargeBefore = rechargeSeconds > 0

            if (rechargeBefore) {
                for (const m of movers) {
                    if (!m.hasMovement || !m.generator) continue
                    const key = String(m.ref.entityId)
                    energyByMover.set(key, m.generator.capacity)
                }
                clock = Math.max(clock, rechargeFloor) + rechargeSeconds
            }
        }

        for (const m of movers) {
            if (!m.hasMovement || !m.engines) continue
            const key = String(m.ref.entityId)
            const cost = energyCostByMover[key] ?? 0
            const curEnergy = energyByMover.get(key) ?? 0

            if (recharge && m.generator) {
                if (cost > m.generator.capacity) reachable = false
            } else {
                if (cost > curEnergy) reachable = false
            }
        }

        const departsAt = Math.max(clock, mobilityBarrier)
        const totalMass =
            baseMass +
            movers.reduce((sum, m) => sum + stillAboardMass(m.cargoEffects, departsAt), 0)

        const flightSeconds = Number(
            calc_group_flighttime(
                totalThrust,
                haulCount,
                pooledHaulCap,
                weightedHaulEffNum,
                totalMass,
                distance
            )
        )

        if (flightSeconds > TRAVEL_MAX_DURATION) reachable = false

        for (const m of movers) {
            if (!m.hasMovement || !m.engines) continue
            const key = String(m.ref.entityId)
            const cost = energyCostByMover[key] ?? 0
            const curEnergy = energyByMover.get(key) ?? 0
            energyByMover.set(key, Math.max(0, curEnergy - cost))
        }

        clock = Math.max(clock, mobilityBarrier) + flightSeconds

        legs.push({
            from,
            to,
            distanceCells,
            energyCostByMover,
            rechargeBefore,
            rechargeSeconds,
            flightSeconds,
        })

        from = to
    }

    return {legs, totalSeconds: clock, reachable}
}
