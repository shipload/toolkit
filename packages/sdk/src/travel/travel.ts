/**
 * Travel calculations for ship movement, energy usage, and flight times.
 *
 * Functions prefixed with `calc_` are contract-parity functions that mirror
 * the C++ implementation in the server contract (schedule.cpp, ship.cpp).
 * These use snake_case intentionally to match the contract naming convention
 * and signal that they must produce identical results to the on-chain code.
 *
 * Functions prefixed with `calculate` are higher-level SDK helpers that may
 * combine multiple contract calculations for convenience.
 */

import {
    type Checksum256,
    Int64,
    type Int64Type,
    UInt32,
    type UInt32Type,
    UInt64,
    type UInt64Type,
} from '@wharfkit/antelope'

import type {ServerContract} from '../contracts'
import {
    BASE_HAUL_PENALTY_MILLI,
    BASE_ORBITAL_MASS,
    type CargoMassInfo,
    type Distance,
    HAULER_EFFICIENCY_DENOM,
    MAX_ORBITAL_ALTITUDE,
    MIN_ORBITAL_ALTITUDE,
    MIN_TRANSFER_DISTANCE_ORBITAL_VESSEL,
    MIN_TRANSFER_DISTANCE_PLANETARY_STRUCTURE,
    PRECISION,
    type ShipLike,
    TaskType,
} from '../types'
import {EntityClass} from '../data/kind-registry'
import {getItem} from '../data/catalog'
import {hasSystem} from '../utils/system'
import {WH} from '../derivation/wormhole'
import * as scheduleModel from '../scheduling/schedule'
import type {ScheduleData} from '../scheduling/schedule'

function isPositionalTask(task: ServerContract.Types.task): boolean {
    return task.type.equals(TaskType.TRAVEL) || task.type.equals(TaskType.TRANSIT)
}

export function calc_orbital_altitude(mass: number): number {
    if (mass <= BASE_ORBITAL_MASS) {
        return MIN_ORBITAL_ALTITUDE
    }

    const ratio = mass / BASE_ORBITAL_MASS
    const capRatio = 10.0
    let scale = Math.log(ratio) / Math.log(capRatio)
    scale = Math.min(scale, 1.0)

    return MIN_ORBITAL_ALTITUDE + Math.floor((MAX_ORBITAL_ALTITUDE - MIN_ORBITAL_ALTITUDE) * scale)
}

export function distanceBetweenCoordinates(
    origin: ServerContract.ActionParams.Type.coordinates,
    destination: ServerContract.ActionParams.Type.coordinates
): UInt64 {
    return distanceBetweenPoints(origin.x, origin.y, destination.x, destination.y)
}

export function distanceBetweenPoints(
    x1: Int64Type,
    y1: Int64Type,
    x2: Int64Type,
    y2: Int64Type
): UInt64 {
    const x = (x1 - x2) ** 2
    const y = (y1 - y2) ** 2
    return UInt64.from(Math.sqrt(x + y) * PRECISION)
}

export function lerp(
    origin: ServerContract.ActionParams.Type.coordinates,
    destination: ServerContract.ActionParams.Type.coordinates,
    time: number
): ServerContract.ActionParams.Type.coordinates {
    return {
        x: (1 - time) * Number(origin.x) + time * Number(destination.x),
        y: (1 - time) * Number(origin.y) + time * Number(destination.y),
    }
}

export interface FloatPosition {
    x: number
    y: number
}

export function easeFlightProgress(t: number): number {
    if (t <= 0) return 0
    if (t >= 1) return 1
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)
}

export function flightSpeedFactor(t: number): number {
    if (t <= 0 || t >= 1) return 0
    return t < 0.5 ? 4 * t : 4 * (1 - t)
}

export function interpolateFlightPosition(
    origin: {x: Int64Type | number; y: Int64Type | number},
    destination: {x: Int64Type | number; y: Int64Type | number},
    taskProgress: number,
    options?: {easing?: 'physics' | 'linear'}
): FloatPosition {
    const t = options?.easing === 'linear' ? taskProgress : easeFlightProgress(taskProgress)
    return {
        x: (1 - t) * Number(origin.x) + t * Number(destination.x),
        y: (1 - t) * Number(origin.y) + t * Number(destination.y),
    }
}

export function getInterpolatedPosition(
    entity: HasScheduleAndLocation,
    taskIndex: number,
    taskProgress: number
): FloatPosition {
    const tasks = mobilityTasks(entity)
    if (tasks.length === 0) {
        return {x: Number(entity.coordinates.x), y: Number(entity.coordinates.y)}
    }
    if (taskIndex < 0) {
        const settled = getFlightOrigin(entity, tasks.length)
        return {x: Number(settled.x), y: Number(settled.y)}
    }
    const task = tasks[taskIndex]
    if (!isPositionalTask(task) || !task.coordinates) {
        const origin = getFlightOrigin(entity, taskIndex)
        return {x: Number(origin.x), y: Number(origin.y)}
    }
    return interpolateFlightPosition(
        getFlightOrigin(entity, taskIndex),
        task.coordinates,
        taskProgress
    )
}

export function rotation(
    origin: ServerContract.ActionParams.Type.coordinates,
    destination: ServerContract.ActionParams.Type.coordinates
) {
    return Math.atan2(destination.y - origin.y, destination.x - origin.x) * (180 / Math.PI) + 90
}

export function findNearbyPlanets(
    seed: Checksum256,
    origin: ServerContract.ActionParams.Type.coordinates,
    maxDistance: UInt64Type = 20 * PRECISION
): Distance[] {
    const nearbySystems: Distance[] = []

    const max = UInt64.from(maxDistance / PRECISION)
    const xMin = Int64.from(origin.x).subtracting(max)
    const xMax = Int64.from(origin.x).adding(max)
    const yMin = Int64.from(origin.y).subtracting(max)
    const yMax = Int64.from(origin.y).adding(max)

    for (let x = Number(xMin); x <= Number(xMax); x++) {
        for (let y = Number(yMin); y <= Number(yMax); y++) {
            const samePlace = x === Number(origin.x) && y === Number(origin.y)
            if (!samePlace) {
                const distance = distanceBetweenPoints(origin.x, origin.y, x, y)
                if (Number(distance) <= Number(maxDistance)) {
                    const system = hasSystem(seed, {x, y})
                    if (system) {
                        nearbySystems.push({origin, destination: {x, y}, distance})
                    }
                }
            }
        }
    }

    return nearbySystems
}

export function calc_rechargetime(
    capacity: UInt32Type,
    energy: UInt32Type,
    recharge: UInt32Type
): UInt32 {
    const cap = UInt32.from(capacity)
    const eng = UInt32.from(energy)
    if (eng.gte(cap)) return UInt32.zero
    const ticks = cap.subtracting(eng).dividing(recharge)
    return ticks.equals(UInt32.zero) ? UInt32.from(1) : ticks
}

export function calc_ship_rechargetime(ship: ShipLike): UInt32 {
    if (!ship.generator) return UInt32.from(0)
    return calc_rechargetime(
        ship.generator.capacity,
        ship.energy ?? UInt32.from(0),
        ship.generator.recharge
    )
}

export function calc_flighttime(distance: UInt64Type, acceleration: number): UInt32 {
    return UInt32.from(2 * Math.sqrt(Number(distance) / acceleration))
}

export function calc_transit_duration(ax: number, ay: number, bx: number, by: number): UInt32 {
    const distance = distanceBetweenPoints(ax, ay, bx, by)
    return UInt32.from(Math.floor(distance.toNumber() / (PRECISION * WH.TRANSIT_SPEED)))
}

// The active entity's chosen loader lane (lowest slot), mirroring cargo.cpp lane selection.
export function shipLoaderLane(ship: ShipLike): {thrust: number; mass: number} | undefined {
    const lanes = ship.loader_lanes ?? []
    if (lanes.length === 0) return undefined
    let lowest = lanes[0]
    for (const lane of lanes) {
        if (Number(lane.slot_index) < Number(lowest.slot_index)) lowest = lane
    }
    return {thrust: Number(lowest.thrust), mass: Number(lowest.mass)}
}

export function calc_loader_flighttime(ship: ShipLike, mass: UInt64, altitude?: number): UInt32 {
    const z = altitude ?? ship.coordinates.z?.toNumber() ?? calc_orbital_altitude(Number(mass))
    return calc_flighttime(z, calc_loader_acceleration(ship, mass))
}

export function calc_loader_acceleration(ship: ShipLike, mass: UInt64): number {
    const lane = shipLoaderLane(ship)
    const thrust = lane ? lane.thrust : 0
    return calc_acceleration(thrust, Number(mass))
}

export function calc_ship_flighttime(ship: ShipLike, mass: UInt64, distance: UInt64): UInt32 {
    const acceleration = calc_ship_acceleration(ship, mass)
    return calc_flighttime(distance, acceleration)
}

export function calc_ship_acceleration(ship: ShipLike, mass: UInt64): number {
    const thrust = ship.engines ? Number(ship.engines.thrust) : 0
    return calc_acceleration(thrust, Number(mass))
}

export function calc_acceleration(thrust: number, mass: number): number {
    return (thrust / mass) * PRECISION
}

export function calc_ship_mass(ship: ShipLike, cargos: CargoMassInfo[]): UInt64 {
    const mass = UInt64.from(0)

    mass.add(ship.hullmass)

    if (ship.loader_lanes && ship.loader_lanes.length > 0) {
        for (const l of ship.loader_lanes) {
            mass.add(UInt64.from(l.mass))
        }
    }

    for (const cargo of cargos) {
        const cargoMass = getItem(cargo.item_id).mass * Number(UInt32.from(cargo.quantity))
        mass.add(UInt64.from(cargoMass))
    }

    return mass
}

export function calc_group_flighttime(
    totalThrust: number,
    haulCount: number,
    pooledHaulCap: number,
    weightedHaulEffNum: number,
    totalMass: number,
    distance: UInt64Type
): UInt32 {
    const avgHaulEff = pooledHaulCap > 0 ? Math.trunc(weightedHaulEffNum / pooledHaulCap) : 0
    let effectiveThrust = totalThrust
    if (haulCount > 0) {
        const penaltyMilli =
            1000 +
            Math.trunc(
                (haulCount * BASE_HAUL_PENALTY_MILLI * (HAULER_EFFICIENCY_DENOM - avgHaulEff)) /
                    HAULER_EFFICIENCY_DENOM
            )
        effectiveThrust = Math.trunc((totalThrust * 1000) / penaltyMilli)
    }
    const acceleration = calc_acceleration(effectiveThrust, totalMass)
    return calc_flighttime(distance, acceleration)
}

export function calc_energyusage(distance: UInt64Type, drain: UInt32Type): UInt32 {
    return UInt64.from(distance).dividing(PRECISION).multiplying(drain)
}

export function calculateTransferTime(
    ship: ShipLike,
    cargos: CargoMassInfo[],
    quantities?: Map<number, number>
): UInt32 {
    let mass = UInt64.from(0)

    for (const cargo of cargos) {
        const qty = quantities?.get(Number(cargo.item_id)) ?? 0
        if (qty > 0) {
            const good_mass = getItem(cargo.item_id).mass
            const cargo_mass = good_mass * qty
            mass = UInt64.from(mass).adding(UInt64.from(cargo_mass))
        }
    }

    if (mass.equals(UInt64.zero)) {
        return UInt32.from(0)
    }

    const lane = shipLoaderLane(ship)
    if (!lane) return UInt32.from(0)
    mass = UInt64.from(mass).adding(UInt64.from(lane.mass))
    return calc_loader_flighttime(ship, mass)
}

export function calculateRefuelingTime(ship: ShipLike): UInt32 {
    return calc_ship_rechargetime(ship)
}

export function calculateFlightTime(
    ship: ShipLike,
    cargos: CargoMassInfo[],
    distance: UInt64Type
): UInt32 {
    const mass = calc_ship_mass(ship, cargos)
    return calc_ship_flighttime(ship, mass, distance)
}

export interface LoadTimeBreakdown {
    unloadTime: number
    loadTime: number
    totalTime: number
    unloadMass: number
    loadMass: number
}

export function calculateLoadTimeBreakdown(
    ship: ShipLike,
    cargos: CargoMassInfo[],
    loadQuantities?: Map<number, number>,
    unloadQuantities?: Map<number, number>
): LoadTimeBreakdown {
    let mass_unload = UInt64.from(0)
    let mass_load = UInt64.from(0)

    for (const cargo of cargos) {
        const goodId = Number(cargo.item_id)
        const loadQty = loadQuantities?.get(goodId) ?? 0
        const unloadQty = unloadQuantities?.get(goodId) ?? 0

        if (loadQty > 0 || unloadQty > 0) {
            const good = getItem(cargo.item_id)

            if (loadQty > 0) {
                const cargo_mass = good.mass * loadQty
                mass_load = UInt64.from(mass_load).adding(UInt64.from(cargo_mass))
            }
            if (unloadQty > 0) {
                const cargo_mass = good.mass * unloadQty
                mass_unload = UInt64.from(mass_unload).adding(UInt64.from(cargo_mass))
            }
        }
    }

    let unloadTime = 0
    let loadTime = 0

    const lane = shipLoaderLane(ship)

    if (mass_unload.gt(UInt64.zero) && lane) {
        const totalMass = UInt64.from(mass_unload).adding(UInt64.from(lane.mass))
        unloadTime = Number(calc_loader_flighttime(ship, totalMass))
    }

    if (mass_load.gt(UInt64.zero) && lane) {
        const totalMass = UInt64.from(mass_load).adding(UInt64.from(lane.mass))
        loadTime = Number(calc_loader_flighttime(ship, totalMass))
    }

    return {
        unloadTime,
        loadTime,
        totalTime: unloadTime + loadTime,
        unloadMass: Number(mass_unload),
        loadMass: Number(mass_load),
    }
}

export interface EstimatedTravelTime {
    flightTime: UInt32
    rechargeTime: UInt32
    loadTime: UInt32
    unloadTime: UInt32
    total: UInt32
}

export interface EstimateTravelTimeOptions {
    needsRecharge?: boolean
    loadMass?: UInt32Type
    unloadMass?: UInt32Type
}

export function estimateTravelTime(
    ship: ShipLike,
    travelMass: UInt64Type,
    distance: UInt64Type,
    options: EstimateTravelTimeOptions = {}
): EstimatedTravelTime {
    const {needsRecharge = false, loadMass, unloadMass} = options

    const flightTime = calc_ship_flighttime(ship, UInt64.from(travelMass), UInt64.from(distance))
    const rechargeTime = needsRecharge ? calc_ship_rechargetime(ship) : UInt32.zero

    let loadTime = UInt32.zero
    let unloadTime = UInt32.zero

    const lane = shipLoaderLane(ship)

    if (loadMass && UInt32.from(loadMass).gt(UInt32.zero) && lane) {
        const totalMass = UInt64.from(loadMass).adding(UInt64.from(lane.mass))
        loadTime = calc_loader_flighttime(ship, totalMass)
    }

    if (unloadMass && UInt32.from(unloadMass).gt(UInt32.zero) && lane) {
        const totalMass = UInt64.from(unloadMass).adding(UInt64.from(lane.mass))
        unloadTime = calc_loader_flighttime(ship, totalMass)
    }

    return {
        flightTime,
        rechargeTime,
        loadTime,
        unloadTime,
        total: flightTime.adding(rechargeTime).adding(loadTime).adding(unloadTime),
    }
}

export function estimateDealTravelTime(
    ship: ShipLike,
    shipMass: UInt64Type,
    distance: UInt64Type,
    loadMass: UInt32Type
): UInt32 {
    const needsRecharge = !hasEnergyForDistance(ship, distance)
    const estimate = estimateTravelTime(ship, shipMass, distance, {
        needsRecharge,
        loadMass,
    })
    return estimate.total
}

export function hasEnergyForDistance(ship: ShipLike, distance: UInt64Type): boolean {
    if (!ship.engines) return false
    const energyNeeded = UInt64.from(distance).dividing(PRECISION).multiplying(ship.engines.drain)
    return UInt64.from(ship.energy ?? 0).gte(energyNeeded)
}

export interface TransferLoaderLane {
    slot_index?: {toNumber(): number} | number
    thrust: {toNumber(): number} | number
    mass: {toNumber(): number} | number
}

export interface TransferEntity {
    location: {z?: {toNumber(): number} | number}
    entityClass: EntityClass
    loaderLanes?: TransferLoaderLane[]
}

function toNum(v: {toNumber(): number} | number | undefined): number {
    if (v === undefined) return 0
    return typeof v === 'number' ? v : v.toNumber()
}

// Mirrors cargo.cpp worker_lane_key_or_mobility: lowest-slot loader lane (display has no busy context).
function chosenLoaderLane(entity: TransferEntity): TransferLoaderLane | undefined {
    const lanes = entity.loaderLanes ?? []
    if (lanes.length === 0) return undefined
    let lowest = lanes[0]
    for (const lane of lanes) {
        if (toNum(lane.slot_index) < toNum(lowest.slot_index)) lowest = lane
    }
    return lowest
}

export interface HasScheduleAndLocation extends ScheduleData {
    coordinates: ServerContract.ActionParams.Type.coordinates
}

function mobilityTasks(entity: HasScheduleAndLocation): ServerContract.Types.task[] {
    return scheduleModel.mobilityLane(entity)?.schedule.tasks ?? []
}

export function getFlightOrigin(
    entity: HasScheduleAndLocation,
    flightTaskIndex: number
): ServerContract.ActionParams.Type.coordinates {
    const tasks = mobilityTasks(entity)
    let origin = entity.coordinates
    for (let i = 0; i < flightTaskIndex && i < tasks.length; i++) {
        const task = tasks[i]
        if (isPositionalTask(task) && task.coordinates) {
            origin = task.coordinates
        }
    }
    return origin
}

export function getDestinationLocation(
    entity: HasScheduleAndLocation
): ServerContract.ActionParams.Type.coordinates | undefined {
    const tasks = mobilityTasks(entity)
    for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i]
        if (isPositionalTask(task) && task.coordinates) {
            return task.coordinates
        }
    }
    return undefined
}

/** Returns chain-tile coordinates (rounded). For visual position use getInterpolatedPosition. */
export function getPositionAt(
    entity: HasScheduleAndLocation,
    taskIndex: number,
    taskProgress: number
): ServerContract.ActionParams.Type.coordinates {
    const tasks = mobilityTasks(entity)
    if (tasks.length === 0) {
        return entity.coordinates
    }
    if (taskIndex < 0) {
        return getFlightOrigin(entity, tasks.length)
    }

    const task = tasks[taskIndex]

    if (!isPositionalTask(task) || !task.coordinates) {
        return getFlightOrigin(entity, taskIndex)
    }

    const origin = getFlightOrigin(entity, taskIndex)
    const destination = task.coordinates

    const interpolated = lerp(origin, destination, taskProgress)
    return {
        x: Math.round(interpolated.x),
        y: Math.round(interpolated.y),
    }
}

export function minTransferDistance(entityClass: EntityClass): number {
    return entityClass === EntityClass.OrbitalVessel
        ? MIN_TRANSFER_DISTANCE_ORBITAL_VESSEL
        : MIN_TRANSFER_DISTANCE_PLANETARY_STRUCTURE
}

// Mirrors cargo.cpp calc_onesided_duration: single active loader's thrust + mass, no ÷quantity.
export function calc_onesided_duration(
    loaderThrust: number,
    loaderMass: number,
    activeZ: number,
    counterpartZ: number,
    activeEntityClass: EntityClass,
    counterpartEntityClass: EntityClass,
    cargoMass: number
): number {
    if (cargoMass === 0 || loaderThrust === 0) {
        return 0
    }
    const rawDistance = Math.abs(activeZ - counterpartZ)
    const minDistance = Math.max(
        minTransferDistance(activeEntityClass),
        minTransferDistance(counterpartEntityClass)
    )
    const distance = rawDistance < minDistance ? minDistance : rawDistance
    const totalMass = cargoMass + loaderMass
    const acceleration = calc_acceleration(loaderThrust, totalMass)
    const flightTime = Math.floor(2 * Math.sqrt(distance / acceleration))
    return flightTime === 0 ? 1 : flightTime
}

// Mirrors cargo.cpp: the active (loader-bearing) entity's chosen loader lane drives the duration.
export function calc_transfer_duration(
    source: TransferEntity,
    dest: TransferEntity,
    cargoMass: number
): number {
    const active = chosenLoaderLane(source) ? source : dest
    const counterpart = active === source ? dest : source
    const lane = chosenLoaderLane(active)
    if (!lane) {
        return 0
    }

    const activeZ = toNum(active.location.z)
    const counterpartZ = toNum(counterpart.location.z)

    return calc_onesided_duration(
        toNum(lane.thrust),
        toNum(lane.mass),
        activeZ,
        counterpartZ,
        active.entityClass,
        counterpart.entityClass,
        cargoMass
    )
}
