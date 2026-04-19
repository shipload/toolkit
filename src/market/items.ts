import {UInt16, UInt16Type} from '@wharfkit/antelope'
import {Item} from '../types'
import itemsData from '../data/items.json'
import {computeInputMass} from '../derivation/crafting'
import {
    getComponentById,
    getEntityRecipeByItemId,
    getModuleRecipeByItemId,
} from '../data/recipes'

const itemsById: Map<number, Item> = new Map()
const synthesizedCache: Map<number, Item> = new Map()

for (const g of itemsData) {
    const item = Item.from({
        id: g.id,
        name: g.name,
        description: g.description,
        mass: g.mass,
        category: g.category,
        tier: g.tier,
        color: g.color,
    })
    itemsById.set(item.id.toNumber(), item)
}

export const itemIds = Array.from(itemsById.values(), (i) => i.id)

interface RecipeSource {
    name: string
    description: string
    mass: number
    color: string
}

function synthesizeItem(id: number, source: RecipeSource): Item {
    return Item.from({
        id,
        name: source.name,
        description: source.description,
        mass: source.mass,
        category: 'metal',
        tier: 't1',
        color: source.color,
    })
}

function synthesizeFromRecipes(id: number): Item | undefined {
    const component = getComponentById(id)
    if (component) return synthesizeItem(id, component)

    const entityRecipe = getEntityRecipeByItemId(id)
    if (entityRecipe) {
        return synthesizeItem(id, {
            ...entityRecipe,
            mass: computeInputMass(entityRecipe.id, 'entity'),
        })
    }

    const moduleRecipe = getModuleRecipeByItemId(id)
    if (moduleRecipe) {
        return synthesizeItem(id, {
            ...moduleRecipe,
            mass: computeInputMass(moduleRecipe.id, 'module'),
        })
    }

    return undefined
}

export function getItem(itemId: UInt16Type): Item {
    const id = UInt16.from(itemId).toNumber()
    const existing = itemsById.get(id) ?? synthesizedCache.get(id)
    if (existing) return existing

    const synthesized = synthesizeFromRecipes(id)
    if (synthesized) {
        synthesizedCache.set(id, synthesized)
        return synthesized
    }

    throw new Error(`Item with id ${id} not found`)
}

export function getItems(): Item[] {
    return Array.from(itemsById.values())
}

export function registerItem(item: Item): void {
    const id = item.id.toNumber()
    itemsById.set(id, item)
    synthesizedCache.delete(id)
}
