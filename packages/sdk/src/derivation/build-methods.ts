import {ENTITY_HUB, EntityClass, getKindMeta, getTemplateMeta} from '../data/kind-registry'
import {getRecipe} from '../data/recipes-runtime'
import {getItems} from '../data/catalog'
import type {Item} from '../types'

export type BuildMethod = 'craft+deploy' | 'plot'

export function availableBuildMethods(itemId: number): BuildMethod[] {
    const recipe = getRecipe(itemId)
    if (!recipe) return []

    const template = getTemplateMeta(itemId)
    if (!template) return ['craft+deploy']

    const kindMeta = getKindMeta(template.kind)
    if (!kindMeta) return ['craft+deploy']

    if (
        kindMeta.classification === EntityClass.OrbitalStructure &&
        !kindMeta.kind.equals(ENTITY_HUB)
    ) {
        return ['craft+deploy', 'plot']
    }
    return ['craft+deploy']
}

export function isBuildable(itemId: number): boolean {
    return availableBuildMethods(itemId).length > 0
}

export function isPlotBuildable(itemId: number): boolean {
    return availableBuildMethods(itemId).includes('plot')
}

export function filterByBuildMethod<T extends {itemId: number}>(
    items: T[],
    method: BuildMethod
): T[] {
    return items.filter((i) => availableBuildMethods(i.itemId).includes(method))
}

export function allBuildableItems(): Item[] {
    return getItems().filter((item) => isBuildable(item.id))
}

export function allPlotBuildableItems(): Item[] {
    return getItems().filter((item) => isPlotBuildable(item.id))
}
