import {UInt16, UInt16Type} from '@wharfkit/antelope'
import items from './items.json'
import {tierLabels} from './colors'
import {itemMetadata} from './metadata'
import {CATEGORY_LABELS, Item, ItemType, ModuleType, ResourceCategory} from '../types'

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

export function getResources(opts?: {category?: ResourceCategory; tier?: number}): Item[] {
    const out: Item[] = []
    for (const item of itemsById.values()) {
        if (item.type !== 'resource') continue
        if (opts?.category !== undefined && item.category !== opts.category) continue
        if (opts?.tier !== undefined && item.tier !== opts.tier) continue
        out.push(item)
    }
    return out
}

export function getComponents(opts?: {tier?: number}): Item[] {
    const out: Item[] = []
    for (const item of itemsById.values()) {
        if (item.type !== 'component') continue
        if (opts?.tier !== undefined && item.tier !== opts.tier) continue
        out.push(item)
    }
    return out
}

export function getModules(opts?: {moduleType?: ModuleType; tier?: number}): Item[] {
    const out: Item[] = []
    for (const item of itemsById.values()) {
        if (item.type !== 'module') continue
        if (opts?.moduleType !== undefined && item.moduleType !== opts.moduleType) continue
        if (opts?.tier !== undefined && item.tier !== opts.tier) continue
        out.push(item)
    }
    return out
}

export function getEntityItems(opts?: {tier?: number}): Item[] {
    const out: Item[] = []
    for (const item of itemsById.values()) {
        if (item.type !== 'entity') continue
        if (opts?.tier !== undefined && item.tier !== opts.tier) continue
        out.push(item)
    }
    return out
}

export function __registerItemInternal(item: Item): void {
    itemsById.set(item.id, item)
}

export function resolveItemCategory(id: number): ResourceCategory | undefined {
    const item = itemsById.get(id)
    return item?.category
}

const TYPE_LABEL_BY_STRING: Record<ItemType, string> = {
    resource: 'Resource',
    component: 'Component',
    module: 'Module',
    entity: 'Entity',
}

const TYPE_BY_INDEX: ItemType[] = ['resource', 'component', 'module', 'entity']

export function typeLabel(type: ItemType | number): string {
    if (typeof type === 'number') {
        const t = TYPE_BY_INDEX[type]
        return t ? TYPE_LABEL_BY_STRING[t] : `type ${type}`
    }
    return TYPE_LABEL_BY_STRING[type] ?? `type ${type}`
}

export function categoryLabel(cat: ResourceCategory): string {
    return CATEGORY_LABELS[cat]
}

export function tierLabel(tier: number): string {
    return tierLabels[tier] ?? `T${tier}`
}

// Chain rescat enum order from server::getrescats.
// IMPORTANT: gas=1, crystal=4 — does NOT match the player-facing T-prefix
// order (ore=100, crystal=200, gas=300, regolith=400, biomass=500).
// Do not "fix" this ordering — it must stay aligned with the contract enum.
const CATEGORY_BY_INDEX: ResourceCategory[] = ['ore', 'gas', 'regolith', 'biomass', 'crystal']

export function categoryFromIndex(i: number): ResourceCategory | undefined {
    return CATEGORY_BY_INDEX[i]
}

export function categoryLabelFromIndex(i: number): string {
    const cat = categoryFromIndex(i)
    return cat ? CATEGORY_LABELS[cat] : `category ${i}`
}
