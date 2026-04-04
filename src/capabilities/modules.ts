export const ITEM_ENGINE_T1 = 10006
export const ITEM_GENERATOR_T1 = 10007

export const MODULE_ANY = 0
export const MODULE_ENGINE = 1
export const MODULE_GENERATOR = 2
export const MODULE_EXTRACTOR = 3
export const MODULE_LOADER = 4
export const MODULE_WARP = 5
export const MODULE_CRAFTER = 6
export const MODULE_LAUNCHER = 7

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
        default:
            return 0xff
    }
}

export function isModuleItem(itemId: number): boolean {
    return getModuleCapabilityType(itemId) !== 0xff
}
