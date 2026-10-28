import {getItem} from '../data/catalog'
import {SLOT_FORMULAS, type SlotConsumerKind} from '../data/capability-formulas'
import {getRecipe, type Recipe} from '../data/recipes-runtime'
import {KIND_TO_ITEM_ID} from '../derivation/capability-mappings'
import {getItemStatSlots, isMeanSource} from '../derivation/crafting'
import {getStatName} from '../derivation/stats'
import type {ResourceCategory} from '../types'

export interface StatFlowSource {
    itemId: number
    slot: number
    label: string
    share: number
    fixed: boolean
    sources: StatFlowSource[]
}

export interface StatFlowAttribute {
    slot: number
    label: string
    fixed: boolean
    sources: StatFlowSource[]
}

export interface StatFlowLink {
    itemId: number
    label: string
}

export interface StatFlowFeed {
    attribute: string
    share: number
    path: StatFlowLink[]
}

export interface StatFlowResource {
    itemId: number
    statIndex: number
    stat: string
    feeds: StatFlowFeed[]
}

const KIND_BY_ITEM = new Map<number, SlotConsumerKind>(
    (Object.entries(KIND_TO_ITEM_ID) as [SlotConsumerKind, number][]).map(([k, id]) => [id, k])
)

function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1)
}

export function statSlotLabel(itemId: number, slot: number): string {
    const item = getItem(itemId)
    if (item.type === 'resource') {
        return item.category
            ? getStatName(item.category as ResourceCategory, slot as 0 | 1 | 2).label
            : `Stat ${slot + 1}`
    }
    const kind = (item.moduleType as SlotConsumerKind | undefined) ?? KIND_BY_ITEM.get(itemId)
    const consumer = kind ? SLOT_FORMULAS[kind]?.[slot] : undefined
    if (consumer) return capitalize(consumer.attribute)
    return getItemStatSlots(itemId).find((s) => s.index === slot)?.label ?? `Stat ${slot + 1}`
}

function traceSlot(recipe: Recipe, slot: number, seen: Set<number>): StatFlowSource[] {
    const sources = recipe.statSlots[slot]?.sources ?? []
    const total = sources.reduce((sum, s) => sum + (s.weight ?? 1), 0)
    return sources.flatMap((src) => {
        if (isMeanSource(src)) return []
        const input = recipe.inputs[src.inputIndex]
        if (!input) return []
        const share = (src.weight ?? 1) / total
        const item = getItem(input.itemId)
        const label = statSlotLabel(input.itemId, src.statIndex)
        if (item.type === 'resource') {
            return [
                {
                    itemId: input.itemId,
                    slot: src.statIndex,
                    label,
                    share,
                    fixed: false,
                    sources: [],
                },
            ]
        }
        const sub = getRecipe(input.itemId)
        if (!sub || seen.has(input.itemId)) return []
        const next = new Set(seen).add(input.itemId)
        const deeper = traceSlot(sub, src.statIndex, next)
        return [
            {
                itemId: input.itemId,
                slot: src.statIndex,
                label,
                share,
                fixed: deeper.length === 0,
                sources: deeper,
            },
        ]
    })
}

export function statFlow(itemId: number): StatFlowAttribute[] {
    const recipe = getRecipe(itemId)
    if (!recipe) return []
    return recipe.statSlots.map((_, slot) => {
        const sources = traceSlot(recipe, slot, new Set([itemId]))
        return {
            slot,
            label: statSlotLabel(itemId, slot),
            fixed: sources.every((s) => s.fixed),
            sources,
        }
    })
}

export function statFlowByResource(itemId: number): StatFlowResource[] {
    const out = new Map<string, StatFlowResource>()
    const walk = (
        attribute: string,
        sources: StatFlowSource[],
        share: number,
        path: StatFlowLink[]
    ): void => {
        for (const s of sources) {
            if (s.fixed) continue
            const at = share * s.share
            if (s.sources.length === 0) {
                const key = `${s.itemId}:${s.slot}`
                let entry = out.get(key)
                if (!entry) {
                    entry = {
                        itemId: s.itemId,
                        statIndex: s.slot,
                        stat: s.label,
                        feeds: [],
                    }
                    out.set(key, entry)
                }
                const route = path.map((p) => `${p.itemId}:${p.label}`).join('>')
                const same = entry.feeds.find(
                    (f) =>
                        f.attribute === attribute &&
                        f.path.map((p) => `${p.itemId}:${p.label}`).join('>') === route
                )
                if (same) same.share += at
                else entry.feeds.push({attribute, share: at, path})
                continue
            }
            walk(attribute, s.sources, at, [{itemId: s.itemId, label: s.label}, ...path])
        }
    }
    for (const attr of statFlow(itemId)) walk(attr.label, attr.sources, 1, [])
    return [...out.values()]
}

export type StatFlowRow =
    | {
          kind: 'gather'
          itemId: number
          stat: string
          share: number
          through: number[]
      }
    | {kind: 'upgrade'; itemId: number; label: string; share: number}
    | {kind: 'fixed'; itemId: number; share: number}

export interface StatFlowPlate {
    slot: number
    label: string
    rows: StatFlowRow[]
}

const ROW_ORDER: Record<StatFlowRow['kind'], number> = {
    gather: 0,
    upgrade: 1,
    fixed: 2,
}

function sameRow(a: StatFlowRow, b: StatFlowRow): boolean {
    if (a.kind !== b.kind || a.itemId !== b.itemId) return false
    return a.kind !== 'gather' || b.kind !== 'gather' || a.stat === b.stat
}

export function statFlowPlates(itemId: number): StatFlowPlate[] {
    return statFlow(itemId)
        .filter((attr) => attr.sources.length > 0)
        .map((attr) => {
            const rows: StatFlowRow[] = []
            const add = (row: StatFlowRow): void => {
                const same = rows.find((r) => sameRow(r, row))
                if (same) same.share += row.share
                else rows.push(row)
            }
            const walk = (sources: StatFlowSource[], share: number, through: number[]): void => {
                for (const s of sources) {
                    const at = share * s.share
                    const type = getItem(s.itemId).type
                    if (s.fixed) add({kind: 'fixed', itemId: s.itemId, share: at})
                    else if (type === 'resource') {
                        add({
                            kind: 'gather',
                            itemId: s.itemId,
                            stat: s.label,
                            share: at,
                            through,
                        })
                    } else if (type === 'component') walk(s.sources, at, [...through, s.itemId])
                    else
                        add({
                            kind: 'upgrade',
                            itemId: s.itemId,
                            label: s.label,
                            share: at,
                        })
                }
            }
            walk(attr.sources, 1, [])
            rows.sort((a, b) => ROW_ORDER[a.kind] - ROW_ORDER[b.kind] || b.share - a.share)
            return {slot: attr.slot, label: attr.label, rows}
        })
}
