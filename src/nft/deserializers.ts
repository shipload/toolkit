import {getEntitySlotLayout} from '../data/recipes'
import {
    ITEM_TYPE_COMPONENT,
    ITEM_TYPE_ENTITY,
    ITEM_TYPE_MODULE,
    ITEM_TYPE_RESOURCE,
    itemTypeCode,
} from '../data/tiers'

export interface NFTInstalledModule {
    item_id: number
    stats: string
}

export interface NFTModuleSlot {
    type: number
    installed?: NFTInstalledModule
}

export interface NFTCargoItem {
    item_id: number
    quantity: number
    stats: string
    modules?: NFTModuleSlot[]
}

export interface NFTCommonBase {
    quantity: number
    stats: string
    origin_x: string
    origin_y: string
}

export function readCommonBase(data: Record<string, any>): NFTCommonBase {
    return {
        quantity: Number(data.quantity),
        stats: String(data.stats),
        origin_x: String(data.origin_x),
        origin_y: String(data.origin_y),
    }
}

export function deserializeScalar(data: Record<string, any>, itemId: number): NFTCargoItem {
    const base = readCommonBase(data)
    return {item_id: itemId, quantity: base.quantity, stats: base.stats}
}

export const deserializeResource = deserializeScalar
export const deserializeComponent = deserializeScalar
export const deserializeModule = deserializeScalar

export function deserializeEntity(data: Record<string, any>, itemId: number): NFTCargoItem {
    const base = readCommonBase(data)
    const moduleItems: number[] = (data.module_items ?? []).map((v: any) => Number(v))
    const moduleStats: string[] = (data.module_stats ?? []).map((v: any) => String(v))
    const layout = getEntitySlotLayout(itemId)

    const modules: NFTModuleSlot[] = layout.map((slot, i) => ({
        type: slot.type,
        installed:
            moduleItems[i] && moduleItems[i] !== 0
                ? {item_id: moduleItems[i], stats: moduleStats[i]}
                : undefined,
    }))

    return {item_id: itemId, quantity: base.quantity, stats: base.stats, modules}
}

export function deserializeAsset(data: Record<string, any>, itemId: number): NFTCargoItem {
    const type = itemTypeCode(itemId)
    switch (type) {
        case ITEM_TYPE_RESOURCE:
        case ITEM_TYPE_COMPONENT:
        case ITEM_TYPE_MODULE:
            return deserializeScalar(data, itemId)
        case ITEM_TYPE_ENTITY:
            return deserializeEntity(data, itemId)
        default:
            throw new Error(`unknown item type ${type} for item ${itemId}`)
    }
}
