import recipes from '../data/recipes.json'
import {getRecipe, type Recipe} from '../data/recipes-runtime'
import {getItem} from '../data/catalog'
import {getStatDefinitions} from './stats'
import {SLOT_FORMULAS, type SlotConsumerKind} from '../data/capability-formulas'
import {KIND_TO_ITEM_ID} from './capability-mappings'

export function getAllRecipes(): Recipe[] {
    return recipes as unknown as Recipe[]
}

const ITEM_ID_TO_KIND = new Map<number, SlotConsumerKind>()
for (const [kind, itemId] of Object.entries(KIND_TO_ITEM_ID) as [SlotConsumerKind, number][]) {
    ITEM_ID_TO_KIND.set(itemId, kind)
}

// Traces a stat index down to the raw category stat label it carries (Sensor stat 0 → "Conductivity").
function resolveComponentStatLabel(itemId: number, statIndex: number): string | undefined {
    let item: ReturnType<typeof getItem>
    try {
        item = getItem(itemId)
    } catch {
        return undefined
    }
    if (item.type === 'resource' && item.category) {
        return getStatDefinitions(item.category)[statIndex]?.label
    }
    const recipe = getRecipe(itemId)
    const slot = recipe?.statSlots[statIndex]
    const source = slot?.sources[0]
    if (!recipe || !source) return undefined
    const input = recipe.inputs[source.inputIndex]
    if (!input) return undefined
    return resolveComponentStatLabel(input.itemId, source.statIndex)
}

export interface StatFlow {
    slotIndex: number
    capability?: string
    attribute?: string
    sourceStatIndex: number
    sourceStatLabel?: string
}

export interface RecipeConsumer {
    outputItemId: number
    quantity: number
    statFlows: StatFlow[]
}

/** Every recipe that consumes `componentItemId`, with how its stats flow through. */
export function getRecipeConsumers(componentItemId: number): RecipeConsumer[] {
    const out: RecipeConsumer[] = []
    for (const recipe of getAllRecipes()) {
        for (let inputIndex = 0; inputIndex < recipe.inputs.length; inputIndex++) {
            if (recipe.inputs[inputIndex].itemId !== componentItemId) continue
            const kind = ITEM_ID_TO_KIND.get(recipe.outputItemId)
            const formulas = kind ? SLOT_FORMULAS[kind] : undefined
            const statFlows: StatFlow[] = []
            for (let slotIndex = 0; slotIndex < recipe.statSlots.length; slotIndex++) {
                for (const source of recipe.statSlots[slotIndex].sources) {
                    if (source.inputIndex !== inputIndex) continue
                    const consumer = formulas?.[slotIndex]
                    statFlows.push({
                        slotIndex,
                        capability: consumer?.capability,
                        attribute: consumer?.attribute,
                        sourceStatIndex: source.statIndex,
                        sourceStatLabel: resolveComponentStatLabel(
                            componentItemId,
                            source.statIndex
                        ),
                    })
                }
            }
            out.push({
                outputItemId: recipe.outputItemId,
                quantity: recipe.inputs[inputIndex].quantity,
                statFlows,
            })
        }
    }
    return out
}

export interface DemandRow {
    itemId: number
    consumerCount: number
    statSourceCount: number
    sinkOnlyCount: number
    consumers: number[]
}

/** Demand tally for every item consumed as a recipe input, ascending by usage. */
export function getComponentDemand(): DemandRow[] {
    const inputIds = new Set<number>()
    for (const recipe of getAllRecipes()) {
        for (const input of recipe.inputs) inputIds.add(input.itemId)
    }
    const rows: DemandRow[] = []
    for (const itemId of inputIds) {
        const consumers = getRecipeConsumers(itemId)
        let statSourceCount = 0
        let sinkOnlyCount = 0
        for (const c of consumers) {
            if (c.statFlows.length > 0) statSourceCount++
            else sinkOnlyCount++
        }
        rows.push({
            itemId,
            consumerCount: consumers.length,
            statSourceCount,
            sinkOnlyCount,
            consumers: consumers.map((c) => c.outputItemId),
        })
    }
    return rows.sort((a, b) => a.consumerCount - b.consumerCount || a.itemId - b.itemId)
}
