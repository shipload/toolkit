import type {UInt16Type, UInt32Type} from '@wharfkit/antelope'
import {calcCargoItemMass} from '../capabilities/storage'
import type {ServerContract} from '../contracts'
import {MASS_STAT_SCALE, PRECISION, TaskType} from '../types'
import {calcShuttleMass, computeLoaderPayload} from '../nft/description'
import * as sched from './schedule'
import {taskCargoEffect} from './availability'
import {placedStart} from './lanes'

const BASELINE_LOADER: DerivedLoaders = {payload: computeLoaderPayload(0), thrust: 1, quantity: 1}
// ground-level entities (warehouses, z=0) still incur a base orbital climb of load effort
const MIN_LOAD_Z = 800

export interface DerivedLoaders {
    payload: number
    thrust: number
    quantity: number
}

export function derivedLoaders(
    lanes: {payload: UInt16Type | number; thrust: UInt16Type | number}[] | undefined
): DerivedLoaders | null {
    if (!lanes || lanes.length === 0) return null
    let totalPayload = 0
    let totalThrust = 0
    for (const l of lanes) {
        totalPayload += Number(l.payload)
        totalThrust += Number(l.thrust)
    }
    const count = lanes.length
    return {
        payload: Math.floor(totalPayload / count),
        thrust: Math.min(totalThrust, 65_535),
        quantity: count,
    }
}

function acceleration(thrust: number, mass: number): number {
    if (mass <= 0) return 0
    return (thrust / (mass * MASS_STAT_SCALE)) * PRECISION
}

function flightTime(distance: number, accel: number): number {
    if (accel <= 0 || distance <= 0) return 0
    return Math.floor(2 * Math.sqrt(distance / accel))
}

export function unwrapLoadDuration(
    loaders: DerivedLoaders | null,
    itemMass: number,
    destZ: number
): number {
    if (!loaders || itemMass <= 0) return 0
    const total = calcShuttleMass(itemMass, loaders.payload)
    const flight = flightTime(Math.max(destZ, MIN_LOAD_Z), acceleration(loaders.thrust, total))
    const duration = Math.floor(flight / loaders.quantity)
    return duration === 0 ? 1 : duration
}

export interface UnwrapItem {
    itemId: number
    quantity: number
    modules: ServerContract.Types.module_entry[]
    originX: number
    originY: number
}

export interface UnwrapDestination {
    loader_lanes?: {payload: UInt16Type | number; thrust: UInt16Type | number}[]
    coordinates: {x: UInt32Type | number; y: UInt32Type | number; z?: UInt32Type | number}
}

export function isAtWrapNexus(dest: UnwrapDestination, item: UnwrapItem): boolean {
    return (
        Number(dest.coordinates.x) === item.originX && Number(dest.coordinates.y) === item.originY
    )
}

export function estimateUnwrapDuration(dest: UnwrapDestination, item: UnwrapItem): number {
    const itemMass = Number(
        calcCargoItemMass({
            item_id: item.itemId as never,
            quantity: item.quantity as never,
            modules: item.modules,
        })
    )
    const loaders = derivedLoaders(dest.loader_lanes) ?? BASELINE_LOADER
    const dz = Number(dest.coordinates.z ?? 0)
    return unwrapLoadDuration(loaders, itemMass, dz)
}

// Hold kinds that count as incoming (mirror is_incoming_hold_kind in holds.hpp).
const INCOMING_HOLD_KINDS = new Set<number>([2, 3, 5])

export function incomingHoldMass(
    holds:
        | {kind: number | {toNumber(): number}; incoming_mass: number | {toNumber(): number}}[]
        | undefined
): number {
    if (!holds) return 0
    let total = 0
    for (const h of holds) {
        if (INCOMING_HOLD_KINDS.has(Number(h.kind))) total += Number(h.incoming_mass)
    }
    return total
}

type CargoItem = ServerContract.Types.cargo_item

function cargoListMass(items: CargoItem[]): number {
    let m = 0
    for (const it of items) m += Number(calcCargoItemMass(it))
    return m
}

export interface CargomassProjection {
    used: number
    peak: number
}

export function projectCargomass(
    entity: sched.AnchoredScheduleData & {cargomass: number | {toNumber(): number}},
    at: Date,
    addMass: number,
    removeMass = 0
): CargomassProjection {
    const events: {t: number; delta: number; candidate: boolean}[] = []
    for (const ordered of sched.unappliedTasks(entity)) {
        const eff = taskCargoEffect(ordered.task)
        const delta = cargoListMass(eff.added) - cargoListMass(eff.removed)
        events.push({t: ordered.completesAt.getTime(), delta, candidate: false})
    }
    events.push({t: at.getTime(), delta: addMass - removeMass, candidate: true})
    events.sort((a, b) => (a.t !== b.t ? a.t - b.t : b.delta - a.delta))
    let running = Number(entity.cargomass)
    let peak = running
    let used = running
    for (const e of events) {
        running += e.delta
        if (running < 0) running = 0
        if (running > peak) peak = running
        if (e.candidate) used = running
    }
    return {used: Math.min(used, 0xffff_ffff), peak: Math.min(peak, 0xffff_ffff)}
}

export function projectedPeakCargomass(
    entity: sched.AnchoredScheduleData & {cargomass: number | {toNumber(): number}},
    at: Date,
    addMass: number,
    removeMass = 0
): number {
    return projectCargomass(entity, at, addMass, removeMass).peak
}

export function receiveFits(
    dest: UnwrapDestination &
        sched.ScheduleData & {
            cargomass: number | {toNumber(): number}
            capacity?: number | {toNumber(): number}
            holds?: {
                kind: number | {toNumber(): number}
                incoming_mass: number | {toNumber(): number}
            }[]
        },
    item: UnwrapItem,
    now: Date
): boolean {
    const capacity = Number(dest.capacity ?? 0)
    if (capacity <= 0) return false
    const itemMass = Number(
        calcCargoItemMass({
            item_id: item.itemId as never,
            quantity: item.quantity as never,
            modules: item.modules,
        })
    )
    const duration = estimateUnwrapDuration(dest, item)
    const start = placedStart(dest, TaskType.UNWRAP, sched.LANE_MOBILITY, now)
    const candidateCompletes = new Date(start.getTime() + duration * 1000)
    const peak = projectedPeakCargomass(
        dest,
        candidateCompletes,
        itemMass + incomingHoldMass(dest.holds)
    )
    return peak <= capacity
}
