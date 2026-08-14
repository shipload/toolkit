import {computeLoaderMass, computeLoaderThrust} from '../nft/description'
import {PRECISION} from '../types'
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
    return (thrust / mass) * PRECISION
}

function flightTime(distance: number, accel: number): number {
    if (accel <= 0 || distance <= 0) return 0
    return Math.floor(2 * Math.sqrt(distance / accel))
}

export function contributeDuration(totalMassKg: number, altitudeZ = 0): number {
    const loader = civicLoader()
    const totalMass = totalMassKg + loader.mass
    const z = Math.max(altitudeZ, DEFAULT_ORBITAL_Z)
    return flightTime(z, acceleration(loader.thrust, totalMass))
}

export function contributeDurationForTonnes(tonnes: number, altitudeZ = 0): number {
    return contributeDuration(Math.floor(tonnes * 1000), altitudeZ)
}
