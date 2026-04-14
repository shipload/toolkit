export type CraftedItemCategory = 'component' | 'module' | 'entity' | 'resource'

export const ITEM_TYPE_RESOURCE = 0
export const ITEM_TYPE_COMPONENT = 1
export const ITEM_TYPE_MODULE = 2
export const ITEM_TYPE_ENTITY = 3

export function itemTypeCode(id: number): number {
    switch (itemCategory(id)) {
        case 'resource':
            return ITEM_TYPE_RESOURCE
        case 'component':
            return ITEM_TYPE_COMPONENT
        case 'module':
            return ITEM_TYPE_MODULE
        case 'entity':
            return ITEM_TYPE_ENTITY
    }
}

export function itemTier(id: number): number {
    if (id < 10000) return 0
    return Math.floor(id / 10000)
}

export function itemOffset(id: number): number {
    return id % 10000
}

export function itemCategory(id: number): CraftedItemCategory {
    if (id < 10000) return 'resource'
    const offset = itemOffset(id)
    if (offset >= 200) return 'entity'
    if (offset >= 100) return 'module'
    return 'component'
}

export function isRelatedItem(a: number, b: number): boolean {
    if (a < 10000 || b < 10000) return false
    return itemOffset(a) === itemOffset(b)
}

export function isCraftedItem(id: number): boolean {
    return id >= 10000
}
