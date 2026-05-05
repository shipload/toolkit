import type {EntitySlot} from '../data/recipes-runtime'

export const U16_MAX = 65535

export interface InstalledModule {
    slotIndex: number
    itemId: number
    stats: bigint
}

export function clampUint16(value: number): number {
    return Math.min(value, U16_MAX)
}

export function applySlotMultiplier(value: number, outputPct: number): number {
    return clampUint16(Math.floor((value * outputPct) / 100))
}

export function getSlotAmp(layout: EntitySlot[], slotIndex: number): number {
    return layout[slotIndex]?.outputPct ?? 100
}
