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

export function calc_craft_energy(drain: number, totalInputMass: number): UInt32 {
    const raw = Math.floor((totalInputMass * drain) / CRAFT_ENERGY_DIVISOR)
    return UInt32.from(Math.min(Math.max(raw + 1, 1000), 4294967295))
}
