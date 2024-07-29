import {
    BlockTimestamp,
    Checksum256,
    Int64,
    Int64Type,
    UInt32,
    UInt32Type,
    UInt64,
    UInt64Type,
} from '@wharfkit/antelope'

import {PlatformContract, ServerContract} from './contracts'
import {hash512} from './hash'
import {Distance, PRECISION, TRAVEL_MAXMASS_PENALTY} from './types'
import {getGood} from './goods'

export function travelplanDuration(travelplan: ServerContract.Types.travel_plan) {
    return UInt64.from(travelplan.flighttime)
        .adding(travelplan.rechargetime)
        .adding(travelplan.loadtime)
        .adding(travelplan.masspenalty)
}

export function distanceTraveled(
    ship: ServerContract.Types.ship_row,
    current: Date = new Date()
): number {
    if (ship.travelplan) {
        const {departure} = ship.travelplan
        const duration = travelplanDuration(ship.travelplan)
        return (+current - +departure.toDate()) / (Number(duration) * 1000)
    }
    return 0
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
    const x = Math.pow(x1 - x2, 2)
    const y = Math.pow(y1 - y2, 2)
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

export function hasSystem(
    seed: Checksum256,
    coordinates: ServerContract.ActionParams.Type.coordinates
): boolean {
    const str = ['system', coordinates.x, coordinates.y].join('-')
    return String(hash512(seed, str)).slice(0, 2) === '00'
}

export function findNearbyPlanets(
    seed: Checksum256,
    origin: ServerContract.ActionParams.Type.coordinates,
    maxDistance: UInt64Type = 20 * PRECISION
): Distance[] {
    // console.log(String(seed), String(maxDistance), JSON.stringify(origin))
    const nearbySystems: Distance[] = []

    const max = UInt64.from(maxDistance / PRECISION)
    const xMin = Int64.from(origin.x).subtracting(max)
    const xMax = Int64.from(origin.x).adding(max)
    const yMin = Int64.from(origin.y).subtracting(max)
    const yMax = Int64.from(origin.y).adding(max)

    // console.log('xMin', Number(xMin))
    // console.log('xMax', Number(xMax))
    // console.log('yMin', Number(yMin))
    // console.log('yMax', Number(yMax))

    for (let x = Number(xMin); x <= Number(xMax); x++) {
        for (let y = Number(yMin); y <= Number(yMax); y++) {
            const samePlace = x === origin.x && y === origin.y
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
export function travelplan(
    game: PlatformContract.Types.game_row,
    ship: ServerContract.Types.ship_row,
    cargos: ServerContract.Types.cargo_row[],
    origin: ServerContract.ActionParams.Type.coordinates,
    destination: ServerContract.ActionParams.Type.coordinates,
    recharge: boolean,
    alwaysValid = false
): ServerContract.Types.travel_plan {
    if (!alwaysValid) {
        const valid = hasSystem(game.config.seed, destination)
        if (!valid) {
            throw new Error('Invalid destination')
        }
    }
    const distance = distanceBetweenCoordinates(origin, destination)
    const mass = calc_ship_mass(ship, cargos) // Total mass of ship_id
    const loadtime = calc_ship_loadtime(ship, cargos)
    const flighttime = calc_ship_flighttime(ship, mass, distance)
    const rechargetime = recharge ? calc_ship_rechargetime(ship) : 0
    const masspenalty = calc_mass_penalty(ship, mass)
    const energyusage = calc_energyusage(distance, ship.stats.drain) // Energy usage from ship and flighttime

    return ServerContract.Types.travel_plan.from({
        departure: BlockTimestamp.fromDate(new Date()),
        destination,
        distance,
        loadtime,
        flighttime,
        rechargetime,
        masspenalty,
        // TODO: Remove below, used for debugging
        energyusage,
        mass,
    })
}

export function calc_mass_penalty(ship: ServerContract.Types.ship_row, mass: UInt64Type): UInt32 {
    const current = Number(mass)
    const maximum = Number(ship.stats.maxmass)
    if (mass > ship.stats.maxmass) {
        const overage = (current - maximum) / PRECISION
        const penalty = TRAVEL_MAXMASS_PENALTY * Math.exp(0.00005 * overage)
        return UInt32.from(penalty)
    }
    return UInt32.from(0)
}

export function calc_rechargetime(
    capacity: UInt32Type,
    energy: UInt32Type,
    recharge: UInt32Type
): UInt32 {
    return UInt32.from(capacity).subtracting(energy).dividing(recharge)
}

export function calc_ship_rechargetime(ship: ServerContract.Types.ship_row): UInt32 {
    return calc_rechargetime(ship.stats.capacity, ship.state.energy, ship.stats.recharge)
}

// uint32_t server::calc_ship_rechargetime(const ship_row ship)
// {
//    return calc_rechargetime(ship.stats.capacity, ship.state.energy, ship.stats.recharge);
// }

export function calc_ship_loadtime(
    ship: ServerContract.Types.ship_row,
    cargos: ServerContract.Types.cargo_row[]
): UInt32 {
    const loadtime = UInt32.from(0)

    const mass_load = UInt64.from(0)
    const mass_unload = UInt64.from(0)
    for (const cargo of cargos) {
        const cargo_delta = Number(cargo.owned) - Number(cargo.loaded)
        if (cargo_delta !== 0) {
            const good_mass = getGood(cargo.good_id).mass
            const cargo_mass = good_mass.multiplying(Math.abs(cargo_delta))

            if (cargo_delta > 0) {
                mass_load.add(cargo_mass)
            } else {
                mass_unload.add(cargo_mass)
            }
        }
    }

    if (Number(mass_load) > 0 || Number(mass_unload) > 0) {
        mass_load.add(ship.loaders.mass)
        loadtime.add(calc_loader_flighttime(ship, mass_load))

        mass_unload.add(ship.loaders.mass)
        loadtime.add(calc_loader_flighttime(ship, mass_unload))
    }

    return loadtime.dividing(ship.loaders.quantity)
}

export function calc_flighttime(distance: UInt64Type, acceleration: number): UInt32 {
    return UInt32.from(2 * Math.sqrt(Number(distance) / acceleration))
}

export function calc_loader_flighttime(ship: ServerContract.Types.ship_row, mass: UInt64): UInt32 {
    return calc_flighttime(ship.stats.orbit, calc_loader_acceleration(ship, mass))
}

export function calc_loader_acceleration(
    ship: ServerContract.Types.ship_row,
    mass: UInt64
): number {
    return calc_acceleration(Number(ship.loaders.thrust), Number(mass) + Number(ship.loaders.mass))
}

export function calc_ship_flighttime(
    ship: ServerContract.Types.ship_row,
    mass: UInt64,
    distance: UInt64
): UInt32 {
    const acceleration = calc_ship_acceleration(ship, mass)
    return calc_flighttime(distance, acceleration)
}

export function calc_ship_acceleration(ship: ServerContract.Types.ship_row, mass: UInt64): number {
    return calc_acceleration(Number(ship.stats.thrust), Number(mass))
}

export function calc_acceleration(thrust: number, mass: number): number {
    return (thrust / mass) * PRECISION
}

export function calc_ship_mass(
    ship: ServerContract.Types.ship_row,
    cargos: ServerContract.Types.cargo_row[]
): UInt64 {
    const mass = UInt64.from(0)

    mass.add(ship.stats.mass)

    if (Number(ship.loaders.quantity) > 0) {
        mass.add(ship.loaders.mass.multiplying(ship.loaders.quantity))
    }

    for (const cargo of cargos) {
        mass.add(getGood(cargo.good_id).mass.multiplying(cargo.owned))
    }

    return mass
}

export function calc_energyusage(distance: UInt64Type, drain: UInt32Type): UInt32 {
    return UInt64.from(distance).dividing(PRECISION).multiplying(drain)
}
