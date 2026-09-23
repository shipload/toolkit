import type {NameType} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
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

export function civicInternalShuttle(
    modules: ServerContract.Types.module_entry[],
    itemId: number
): {thrust: number; mass: number} | null {
    for (let slot = 0; slot < modules.length; slot++) {
        const installed = modules[slot].installed
        if (!installed) continue
        if (getItem(installed.item_id).moduleType !== 'loader') continue
        const loader = resolveLaneLoader(modules, itemId, laneKeyForModule(slot))
        return {thrust: loader.thrust, mass: loader.mass}
    }
    return null
}

export interface CivicLegParams {
    buildingModules: ServerContract.Types.module_entry[]
    buildingItemId: number
    buildingKind: NameType
    buildingZ: number
    entityKind: NameType
    entityZ: number
    cargoMass: number
}

// Mirrors cargo.cpp internal_shuttle_duration.
export function civicLegDuration(params: CivicLegParams): number {
    const loader = civicInternalShuttle(params.buildingModules, params.buildingItemId)
    if (!loader) return contributeDuration(params.cargoMass, params.entityZ)
    return calc_onesided_duration(
        loader.thrust,
        loader.mass,
        params.entityZ,
        params.buildingZ,
        getEntityClass(params.entityKind),
        getEntityClass(params.buildingKind),
        params.cargoMass
    )
}

export interface DepotTransferParams {
    depotModules: ServerContract.Types.module_entry[]
    depotItemId: number
    depotKind: NameType
    depotZ: number
    shipKind: NameType
    shipZ: number
    cargoMass: number
}

/** @deprecated Use civicLegDuration. */
export function depotTransferDuration(params: DepotTransferParams): number {
    return civicLegDuration({
        buildingModules: params.depotModules,
        buildingItemId: params.depotItemId,
        buildingKind: params.depotKind,
        buildingZ: params.depotZ,
        entityKind: params.shipKind,
        entityZ: params.shipZ,
        cargoMass: params.cargoMass,
    })
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

/** @deprecated Use civicLegDuration. */
export function civicDropoffDuration(params: CivicDropoffParams): number {
    return civicLegDuration({
        buildingModules: params.buildingModules,
        buildingItemId: params.buildingItemId,
        buildingKind: params.buildingKind,
        buildingZ: params.buildingZ,
        entityKind: params.shipKind,
        entityZ: params.shipZ,
        cargoMass: params.cargoMass,
    })
}
