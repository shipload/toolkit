import type {NameType} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {getEntityClass} from '../data/kind-registry'
import {computeLoaderMass, computeLoaderThrust} from '../nft/description'
import {laneKeyForModule, resolveLaneLoader} from '../scheduling/lanes'
import {calc_onesided_duration} from '../travel/travel'
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

export const DEPOT_LOADER_SLOT = 0

export interface DepotTransferParams {
    depotModules: ServerContract.Types.module_entry[]
    depotItemId: number
    depotKind: NameType
    depotZ: number
    shipKind: NameType
    shipZ: number
    cargoMass: number
}

// Mirrors depot.cpp: the depot's slot-0 loader drives the transfer; 0 when no loader is installed.
export function depotTransferDuration(params: DepotTransferParams): number {
    const loader = resolveLaneLoader(
        params.depotModules,
        params.depotItemId,
        laneKeyForModule(DEPOT_LOADER_SLOT)
    )
    if (!loader.valid) return 0
    return calc_onesided_duration(
        loader.thrust,
        loader.mass,
        params.shipZ,
        params.depotZ,
        getEntityClass(params.shipKind),
        getEntityClass(params.depotKind),
        params.cargoMass
    )
}

export interface CivicDropoffParams {
    buildingModules: ServerContract.Types.module_entry[]
    buildingItemId: number
    buildingKind: NameType
    buildingZ: number
    shipKind: NameType
    shipZ: number
    cargoMass: number
}

// Mirrors jobs.cpp craftjob: the building's slot-0 loader when one is installed, the civic loader when none is.
export function civicDropoffDuration(params: CivicDropoffParams): number {
    const loader = resolveLaneLoader(
        params.buildingModules,
        params.buildingItemId,
        laneKeyForModule(DEPOT_LOADER_SLOT)
    )
    if (!loader.valid) return contributeDuration(params.cargoMass, params.shipZ)
    return calc_onesided_duration(
        loader.thrust,
        loader.mass,
        params.shipZ,
        params.buildingZ,
        getEntityClass(params.shipKind),
        getEntityClass(params.buildingKind),
        params.cargoMass
    )
}
