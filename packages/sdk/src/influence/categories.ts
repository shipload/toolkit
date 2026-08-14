import {categoryFromIndex} from '../data/catalog'
import type {ResourceCategory} from '../types'
import {
    RESOURCE_BIOMASS,
    RESOURCE_CATEGORY_COUNT,
    RESOURCE_CRYSTAL,
    RESOURCE_GAS,
    RESOURCE_ORE,
    RESOURCE_REGOLITH,
} from './constants'

const INDEX_BY_CATEGORY: Record<ResourceCategory, number> = {
    ore: RESOURCE_ORE,
    gas: RESOURCE_GAS,
    regolith: RESOURCE_REGOLITH,
    biomass: RESOURCE_BIOMASS,
    crystal: RESOURCE_CRYSTAL,
}

export function categoryIndex(category: ResourceCategory): number {
    return INDEX_BY_CATEGORY[category]
}

export function categoryAtIndex(index: number): ResourceCategory {
    const category = categoryFromIndex(index)
    if (!category) throw new Error(`influence: invalid resource category index ${index}`)
    return category
}

export function allCategoryIndexes(): number[] {
    return Array.from({length: RESOURCE_CATEGORY_COUNT}, (_, i) => i)
}
