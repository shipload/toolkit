import items from './items.json'
import recipes from './recipes.json'
import entities from './entities.json'

import {getItem} from '../market/items'
import {Item, ModuleType, ResourceCategory} from '../types'

export interface RecipeInputItemId {
    itemId: number
    quantity: number
}
export interface RecipeInputCategory {
    category: ResourceCategory
    tier: number
    quantity: number
}
export type RecipeInput = RecipeInputItemId | RecipeInputCategory

export interface StatSlot {
    sources: {inputIndex: number; statIndex: number}[]
}

export interface Recipe {
    outputItemId: number
    outputMass: number
    inputs: RecipeInput[]
    statSlots: StatSlot[]
    blendWeights: number[]
}

export interface EntitySlot {
    type: ModuleType
}

export interface EntityLayout {
    entityItemId: number
    slots: EntitySlot[]
}

const recipesById = new Map<number, Recipe>()
for (const r of recipes as any[]) recipesById.set(r.outputItemId, r as Recipe)

const entitiesById = new Map<number, EntityLayout>()
for (const e of entities as any[]) entitiesById.set(e.entityItemId, e as EntityLayout)

const resourceByCategoryTier = new Map<string, Item>()
for (const raw of items as any[]) {
    if (raw.type === 'resource') {
        resourceByCategoryTier.set(`${raw.category}:${raw.tier}`, getItem(raw.id))
    }
}

export function getRecipe(outputItemId: number): Recipe | undefined {
    return recipesById.get(outputItemId)
}

export function getEntityLayout(entityItemId: number): EntityLayout | undefined {
    return entitiesById.get(entityItemId)
}

export function findItemByCategoryAndTier(category: ResourceCategory, tier: number): Item {
    const item = resourceByCategoryTier.get(`${category}:${tier}`)
    if (!item) throw new Error(`No resource found for category=${category} tier=${tier}`)
    return item
}
