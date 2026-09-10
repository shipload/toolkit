import {tryGetItem} from '../data/catalog'
import {getRecipe} from '../data/recipes-runtime'
import recipes from '../data/recipes.json'
import {
    DECOMP_MAX_BUCKETS,
    DECOMP_MAX_DEPTH,
    DECOMP_PROCESSED_MASS_MAX,
    DECOMP_RAW_MASS_MAX,
} from './constants'
import {categoryIndex} from './categories'

export interface DecompBucket {
    category: number
    tier: number
    rawMass: number
}

export interface DecompEntry {
    itemId: number
    processedMass: number
    buckets: DecompBucket[]
}

interface Accumulator {
    buckets: DecompBucket[]
    processedMass: number
    overflow: boolean
}

function add(acc: Accumulator, category: number, tier: number, mass: number): void {
    const existing = acc.buckets.find((b) => b.category === category && b.tier === tier)
    if (existing) {
        existing.rawMass += mass
        return
    }
    if (acc.buckets.length >= DECOMP_MAX_BUCKETS) {
        acc.overflow = true
        return
    }
    acc.buckets.push({category, tier, rawMass: mass})
}

function walk(itemId: number, multiplier: number, acc: Accumulator, depth: number): void {
    if (depth > DECOMP_MAX_DEPTH) {
        acc.overflow = true
        return
    }
    const recipe = getRecipe(itemId)
    if (!recipe) return

    for (const input of recipe.inputs) {
        const def = tryGetItem(input.itemId)
        const units = multiplier * input.quantity
        const mass = units * (def ? def.mass : 0)
        acc.processedMass += mass
        if (getRecipe(input.itemId)) {
            walk(input.itemId, units, acc, depth + 1)
        } else if (def?.type !== 'resource' || def.category === undefined) {
            acc.overflow = true
        } else {
            add(acc, categoryIndex(def.category), def.tier, mass)
        }
    }
}

function buildRegistry(): DecompEntry[] {
    const out: DecompEntry[] = []
    for (const recipe of recipes as {outputItemId: number}[]) {
        const acc: Accumulator = {buckets: [], processedMass: 0, overflow: false}
        walk(recipe.outputItemId, 1, acc, 0)
        acc.buckets.sort((a, b) => a.category - b.category || a.tier - b.tier)

        const rawTotal = acc.buckets.reduce((sum, b) => sum + b.rawMass, 0)
        if (rawTotal > DECOMP_RAW_MASS_MAX || acc.processedMass > DECOMP_PROCESSED_MASS_MAX) {
            acc.overflow = true
        }

        out.push({
            itemId: recipe.outputItemId,
            processedMass: acc.overflow ? 0 : acc.processedMass,
            buckets: acc.buckets,
        })
    }
    out.sort((a, b) => a.itemId - b.itemId)
    return out
}

export const DECOMP_REGISTRY: DecompEntry[] = buildRegistry()

const byItemId = new Map<number, DecompEntry>()
for (const entry of DECOMP_REGISTRY) byItemId.set(entry.itemId, entry)

export function findDecomp(itemId: number): DecompEntry | undefined {
    return byItemId.get(itemId)
}
