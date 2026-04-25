import {UInt16, UInt16Type} from '@wharfkit/antelope'
import items from '../data/items.json'
import {itemMetadata} from '../data/metadata'
import {Item} from '../types'

const itemsById = new Map<number, Item>()

for (const raw of items as any[]) {
    const meta = itemMetadata[raw.id]
    if (!meta) {
        throw new Error(`Missing metadata for item ${raw.id}. Add an entry to metadata.ts.`)
    }
    itemsById.set(raw.id, {
        id: raw.id,
        name: meta.name,
        description: meta.description,
        color: meta.color,
        mass: raw.mass,
        type: raw.type,
        tier: raw.tier,
        category: raw.category,
        moduleType: raw.type === 'module' ? raw.subtype : undefined,
    })
}

export const itemIds = Array.from(itemsById.keys())

export function getItem(itemId: UInt16Type): Item {
    const id = UInt16.from(itemId).toNumber()
    const item = itemsById.get(id)
    if (!item) throw new Error(`Unknown item id: ${id}`)
    return item
}

export function getItems(): Item[] {
    return Array.from(itemsById.values())
}

export function __registerItemInternal(item: Item): void {
    itemsById.set(item.id, item)
}
