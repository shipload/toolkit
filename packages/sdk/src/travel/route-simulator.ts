import type {UInt64Type} from '@wharfkit/antelope'
import {PRECISION, TRAVEL_MAX_DURATION} from '../types'
import {
    calc_energyusage,
    calc_group_flighttime,
    calc_rechargetime,
    distanceBetweenPoints,
} from './travel'

export interface RouteMoverInput {
    ref: {entityType: string; entityId: UInt64Type}
    hasMovement: boolean
    engines?: {thrust: number; drain: number}
    generator?: {capacity: number; recharge: number}
    hauler?: {capacity: number; drain: number; efficiency: number}
    mass: number
    energy: number
    priorMobilityEnd: number
    narrowBarrierEnd: number
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

export function simulateRoute(
    movers: RouteMoverInput[],
    waypoints: {x: number; y: number}[],
    origin: {x: number; y: number},
    recharge: boolean
): RouteSim {
    const totalThrust = movers
        .filter((m) => m.hasMovement && m.engines)
        .reduce((sum, m) => sum + m.engines!.thrust, 0)

    const totalMass = movers.reduce((sum, m) => sum + m.mass, 0)

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

    const firstBarrier = movers
        .filter((m) => m.hasMovement)
        .reduce((mx, m) => Math.max(mx, m.priorMobilityEnd, m.narrowBarrierEnd), 0)

    let totalSeconds = firstBarrier

    let from = origin
    for (const to of waypoints) {
        const distance = distanceBetweenPoints(from.x, from.y, to.x, to.y)
        const distanceNum = Number(distance)
        const distanceCells = Math.trunc(distanceNum / PRECISION)

        const energyCostByMover: Record<string, number> = {}

        for (const m of movers) {
            if (!m.hasMovement || !m.engines) continue
            const key = String(m.ref.entityId)
            let cost = Number(calc_energyusage(distance, m.engines.drain))
            if (m.hauler) {
                cost += Math.trunc(distanceCells) * m.hauler.drain * haulCount
            }
            energyCostByMover[key] = cost
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

        totalSeconds += rechargeSeconds + flightSeconds

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

    return {legs, totalSeconds, reachable}
}
