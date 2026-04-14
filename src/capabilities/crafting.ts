import {UInt16, UInt32} from '@wharfkit/antelope'
import {CRAFT_ENERGY_DIVISOR} from '../types'
import type {EntityCapabilities} from '../types/capabilities'
import {ServerContract} from '../contracts'

export interface CrafterCapability {
    crafter: ServerContract.Types.crafter_stats
}

export function capsHasCrafter(caps: EntityCapabilities): boolean {
    return caps.crafter !== undefined
}

export function calc_craft_duration(
    speed: number,
    totalInputMass: number,
    quantity: number
): UInt32 {
    const duration = Math.floor((totalInputMass * quantity) / speed)
    return UInt32.from(Math.max(duration, 1))
}

export function calc_craft_energy(drain: number, totalInputMass: number): UInt16 {
    const raw = Math.floor((totalInputMass * drain) / CRAFT_ENERGY_DIVISOR)
    return UInt16.from(Math.min(raw, 65535))
}
