import recipes from './recipes.json'
import entities from './entities.json'

import type {ModuleType} from '../types'

export interface RecipeInput {
    itemId: number
    quantity: number
}

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
    outputPct: number
    maxTier: number
}

export interface EntityLayout {
    entityItemId: number
    slots: EntitySlot[]
}

const recipesById = new Map<number, Recipe>()
for (const r of recipes as any[]) recipesById.set(r.outputItemId, r as Recipe)

const entitiesById = new Map<number, EntityLayout>()
for (const e of entities as any[]) entitiesById.set(e.entityItemId, e as EntityLayout)

export function getRecipe(outputItemId: number): Recipe | undefined {
    return recipesById.get(outputItemId)
}

export function getEntityLayout(entityItemId: number): EntityLayout | undefined {
    return entitiesById.get(entityItemId)
}
