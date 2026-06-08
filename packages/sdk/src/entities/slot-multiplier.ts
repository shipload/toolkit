import type {EntitySlot} from '../data/recipes-runtime'
import type {ServerContract} from '../contracts'

export const U16_MAX = 65535

export interface InstalledModule {
    slotIndex: number
    itemId: number
    stats: bigint
}

export function packedModulesToInstalled(
    entries: ServerContract.Types.module_entry[]
): InstalledModule[] {
    const installed: InstalledModule[] = []
    entries.forEach((entry, slotIndex) => {
        if (!entry.installed) return
        installed.push({
            slotIndex,
            itemId: Number(entry.installed.item_id.value),
            stats: BigInt(entry.installed.stats.toString()),
        })
    })
    return installed
}

export function clampUint16(value: number): number {
    return Math.min(value, U16_MAX)
}

export const clampUint32 = (v: number): number => Math.min(Math.max(Math.floor(v), 0), 4294967295)

export function applySlotMultiplier(value: number, outputPct: number): number {
    return clampUint16(Math.floor((value * outputPct) / 100))
}

export function getSlotAmp(layout: EntitySlot[], slotIndex: number): number {
    return layout[slotIndex]?.outputPct ?? 100
}
