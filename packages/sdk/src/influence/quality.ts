import {getRecipe} from '../data/recipes-runtime'
import {decodeStat} from '../derivation/crafting'

const CRAFTED_ITEM_ID_FLOOR = 10_000
const UNCRAFTED_STAT_COUNT = 3

export function getStatCount(itemId: number): number {
    if (itemId < CRAFTED_ITEM_ID_FLOOR) return UNCRAFTED_STAT_COUNT
    const recipe = getRecipe(itemId)
    return recipe ? recipe.statSlots.length : UNCRAFTED_STAT_COUNT
}

export function statsSumSq(packedStats: bigint, nStats: number): number {
    let sum = 0
    for (let i = 0; i < nStats; i++) {
        const s = decodeStat(packedStats, i)
        sum += s * s
    }
    return sum
}

export function qualityFactor(packedStats: bigint, nStats: number, d1: number): number {
    if (nStats <= 0 || d1 <= 0) throw new Error('influence: invalid quality divisor')
    return statsSumSq(packedStats, nStats) / (nStats * d1)
}
