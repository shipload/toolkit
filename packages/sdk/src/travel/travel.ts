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
    UInt16,
    UInt32,
    type UInt32Type,
    UInt64,
    type UInt64Type,
} from '@wharfkit/antelope'

import type {ServerContract} from '../contracts'
import {
    BASE_ORBITAL_MASS,
    type CargoMassInfo,
    type Distance,
    MAX_ORBITAL_ALTITUDE,
    MIN_ORBITAL_ALTITUDE,
    PRECISION,
    type ShipLike,
    TaskType,
} from '../types'
import {getItem} from '../data/catalog'
import {hasSystem} from '../utils/system'

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
    return cap.subtracting(eng).dividing(recharge)
}

export function calc_ship_rechargetime(ship: ShipLike): UInt32 {
    if (!ship.generator) return UInt32.from(0)
    return calc_rechargetime(
        ship.generator.capacity,
        ship.energy ?? UInt16.from(0),
        ship.generator.recharge
    )
}

export function calc_flighttime(distance: UInt64Type, acceleration: number): UInt32 {
    return UInt32.from(2 * Math.sqrt(Number(distance) / acceleration))
}

export function calc_loader_flighttime(ship: ShipLike, mass: UInt64, altitude?: number): UInt32 {
    const z = altitude ?? ship.coordinates.z?.toNumber() ?? calc_orbital_altitude(Number(mass))
    return calc_flighttime(z, calc_loader_acceleration(ship, mass))
}

export function calc_loader_acceleration(ship: ShipLike, mass: UInt64): number {
    const thrust = ship.loaders ? Number(ship.loaders.thrust) : 0
    const loaderMass = ship.loaders ? Number(ship.loaders.mass) : 0
    return calc_acceleration(thrust, Number(mass) + loaderMass)
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

    if (ship.loaders && ship.loaders.quantity.gt(UInt32.zero)) {
        mass.add(ship.loaders.mass.multiplying(ship.loaders.quantity))
    }

    for (const cargo of cargos) {
        const cargoMass = getItem(cargo.item_id).mass * Number(UInt32.from(cargo.quantity))
        mass.add(UInt64.from(cargoMass))
    }

    return mass
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

    if (!ship.loaders) return UInt32.from(0)
    mass = UInt64.from(mass).adding(ship.loaders.mass)
    const transfer_time = calc_loader_flighttime(ship, mass)
    return transfer_time.dividing(ship.loaders.quantity)
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

    if (mass_unload.gt(UInt64.zero) && ship.loaders) {
        const totalMass = UInt64.from(mass_unload).adding(ship.loaders.mass)
        unloadTime = Number(calc_loader_flighttime(ship, totalMass))
    }

    if (mass_load.gt(UInt64.zero) && ship.loaders) {
        const totalMass = UInt64.from(mass_load).adding(ship.loaders.mass)
        loadTime = Number(calc_loader_flighttime(ship, totalMass))
    }

    const numLoaders = ship.loaders ? Number(ship.loaders.quantity) : 0
    const totalTime = numLoaders > 0 ? (unloadTime + loadTime) / numLoaders : 0
    const unloadTimePerLoader = numLoaders > 0 ? unloadTime / numLoaders : 0
    const loadTimePerLoader = numLoaders > 0 ? loadTime / numLoaders : 0

    return {
        unloadTime: unloadTimePerLoader,
        loadTime: loadTimePerLoader,
        totalTime,
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

    if (
        loadMass &&
        UInt32.from(loadMass).gt(UInt32.zero) &&
        ship.loaders &&
        ship.loaders.quantity.gt(UInt32.zero)
    ) {
        const totalMass = UInt64.from(loadMass).adding(ship.loaders.mass)
        loadTime = calc_loader_flighttime(ship, totalMass).dividing(ship.loaders.quantity)
    }

    if (
        unloadMass &&
        UInt32.from(unloadMass).gt(UInt32.zero) &&
        ship.loaders &&
        ship.loaders.quantity.gt(UInt32.zero)
    ) {
        const totalMass = UInt64.from(unloadMass).adding(ship.loaders.mass)
        unloadTime = calc_loader_flighttime(ship, totalMass).dividing(ship.loaders.quantity)
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

export interface TransferEntity {
    location: {z?: {toNumber(): number} | number}
    loaders?: {
        thrust: {toNumber(): number} | number
        mass: {toNumber(): number} | number
        quantity: {toNumber(): number} | number
    }
}

export interface HasScheduleAndLocation {
    coordinates: ServerContract.ActionParams.Type.coordinates
    schedule?: ServerContract.Types.schedule
}

export function getFlightOrigin(
    entity: HasScheduleAndLocation,
    flightTaskIndex: number
): ServerContract.ActionParams.Type.coordinates {
    if (!entity.schedule) return entity.coordinates

    let origin = entity.coordinates
    for (let i = 0; i < flightTaskIndex && i < entity.schedule.tasks.length; i++) {
        const task = entity.schedule.tasks[i]
        if (task.type.equals(TaskType.TRAVEL) && task.coordinates) {
            origin = task.coordinates
        }
    }
    return origin
}

export function getDestinationLocation(
    entity: HasScheduleAndLocation
): ServerContract.ActionParams.Type.coordinates | undefined {
    if (!entity.schedule) return undefined

    for (let i = entity.schedule.tasks.length - 1; i >= 0; i--) {
        const task = entity.schedule.tasks[i]
        if (task.type.equals(TaskType.TRAVEL) && task.coordinates) {
            return task.coordinates
        }
    }
    return undefined
}

export function getPositionAt(
    entity: HasScheduleAndLocation,
    taskIndex: number,
    taskProgress: number
): ServerContract.ActionParams.Type.coordinates {
    if (!entity.schedule || entity.schedule.tasks.length === 0 || taskIndex < 0) {
        return entity.coordinates
    }

    const task = entity.schedule.tasks[taskIndex]

    if (!task.type.equals(TaskType.TRAVEL) || !task.coordinates) {
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

export function calc_transfer_duration(
    source: TransferEntity,
    dest: TransferEntity,
    cargoMass: number
): number {
    if (cargoMass === 0) {
        return 0
    }

    let totalThrust = 0
    let totalLoaderMass = 0
    let totalQuantity = 0

    if (source.loaders) {
        const thrust =
            typeof source.loaders.thrust === 'number'
                ? source.loaders.thrust
                : source.loaders.thrust.toNumber()
        const mass =
            typeof source.loaders.mass === 'number'
                ? source.loaders.mass
                : source.loaders.mass.toNumber()
        const qty =
            typeof source.loaders.quantity === 'number'
                ? source.loaders.quantity
                : source.loaders.quantity.toNumber()
        totalThrust += thrust * qty
        totalLoaderMass += mass * qty
        totalQuantity += qty
    }

    if (dest.loaders) {
        const thrust =
            typeof dest.loaders.thrust === 'number'
                ? dest.loaders.thrust
                : dest.loaders.thrust.toNumber()
        const mass =
            typeof dest.loaders.mass === 'number' ? dest.loaders.mass : dest.loaders.mass.toNumber()
        const qty =
            typeof dest.loaders.quantity === 'number'
                ? dest.loaders.quantity
                : dest.loaders.quantity.toNumber()
        totalThrust += thrust * qty
        totalLoaderMass += mass * qty
        totalQuantity += qty
    }

    if (totalThrust === 0 || totalQuantity === 0) {
        return 0
    }

    const sourceZ =
        typeof source.location.z === 'number'
            ? source.location.z
            : (source.location.z?.toNumber() ?? 0)
    const destZ =
        typeof dest.location.z === 'number' ? dest.location.z : (dest.location.z?.toNumber() ?? 0)
    const distance = Math.abs(sourceZ - destZ)

    const totalMass = cargoMass + totalLoaderMass
    const acceleration = calc_acceleration(totalThrust, totalMass)
    const flightTime = 2 * Math.sqrt(distance / acceleration)

    return Math.floor(flightTime / totalQuantity)
}
