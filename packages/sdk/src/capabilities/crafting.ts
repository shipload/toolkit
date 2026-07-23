import {UInt32} from '@wharfkit/antelope'
import {CRAFT_ENERGY_DIVISOR} from '../types'
import type {CrafterStats, EntityCapabilities} from '../types/capabilities'

export interface CrafterCapability {
    crafter: CrafterStats
}

export function capsHasCrafter(caps: EntityCapabilities): boolean {
    return caps.crafter !== undefined
}

export function calc_craft_duration(speed: number, totalInputMass: number): UInt32 {
    const duration = Math.floor(totalInputMass / speed)
    return UInt32.from(duration + 1)
}

// Mirrors contract config.hpp INTAKE_RATE (provisional; a numbers pass will retune it).
export const INTAKE_RATE = 36000

// Mirrors calc_cluster_intake: whole seconds of intake for cargo sourced off other cluster members.
export function calcClusterIntake(sourcedMass: number): number {
    return Math.floor(sourcedMass / INTAKE_RATE)
}

// Mirrors clustercraft duration: base craft duration + intake time.
export function calcClustercraftDuration(
    speed: number,
    totalInputMass: number,
    sourcedMass: number
): UInt32 {
    return UInt32.from(
        calc_craft_duration(speed, totalInputMass).toNumber() + calcClusterIntake(sourcedMass)
    )
}

export function calc_craft_energy(drain: number, totalInputMass: number): UInt32 {
    const raw = Math.floor((totalInputMass * drain) / CRAFT_ENERGY_DIVISOR)
    return UInt32.from(Math.min(Math.max(raw + 1, 1000), 4294967295))
}

// Craft-identical today; forked so build balance can diverge from craft without touching it.
export function calc_build_duration(speed: number, totalInputMass: number): UInt32 {
    return calc_craft_duration(speed, totalInputMass)
}

export function calc_build_energy(drain: number, totalInputMass: number): UInt32 {
    return calc_craft_energy(drain, totalInputMass)
}
