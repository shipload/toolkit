import {
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_STORAGE_T1,
    ITEM_WARP_T1,
} from '../data/item-ids'

export const MODULE_ANY = 0
export const MODULE_ENGINE = 1
export const MODULE_GENERATOR = 2
export const MODULE_GATHERER = 3
export const MODULE_LOADER = 4
export const MODULE_WARP = 5
export const MODULE_CRAFTER = 6
export const MODULE_LAUNCHER = 7
export const MODULE_STORAGE = 8
export const MODULE_HAULER = 9

export interface PackedModule {
    itemId: number
    stats: bigint
}

export interface ModuleEntry {
    type: number
    installed?: PackedModule
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
        case ITEM_GATHERER_T1:
            return MODULE_GATHERER
        case ITEM_LOADER_T1:
            return MODULE_LOADER
        case ITEM_CRAFTER_T1:
            return MODULE_CRAFTER
        case ITEM_STORAGE_T1:
            return MODULE_STORAGE
        case ITEM_HAULER_T1:
            return MODULE_HAULER
        case ITEM_WARP_T1:
            return MODULE_WARP
        default:
            return 0xff
    }
}

export function isModuleItem(itemId: number): boolean {
    return getModuleCapabilityType(itemId) !== 0xff
}

export function moduleSlotTypeToCode(slotType: string): number {
    switch (slotType) {
        case 'any':
            return MODULE_ANY
        case 'engine':
            return MODULE_ENGINE
        case 'generator':
            return MODULE_GENERATOR
        case 'gatherer':
            return MODULE_GATHERER
        case 'loader':
            return MODULE_LOADER
        case 'warp':
            return MODULE_WARP
        case 'crafter':
            return MODULE_CRAFTER
        case 'launcher':
            return MODULE_LAUNCHER
        case 'storage':
            return MODULE_STORAGE
        case 'hauler':
            return MODULE_HAULER
        default:
            return MODULE_ANY
    }
}
