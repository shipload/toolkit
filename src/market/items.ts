import {UInt16, UInt16Type} from '@wharfkit/antelope'
import {Item} from '../types'
import itemsData from '../data/items.json'

const items: Item[] = itemsData.map((g) =>
    Item.from({
        id: g.id,
        name: g.name,
        description: g.description,
        mass: g.mass,
        category: g.category,
        tier: g.tier,
        color: g.color,
    })
)

export const itemIds = items.map((i) => i.id)

export function getItem(itemId: UInt16Type): Item {
    const id = UInt16.from(itemId)
    const item = items.find((i) => i.id.equals(id))
    if (!item) {
        throw new Error(`Item with id ${id} not found`)
    }
    return item
}

export function getItems(): Item[] {
    return items
}
