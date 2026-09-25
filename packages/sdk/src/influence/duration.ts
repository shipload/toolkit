import {computeLoaderMass, computeLoaderThrust} from '../nft/description'
import {MASS_STAT_SCALE, MASS_UNITS_PER_TONNE, PRECISION} from '../types'
import {CIVIC_LOADER_STAT, CIVIC_LOADER_TIER, DEFAULT_ORBITAL_Z} from './constants'

export interface CivicLoaderStats {
    thrust: number
    mass: number
}

export function civicLoader(): CivicLoaderStats {
    return {
        thrust: Math.min(computeLoaderThrust(CIVIC_LOADER_STAT, CIVIC_LOADER_TIER), 65_535),
        mass: computeLoaderMass(CIVIC_LOADER_STAT),
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

export function contributeDuration(totalMass: number, altitudeZ = 0): number {
    const loader = civicLoader()
    const mass = totalMass + loader.mass
    const z = Math.max(altitudeZ, DEFAULT_ORBITAL_Z)
    return flightTime(z, acceleration(loader.thrust, mass))
}

export function contributeDurationForTonnes(tonnes: number, altitudeZ = 0): number {
    return contributeDuration(Math.floor(tonnes * MASS_UNITS_PER_TONNE), altitudeZ)
}
