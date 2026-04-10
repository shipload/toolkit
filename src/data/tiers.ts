export type CraftedItemCategory = 'component' | 'module' | 'entity' | 'resource'

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
