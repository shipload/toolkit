import recipes from '../data/recipes.json'
import {SLOT_FORMULAS, type SlotConsumerKind} from '../data/capability-formulas'
import {getStatDefinitions, type StatDefinition} from './stats'
import type {ResourceCategory} from '../types'

export interface StatMapping {
    stat: string
    capability: string
    attribute: string
}

interface RecipeInputCategory {
    category: ResourceCategory
    tier: number
    quantity: number
}
interface RecipeInputItem {
    itemId: number
    quantity: number
}
type RecipeInput = RecipeInputCategory | RecipeInputItem

interface StatSlotSource {
    inputIndex: number
    statIndex: number
}
interface StatSlot {
    sources: StatSlotSource[]
}

interface RecipeRow {
    outputItemId: number
    outputMass: number
    inputs: RecipeInput[]
    statSlots: StatSlot[]
}

const RECIPES = recipes as RecipeRow[]
const RECIPE_BY_ID = new Map<number, RecipeRow>(RECIPES.map((r) => [r.outputItemId, r]))

const KIND_TO_ITEM_ID: Record<SlotConsumerKind, number> = {
    engine: 10100,
    generator: 10101,
    gatherer: 10102,
    loader: 10103,
    crafter: 10104,
    storage: 10105,
    hauler: 10106,
    warp: 10107,
    'ship-t1': 10201,
    'container-t1': 10200,
    'warehouse-t1': 10202,
    'container-t2': 20200,
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
export function traceToRawCategoryStat(
    recipe: RecipeRow,
    source: StatSlotSource,
    visited: Set<number> = new Set()
): StatDefinition | undefined {
    const input = recipe.inputs[source.inputIndex]
    if (!input) return undefined
    if (isCategoryInput(input)) {
        const defs = getStatDefinitions(input.category)
        return defs[source.statIndex]
    }
    if (visited.has(input.itemId)) return undefined
    const subRecipe = RECIPE_BY_ID.get(input.itemId)
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
        const recipe = RECIPE_BY_ID.get(itemId)
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
