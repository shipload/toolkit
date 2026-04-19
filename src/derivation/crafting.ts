import {UInt64} from '@wharfkit/antelope'
import type {ResourceCategory} from '../types'
import {
    entityRecipes,
    getComponentById,
    getEntityRecipe,
    getEntityRecipeByItemId,
    getModuleRecipe,
    moduleRecipes,
} from '../data/recipes'
import {getStatDefinitions} from './stats'
import {deriveResourceStats} from './stratum'

export interface StackInput {
    quantity: number
    stats: Record<string, number>
}

export interface CategoryStacks {
    category: ResourceCategory
    stacks: StackInput[]
}

export function encodeStats(values: number[]): bigint {
    let seed = 0n
    for (let i = 0; i < values.length && i < 6; i++) {
        seed |= BigInt(values[i] & 0x3ff) << BigInt(i * 10)
    }
    return seed
}

export function decodeStat(seed: bigint, index: number): number {
    return Number((seed >> BigInt(index * 10)) & 0x3ffn)
}

export function decodeStats(seed: bigint, count: number): number[] {
    const stats: number[] = []
    for (let i = 0; i < count; i++) {
        stats.push(decodeStat(seed, i))
    }
    return stats
}

function mapStatsToKeys(seed: bigint, statDefs: {key: string}[]): Record<string, number> {
    const values = decodeStats(seed, statDefs.length)
    const result: Record<string, number> = {}
    for (let i = 0; i < statDefs.length; i++) {
        result[statDefs[i].key] = values[i]
    }
    return result
}

export function decodeCraftedItemStats(itemId: number, seed: bigint): Record<string, number> {
    const comp = getComponentById(itemId)
    if (comp) return mapStatsToKeys(seed, comp.stats)

    const entityRecipe = entityRecipes.find((r) => r.packedItemId === itemId)
    if (entityRecipe) return mapStatsToKeys(seed, entityRecipe.stats)

    const moduleRecipe = moduleRecipes.find((r) => r.itemId === itemId)
    if (moduleRecipe) return mapStatsToKeys(seed, moduleRecipe.stats)

    return {}
}

export function blendStacks(stacks: StackInput[], statKey: string): number {
    let totalQty = 0
    let weightedSum = 0
    for (const stack of stacks) {
        const val = stack.stats[statKey] ?? 0
        weightedSum += val * stack.quantity
        totalQty += stack.quantity
    }
    if (totalQty === 0) return 0
    return Math.floor(weightedSum / totalQty)
}

export function computeComponentStats(
    componentId: number,
    categoryStacks: CategoryStacks[]
): {key: string; value: number}[] {
    const comp = getComponentById(componentId)
    if (!comp) return []

    return comp.stats.map((statDef) => {
        const matching = categoryStacks.find((cs) => cs.category === statDef.source)
        const value = matching ? blendStacks(matching.stacks, statDef.key) : 0
        return {key: statDef.key, value: Math.max(1, Math.min(999, value))}
    })
}

export function blendComponentStacks(
    stacks: {quantity: number; stats: Record<string, number>}[]
): Record<string, number> {
    if (stacks.length === 0) return {}
    const allKeys = new Set<string>()
    for (const s of stacks) {
        for (const k of Object.keys(s.stats)) allKeys.add(k)
    }
    const result: Record<string, number> = {}
    for (const key of allKeys) {
        result[key] = blendStacks(
            stacks.map((s) => ({quantity: s.quantity, stats: s.stats})),
            key
        )
    }
    return result
}

export function computeEntityStats(
    entityRecipeId: string,
    componentStacks: Record<number, {quantity: number; stats: Record<string, number>}[]>
): {key: string; value: number}[] {
    const recipe = getEntityRecipe(entityRecipeId) ?? getModuleRecipe(entityRecipeId)
    if (!recipe) return []

    const blendedByComponent: Record<number, Record<string, number>> = {}
    for (const [compId, stacks] of Object.entries(componentStacks)) {
        blendedByComponent[Number(compId)] = blendComponentStacks(stacks)
    }

    return recipe.stats.map((stat) => {
        const blended = blendedByComponent[stat.sourceComponentId] ?? {}
        const value = blended[stat.sourceStatKey] ?? 0
        return {key: stat.key, value: Math.max(1, Math.min(999, value))}
    })
}

function decodeStackStats(itemId: number, seed: UInt64): Record<string, number> {
    if (itemId >= 10000) {
        return decodeCraftedItemStats(itemId, BigInt(seed.toString()))
    }
    const raw = deriveResourceStats(BigInt(seed.toString()))
    return {stat1: raw.stat1, stat2: raw.stat2, stat3: raw.stat3}
}

export const categoryItemMass: Record<string, number> = {
    metal: 30000,
    precious: 40000,
    gas: 15000,
    mineral: 22000,
    organic: 15000,
}

export function computeInputMass(
    itemId: string | number,
    itemType: 'component' | 'module' | 'entity'
): number {
    if (itemType === 'component') {
        const comp = getComponentById(itemId as number)
        if (!comp) return 0
        return comp.recipe.reduce((sum, input) => {
            const mass = input.category ? categoryItemMass[input.category] ?? 0 : 0
            return sum + mass * input.quantity
        }, 0)
    }
    if (itemType === 'module') {
        const mod = getModuleRecipe(itemId as string)
        if (!mod) return 0
        return mod.recipe.reduce((sum, input) => {
            const comp = input.itemId ? getComponentById(input.itemId) : undefined
            return sum + (comp?.mass ?? 0) * input.quantity
        }, 0)
    }
    if (itemType === 'entity') {
        const ent = getEntityRecipe(itemId as string)
        if (!ent) return 0
        return ent.recipe.reduce((sum, input) => {
            const comp = input.itemId ? getComponentById(input.itemId) : undefined
            return sum + (comp?.mass ?? 0) * input.quantity
        }, 0)
    }
    return 0
}

export function blendCrossGroup(sources: {value: number; weight: number}[]): number {
    let weightedSum = 0
    let totalWeight = 0
    for (const src of sources) {
        weightedSum += src.value * src.weight
        totalWeight += src.weight
    }
    if (totalWeight === 0) return 1
    const result = Math.floor(weightedSum / totalWeight)
    return Math.max(1, Math.min(999, result))
}

export function blendCargoStacks(
    itemId: number,
    stacks: {quantity: number; seed: UInt64}[]
): UInt64 {
    const decoded = stacks.map((s) => ({
        quantity: s.quantity,
        stats: decodeStackStats(itemId, s.seed),
    }))
    const allKeys = Object.keys(decoded[0]?.stats ?? {})
    const blended = allKeys.map((key) => Math.max(1, Math.min(999, blendStacks(decoded, key))))
    return UInt64.from(encodeStats(blended))
}

export interface RecipeSlotInput {
    itemId: number
    category: ResourceCategory | undefined
    stacks: {quantity: number; seed: bigint}[]
}

function decodeRawStackToCategoryStats(
    seed: bigint,
    category: ResourceCategory
): Record<string, number> {
    const raw = deriveResourceStats(seed)
    const defs = getStatDefinitions(category)
    const result: Record<string, number> = {}
    if (defs[0]) result[defs[0].key] = raw.stat1
    if (defs[1]) result[defs[1].key] = raw.stat2
    if (defs[2]) result[defs[2].key] = raw.stat3
    return result
}

export function computeCraftedOutputSeed(
    outputItemId: number,
    slotInputs: RecipeSlotInput[]
): UInt64 {
    const component = getComponentById(outputItemId)
    if (component) {
        const categoryStacks: CategoryStacks[] = []
        for (const slot of slotInputs) {
            if (!slot.category) continue
            const slotIsComponent = getComponentById(slot.itemId) !== undefined
            const stacks: StackInput[] = slot.stacks.map((s) => ({
                quantity: s.quantity,
                stats: slotIsComponent
                    ? decodeCraftedItemStats(slot.itemId, s.seed)
                    : decodeRawStackToCategoryStats(s.seed, slot.category!),
            }))
            categoryStacks.push({category: slot.category, stacks})
        }
        const stats = computeComponentStats(outputItemId, categoryStacks)
        const ordered = component.stats.map((statDef) => {
            const found = stats.find((s) => s.key === statDef.key)
            return found ? found.value : 0
        })
        return UInt64.from(encodeStats(ordered))
    }

    const entityRecipe = getEntityRecipeByItemId(outputItemId)
    if (entityRecipe) {
        const componentStacks: Record<number, {quantity: number; stats: Record<string, number>}[]> =
            {}
        for (const slot of slotInputs) {
            if (slot.category !== undefined) {
                throw new Error(
                    `entity recipe ${entityRecipe.id} expects component inputs but slot itemId=${slot.itemId} has category=${slot.category}`
                )
            }
            const list = (componentStacks[slot.itemId] ??= [])
            for (const s of slot.stacks) {
                list.push({
                    quantity: s.quantity,
                    stats: decodeCraftedItemStats(slot.itemId, s.seed),
                })
            }
        }
        const stats = computeEntityStats(entityRecipe.id, componentStacks)
        const ordered = entityRecipe.stats.map((statDef) => {
            const found = stats.find((s) => s.key === statDef.key)
            return found ? found.value : 0
        })
        return UInt64.from(encodeStats(ordered))
    }

    throw new Error(`computeCraftedOutputSeed: no recipe found for outputItemId=${outputItemId}`)
}
