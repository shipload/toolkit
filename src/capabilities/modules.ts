export const ITEM_ENGINE_T1 = 10100
export const ITEM_GENERATOR_T1 = 10101
export const ITEM_EXTRACTOR_T1 = 10102
export const ITEM_LOADER_T1 = 10103
export const ITEM_MANUFACTURING_T1 = 10104
export const ITEM_STORAGE_T1 = 10105
export const ITEM_HAULER_T1 = 10106

export const MODULE_ANY = 0
export const MODULE_ENGINE = 1
export const MODULE_GENERATOR = 2
export const MODULE_EXTRACTOR = 3
export const MODULE_LOADER = 4
export const MODULE_WARP = 5
export const MODULE_CRAFTER = 6
export const MODULE_LAUNCHER = 7
export const MODULE_STORAGE = 8
export const MODULE_HAULER = 9

export interface CargoSeed {
    itemId: number
    seed: bigint
}

export interface ModuleEntry {
    type: number
    installed?: CargoSeed
}

export function moduleAccepts(slotType: number, moduleType: number): boolean {
    return slotType === MODULE_ANY || slotType === moduleType
}

export function getModuleCapabilityType(itemId: number): number {
    switch (itemId) {
        case ITEM_ENGINE_T1:
            return MODULE_ENGINE
        case ITEM_GENERATOR_T1:
            return MODULE_GENERATOR
        case ITEM_EXTRACTOR_T1:
            return MODULE_EXTRACTOR
        case ITEM_LOADER_T1:
            return MODULE_LOADER
        case ITEM_MANUFACTURING_T1:
            return MODULE_CRAFTER
        case ITEM_STORAGE_T1:
            return MODULE_STORAGE
        case ITEM_HAULER_T1:
            return MODULE_HAULER
        default:
            return 0xff
    }
}

export function isModuleItem(itemId: number): boolean {
    return getModuleCapabilityType(itemId) !== 0xff
}
