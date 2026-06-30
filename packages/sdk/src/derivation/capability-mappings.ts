import {SLOT_FORMULAS, type SlotConsumerKind} from '../data/capability-formulas'
import {getStatDefinitions, type StatDefinition} from './stats'
import {getRecipe, type Recipe} from '../data/recipes-runtime'
import {getItem} from '../data/catalog'
import {
    ITEM_ENGINE_T1,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_GENERATOR_T1,
    ITEM_GATHERER_T1,
    ITEM_LOADER_T1,
    ITEM_CRAFTER_T1,
    ITEM_STORAGE_T1,
    ITEM_HAULER_T1,
    ITEM_WARP_T1,
    ITEM_BATTERY_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_CONTAINER_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
} from '../data/item-ids'
import type {StatMapping, CapabilityAttributeRow} from '../data/capabilities'
import {capabilityAttributes} from '../data/capabilities'

export const KIND_TO_ITEM_ID: Record<SlotConsumerKind, number> = {
    engine: ITEM_ENGINE_T1,
    generator: ITEM_GENERATOR_T1,
    gatherer: ITEM_GATHERER_T1,
    loader: ITEM_LOADER_T1,
    crafter: ITEM_CRAFTER_T1,
    storage: ITEM_STORAGE_T1,
    hauler: ITEM_HAULER_T1,
    warp: ITEM_WARP_T1,
    battery: ITEM_BATTERY_T1,
    'ship-t1': ITEM_SHIP_T1_PACKED,
    'container-t1': ITEM_CONTAINER_T1_PACKED,
    'warehouse-t1': ITEM_WAREHOUSE_T1_PACKED,
    'extractor-t1': ITEM_EXTRACTOR_T1_PACKED,
    'container-t2': ITEM_CONTAINER_T2_PACKED,
}

/**
 * Walk a recipe's slot source down to the raw category stat that ultimately
 * lands in that slot. Returns the StatDefinition or undefined if the trace
 * dead-ends (unknown sub-component, missing slot, etc.).
 *
 * Multi-source sub-slots collapse to `sources[0]`; top-level multi-source slots
 * are expanded by the caller (`deriveStatMappings`).
 */
function traceToRawCategoryStat(
    recipe: Recipe,
    source: {inputIndex: number; statIndex: number},
    visited: Set<number> = new Set()
): StatDefinition | undefined {
    const input = recipe.inputs[source.inputIndex]
    if (!input) return undefined
    const inputItem = getItem(input.itemId)
    if (inputItem.type === 'resource' && inputItem.category) {
        const defs = getStatDefinitions(inputItem.category)
        return defs[source.statIndex]
    }
    if (visited.has(input.itemId)) return undefined
    const subRecipe = getRecipe(input.itemId)
    if (!subRecipe) return undefined
    const subSlot = subRecipe.statSlots[source.statIndex]
    if (!subSlot) return undefined
    const subSource = subSlot.sources[0]
    if (!subSource) return undefined
    const nextVisited = new Set(visited)
    nextVisited.add(input.itemId)
    return traceToRawCategoryStat(subRecipe, subSource, nextVisited)
}

// Producing role for a capability·attribute: entity hull slots all roll up to "Hull"; modules use their own name.
export function sourceLabelForOutput(itemId: number): string {
    const item = getItem(itemId)
    return item.type === 'entity' ? 'Hull' : item.name
}

let cached: StatMapping[] | undefined

export function deriveStatMappings(): StatMapping[] {
    if (cached) return cached
    const out: StatMapping[] = []
    const seen = new Set<string>()
    for (const [kind, slots] of Object.entries(SLOT_FORMULAS) as [
        SlotConsumerKind,
        Record<number, {capability: string; attribute: string}>,
    ][]) {
        const itemId = KIND_TO_ITEM_ID[kind]
        const recipe = getRecipe(itemId)
        if (!recipe) continue
        const source = sourceLabelForOutput(itemId)
        for (const [slotIdxStr, consumer] of Object.entries(slots)) {
            const slotIdx = Number(slotIdxStr)
            const slot = recipe.statSlots[slotIdx]
            if (!slot) continue
            for (const src of slot.sources) {
                const stat = traceToRawCategoryStat(recipe, src)
                if (!stat) continue
                const key = `${stat.label}|${consumer.capability}|${consumer.attribute}|${source}`
                if (seen.has(key)) continue
                seen.add(key)
                out.push({
                    stat: stat.label,
                    capability: consumer.capability,
                    attribute: consumer.attribute,
                    source,
                })
            }
        }
    }
    cached = out
    return out
}

export function getStatMappings(): StatMapping[] {
    return deriveStatMappings()
}

export function getStatMappingsForStat(stat: string): StatMapping[] {
    return deriveStatMappings().filter((m) => m.stat === stat)
}

export function getStatMappingsForCapability(capability: string): StatMapping[] {
    return deriveStatMappings().filter((m) => m.capability === capability)
}

export function getProducersForAttribute(capability: string, attribute: string): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const m of deriveStatMappings()) {
        if (m.capability !== capability || m.attribute !== attribute) continue
        if (seen.has(m.source)) continue
        seen.add(m.source)
        out.push(m.source)
    }
    return out
}

export function getCapabilityAttributeRows(): CapabilityAttributeRow[] {
    const rows: CapabilityAttributeRow[] = []
    for (const ca of capabilityAttributes) {
        const producers = getProducersForAttribute(ca.capability, ca.attribute)
        if (producers.length === 0) {
            rows.push({
                capability: ca.capability,
                attribute: ca.attribute,
                description: ca.description,
            })
            continue
        }
        for (const source of producers) {
            rows.push({
                capability: ca.capability,
                attribute: ca.attribute,
                description: ca.description,
                source,
            })
        }
    }
    return rows
}
