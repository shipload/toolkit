import {SLOT_FORMULAS, type SlotConsumerKind} from '../data/capability-formulas'
import {getStatDefinitions, type StatDefinition} from './stats'
import {
    getRecipe,
    type Recipe,
    type RecipeInput,
    type RecipeInputCategory,
} from '../data/recipes-runtime'
import {
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_GATHERER_T1,
    ITEM_LOADER_T1,
    ITEM_CRAFTER_T1,
    ITEM_STORAGE_T1,
    ITEM_HAULER_T1,
    ITEM_WARP_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_CONTAINER_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
} from '../data/item-ids'
import type {StatMapping} from '../data/capabilities'

export const KIND_TO_ITEM_ID: Record<SlotConsumerKind, number> = {
    engine: ITEM_ENGINE_T1,
    generator: ITEM_GENERATOR_T1,
    gatherer: ITEM_GATHERER_T1,
    loader: ITEM_LOADER_T1,
    crafter: ITEM_CRAFTER_T1,
    storage: ITEM_STORAGE_T1,
    hauler: ITEM_HAULER_T1,
    warp: ITEM_WARP_T1,
    'ship-t1': ITEM_SHIP_T1_PACKED,
    'container-t1': ITEM_CONTAINER_T1_PACKED,
    'warehouse-t1': ITEM_WAREHOUSE_T1_PACKED,
    'container-t2': ITEM_CONTAINER_T2_PACKED,
}

function isCategoryInput(input: RecipeInput): input is RecipeInputCategory {
    return 'category' in input
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
    if (isCategoryInput(input)) {
        const defs = getStatDefinitions(input.category)
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
        for (const [slotIdxStr, consumer] of Object.entries(slots)) {
            const slotIdx = Number(slotIdxStr)
            const slot = recipe.statSlots[slotIdx]
            if (!slot) continue
            for (const source of slot.sources) {
                const stat = traceToRawCategoryStat(recipe, source)
                if (!stat) continue
                const key = `${stat.label}|${consumer.capability}|${consumer.attribute}`
                if (seen.has(key)) continue
                seen.add(key)
                out.push({
                    stat: stat.label,
                    capability: consumer.capability,
                    attribute: consumer.attribute,
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
