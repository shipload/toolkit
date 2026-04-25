import {UInt64} from '@wharfkit/antelope'
import type {ResourceCategory} from '../types'
import {findItemByCategoryAndTier, getRecipe, Recipe} from '../data/recipes-runtime'
import {getItem} from '../market/items'
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
    let stats = 0n
    for (let i = 0; i < values.length && i < 6; i++) {
        stats |= BigInt(values[i] & 0x3ff) << BigInt(i * 10)
    }
    return stats
}

export function decodeStat(stats: bigint, index: number): number {
    return Number((stats >> BigInt(index * 10)) & 0x3ffn)
}

export function decodeStats(stats: bigint, count: number): number[] {
    const result: number[] = []
    for (let i = 0; i < count; i++) {
        result.push(decodeStat(stats, i))
    }
    return result
}

function getItemStatKeys(itemId: number): string[] {
    const item = getItem(itemId)
    if (item.type === 'resource') {
        if (!item.category) return []
        return getStatDefinitions(item.category).map((d) => d.key)
    }
    const recipe = getRecipe(itemId)
    if (!recipe) return []
    return recipe.statSlots.map((slot) => keyForStatSlot(recipe, slot))
}

function keyForStatSlot(
    recipe: Recipe,
    slot: {sources: {inputIndex: number; statIndex: number}[]}
): string {
    const src = slot.sources[0]
    if (!src) return ''
    return keyForRecipeInputStat(recipe, src.inputIndex, src.statIndex)
}

function keyForRecipeInputStat(recipe: Recipe, inputIndex: number, statIndex: number): string {
    const input = recipe.inputs[inputIndex]
    if (!input) return ''
    if ('category' in input) {
        const defs = getStatDefinitions(input.category)
        return defs[statIndex]?.key ?? ''
    }
    // itemId-typed input — its stats follow that item's own statSlots layout.
    const innerKeys = getItemStatKeys(input.itemId)
    return innerKeys[statIndex] ?? ''
}

export function decodeCraftedItemStats(itemId: number, stats: bigint): Record<string, number> {
    const keys = getItemStatKeys(itemId)
    const result: Record<string, number> = {}
    for (let i = 0; i < keys.length; i++) {
        if (keys[i]) result[keys[i]] = decodeStat(stats, i)
    }
    return result
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

export function computeComponentStats(
    componentId: number,
    categoryStacks: CategoryStacks[]
): {key: string; value: number}[] {
    const recipe = getRecipe(componentId)
    if (!recipe) return []

    return recipe.statSlots.map((slot) => {
        const src = slot.sources[0]
        const key = keyForStatSlot(recipe, slot)
        const input = src ? recipe.inputs[src.inputIndex] : undefined
        if (!input || !('category' in input)) {
            return {key, value: Math.max(1, Math.min(999, 0))}
        }
        const matching = categoryStacks.find((cs) => cs.category === input.category)
        const value = matching ? blendStacks(matching.stacks, key) : 0
        return {key, value: Math.max(1, Math.min(999, value))}
    })
}

export function computeEntityStats(
    entityItemIdOrLegacyId: number | string,
    componentStacks: Record<number, {quantity: number; stats: Record<string, number>}[]>
): {key: string; value: number}[] {
    const itemId =
        typeof entityItemIdOrLegacyId === 'number'
            ? entityItemIdOrLegacyId
            : legacyEntityIdToItemId(entityItemIdOrLegacyId)
    const recipe = getRecipe(itemId)
    if (!recipe) return []

    const blendedByComponent: Record<number, Record<string, number>> = {}
    for (const [compId, stacks] of Object.entries(componentStacks)) {
        blendedByComponent[Number(compId)] = blendComponentStacks(stacks)
    }

    return recipe.statSlots.map((slot) => {
        const src = slot.sources[0]
        const key = keyForStatSlot(recipe, slot)
        if (!src) return {key, value: 1}
        const input = recipe.inputs[src.inputIndex]
        if (!input || 'category' in input) {
            return {key, value: 1}
        }
        const blended = blendedByComponent[input.itemId] ?? {}
        const value = blended[key] ?? 0
        return {key, value: Math.max(1, Math.min(999, value))}
    })
}

function legacyEntityIdToItemId(id: string): number {
    switch (id) {
        case 'container':
            return 10200
        case 'ship-t1':
            return 10201
        case 'warehouse-t1':
            return 10202
        case 'container-t2':
            return 20200
        default:
            return 0
    }
}

function decodeStackStats(itemId: number, stats: UInt64): Record<string, number> {
    if (itemId >= 10000) {
        return decodeCraftedItemStats(itemId, BigInt(stats.toString()))
    }
    const s = BigInt(stats.toString())
    return {stat1: decodeStat(s, 0), stat2: decodeStat(s, 1), stat3: decodeStat(s, 2)}
}

export function computeInputMass(itemId: number): number {
    const recipe = getRecipe(itemId)
    if (!recipe) throw new Error(`computeInputMass: no recipe found for itemId=${itemId}`)

    let total = 0
    for (const input of recipe.inputs) {
        if ('itemId' in input) {
            total += getItem(input.itemId).mass * input.quantity
        } else {
            const item = findItemByCategoryAndTier(input.category, input.tier)
            total += item.mass * input.quantity
        }
    }
    return total
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
    stacks: {quantity: number; stats: UInt64}[]
): UInt64 {
    const decoded = stacks.map((s) => ({
        quantity: s.quantity,
        stats: decodeStackStats(itemId, s.stats),
    }))
    const allKeys = Object.keys(decoded[0]?.stats ?? {})
    const blended = allKeys.map((key) => Math.max(1, Math.min(999, blendStacks(decoded, key))))
    return UInt64.from(encodeStats(blended))
}

export interface RecipeSlotInput {
    itemId: number
    category: ResourceCategory | undefined
    stacks: {quantity: number; stats: bigint}[]
}

function decodeRawStackToCategoryStats(
    stats: bigint,
    category: ResourceCategory
): Record<string, number> {
    const defs = getStatDefinitions(category)
    const result: Record<string, number> = {}
    if (defs[0]) result[defs[0].key] = decodeStat(stats, 0)
    if (defs[1]) result[defs[1].key] = decodeStat(stats, 1)
    if (defs[2]) result[defs[2].key] = decodeStat(stats, 2)
    return result
}

export function computeCraftedOutputStats(
    outputItemId: number,
    slotInputs: RecipeSlotInput[]
): UInt64 {
    const recipe = getRecipe(outputItemId)
    if (!recipe) {
        throw new Error(
            `computeCraftedOutputStats: no recipe found for outputItemId=${outputItemId}`
        )
    }

    const outputItem = getItem(outputItemId)

    if (outputItem.type === 'entity') {
        for (const slot of slotInputs) {
            if (slot.category !== undefined) {
                throw new Error(
                    `entity recipe ${outputItemId} expects component inputs but slot itemId=${slot.itemId} has category=${slot.category}`
                )
            }
        }
    }

    // Decode each slot's stacks into key→value maps using the slot item's
    // own stat layout, so blending works regardless of recipe shape.
    const decodedByItem: Record<number, {quantity: number; stats: Record<string, number>}[]> = {}
    const decodedByCategory: Partial<Record<ResourceCategory, StackInput[]>> = {}

    for (const slot of slotInputs) {
        if (slot.category !== undefined) {
            const list = (decodedByCategory[slot.category] ??= [])
            for (const s of slot.stacks) {
                list.push({
                    quantity: s.quantity,
                    stats: decodeRawStackToCategoryStats(s.stats, slot.category),
                })
            }
        } else {
            const list = (decodedByItem[slot.itemId] ??= [])
            for (const s of slot.stacks) {
                list.push({
                    quantity: s.quantity,
                    stats: decodeCraftedItemStats(slot.itemId, s.stats),
                })
            }
        }
    }

    // Pre-blend itemId inputs once per item id.
    const blendedByItem: Record<number, Record<string, number>> = {}
    for (const [id, stacks] of Object.entries(decodedByItem)) {
        blendedByItem[Number(id)] = blendComponentStacks(stacks)
    }

    const out: number[] = []
    for (const slot of recipe.statSlots) {
        if (slot.sources.length === 0) {
            out.push(0)
            continue
        }
        if (slot.sources.length === 1 || recipe.blendWeights.length === 0) {
            const src = slot.sources[0]
            const key = keyForRecipeInputStat(recipe, src.inputIndex, src.statIndex)
            const input = recipe.inputs[src.inputIndex]
            let value = 0
            if (input && 'category' in input) {
                value = blendStacks(decodedByCategory[input.category] ?? [], key)
            } else if (input) {
                value = blendedByItem[input.itemId]?.[key] ?? 0
            }
            out.push(Math.max(1, Math.min(999, value)))
        } else {
            let weightedSum = 0
            let totalWeight = 0
            for (const src of slot.sources) {
                const key = keyForRecipeInputStat(recipe, src.inputIndex, src.statIndex)
                const input = recipe.inputs[src.inputIndex]
                const weight = recipe.blendWeights[src.inputIndex] ?? 1
                let value = 0
                if (input && 'category' in input) {
                    value = blendStacks(decodedByCategory[input.category] ?? [], key)
                } else if (input) {
                    value = blendedByItem[input.itemId]?.[key] ?? 0
                }
                weightedSum += value * weight
                totalWeight += weight
            }
            const blended = totalWeight > 0 ? Math.floor(weightedSum / totalWeight) : 0
            out.push(Math.max(1, Math.min(999, blended)))
        }
    }
    return UInt64.from(encodeStats(out))
}

/**
 * Mirrors the contract's gather-time transform. Takes a deposit's entropy
 * seed (bigint from deriveStratum), derives stats via weibull hashing, and
 * returns a UInt64 whose bit-packed form matches what the contract writes
 * to cargo_item.stats on gather.
 *
 * Use this whenever off-chain code simulates a gather (testmap, player
 * scanners that project cargo outcomes) and needs a value that matches
 * what on-chain cargo would carry.
 */
export function encodeGatheredCargoStats(depositSeed: bigint): UInt64 {
    const raw = deriveResourceStats(depositSeed)
    return UInt64.from(encodeStats([raw.stat1, raw.stat2, raw.stat3]))
}
