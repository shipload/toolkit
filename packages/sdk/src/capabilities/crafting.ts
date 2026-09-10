import {UInt32} from '@wharfkit/antelope'
import {CRAFT_ENERGY_DIVISOR, MASS_STAT_SCALE} from '../types'
import type {CrafterStats, EntityCapabilities} from '../types/capabilities'
import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import type {Recipe} from '../data/recipes-runtime'

export interface CrafterCapability {
    crafter: CrafterStats
}

export function capsHasCrafter(caps: EntityCapabilities): boolean {
    return caps.crafter !== undefined
}

export function calc_craft_duration(speed: number, totalInputMass: number): UInt32 {
    const duration = Math.floor((totalInputMass * MASS_STAT_SCALE) / speed)
    return UInt32.from(duration + 1)
}

export const INTAKE_RATE = 360

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

export function craftEnergyCost(
    lane: ServerContract.Types.crafter_lane,
    recipe: Recipe,
    units: number
): number {
    if (units <= 0) return 0
    const inputMassPerUnit = recipe.inputs.reduce(
        (sum, input) => sum + getItem(input.itemId).mass * input.quantity,
        0
    )
    return Number(calc_craft_energy(lane.drain.toNumber(), inputMassPerUnit * units))
}

// Craft-identical today; forked so build balance can diverge from craft without touching it.
export function calc_build_duration(speed: number, totalInputMass: number): UInt32 {
    return calc_craft_duration(speed, totalInputMass)
}

export function calc_build_energy(drain: number, totalInputMass: number): UInt32 {
    return calc_craft_energy(drain, totalInputMass)
}
