import type {UInt16Type, UInt32Type} from '@wharfkit/antelope'
import {calcCargoItemMass} from '../capabilities/storage'
import type {ServerContract} from '../contracts'
import {PRECISION} from '../types'
import * as sched from './schedule'
import {taskCargoEffect} from './availability'
import {candidateLaneCompletesAt} from './lanes'

const NFT_TRANSIT_THRUST = 400
const BASELINE_LOADER: DerivedLoaders = {mass: 2000, thrust: 1, quantity: 1}
// ground-level entities (warehouses, z=0) still incur a base orbital climb of load effort
const MIN_LOAD_Z = 800

export interface DerivedLoaders {
    mass: number
    thrust: number
    quantity: number
}

export function derivedLoaders(
    lanes: {mass: UInt32Type | number; thrust: UInt16Type | number}[] | undefined
): DerivedLoaders | null {
    if (!lanes || lanes.length === 0) return null
    let totalMass = 0
    let totalThrust = 0
    for (const l of lanes) {
        totalMass += Number(l.mass)
        totalThrust += Number(l.thrust)
    }
    const count = lanes.length
    return {
        mass: Math.floor(totalMass / count),
        thrust: Math.min(totalThrust, 65_535),
        quantity: count,
    }
}

function acceleration(thrust: number, mass: number): number {
    if (mass <= 0) return 0
    return (thrust / mass) * PRECISION
}

function flightTime(distance: number, accel: number): number {
    if (accel <= 0 || distance <= 0) return 0
    return Math.floor(2 * Math.sqrt(distance / accel))
}

function distance2d(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx
    const dy = ay - by
    return Math.floor(Math.sqrt(dx * dx + dy * dy) * PRECISION)
}

export function unwrapTransitDuration(
    itemMass: number,
    origin: {x: number; y: number},
    dest: {x: number; y: number}
): number {
    if (itemMass <= 0) return 0
    return flightTime(
        distance2d(origin.x, origin.y, dest.x, dest.y),
        acceleration(NFT_TRANSIT_THRUST, itemMass)
    )
}

export function unwrapLoadDuration(
    loaders: DerivedLoaders | null,
    itemMass: number,
    destZ: number
): number {
    if (!loaders || itemMass <= 0) return 0
    const total = itemMass + loaders.mass
    const flight = flightTime(Math.max(destZ, MIN_LOAD_Z), acceleration(loaders.thrust, total))
    return Math.floor(flight / loaders.quantity)
}

export interface UnwrapItem {
    itemId: number
    quantity: number
    modules: ServerContract.Types.module_entry[]
    originX: number
    originY: number
}

export interface UnwrapDestination {
    loader_lanes?: {mass: UInt32Type | number; thrust: UInt16Type | number}[]
    coordinates: {x: UInt32Type | number; y: UInt32Type | number; z?: UInt32Type | number}
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
    const load = unwrapLoadDuration(loaders, itemMass, dz)
    const transit = unwrapTransitDuration(
        itemMass,
        {x: item.originX, y: item.originY},
        {
            x: Number(dest.coordinates.x),
            y: Number(dest.coordinates.y),
        }
    )
    return load + transit
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

export function projectedPeakCargomass(
    entity: sched.ScheduleData & {cargomass: number | {toNumber(): number}},
    at: Date,
    addMass: number,
    removeMass = 0
): number {
    const events: {t: number; delta: number}[] = []
    for (const ordered of sched.orderedTasks(entity)) {
        const eff = taskCargoEffect(ordered.task)
        const delta = cargoListMass(eff.added) - cargoListMass(eff.removed)
        events.push({t: ordered.completesAt.getTime(), delta})
    }
    events.push({t: at.getTime(), delta: addMass - removeMass})
    events.sort((a, b) => (a.t !== b.t ? a.t - b.t : b.delta - a.delta))
    let running = Number(entity.cargomass)
    let peak = running
    for (const e of events) {
        running += e.delta
        if (running < 0) running = 0
        if (running > peak) peak = running
    }
    return Math.min(peak, 0xffff_ffff)
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
    const candidateCompletes = candidateLaneCompletesAt(dest, sched.LANE_MOBILITY, duration, now)
    const peak = projectedPeakCargomass(
        dest,
        candidateCompletes,
        itemMass + incomingHoldMass(dest.holds)
    )
    return peak <= capacity
}
