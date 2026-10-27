import {UInt64} from '@wharfkit/antelope'
import type {ResourceCategory} from '../types'
import {getRecipe, type Recipe} from '../data/recipes-runtime'
import recipes from '../data/recipes.json'
import {getItem} from '../data/catalog'
import {findStatDefinition, getStatDefinitions, type StatDefinition} from './stats'
import {deriveResourceStats, STAT_MEAN, STAT_WORD_SLOTS} from './stratum'
import {ITEM_SHIP_T1_PACKED} from '../data/item-ids'

export const STAT_SOURCE_MEAN = 255

export function isMeanSource(src: {inputIndex: number}): boolean {
    return src.inputIndex === STAT_SOURCE_MEAN
}

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

export function getItemStatKeys(itemId: number): string[] {
    const item = getItem(itemId)
    if (item.type === 'resource') {
        if (!item.category) return []
        return getStatDefinitions(item.category).map((d) => d.key)
    }
    if (itemId === ITEM_SHIP_T1_PACKED) return ['strength', 'density', '', '']
    const recipe = getRecipe(itemId)
    if (!recipe) return []
    if (item.type === 'component') {
        const resourceKeys = getItemStatKeys(recipe.inputs[0].itemId)
        return recipe.statSlots.map((_, i) => resourceKeys[i] ?? '')
    }
    return recipe.statSlots.map((slot, index) => {
        const key = keyForStatSlot(recipe, slot)
        if (key || item.type !== 'entity') return key
        return wokenStatKey(itemId, index)
    })
}

function wokenStatKey(itemId: number, index: number): string {
    for (const next of recipes as unknown as Recipe[]) {
        if (!next.sourceSubclasses?.includes(itemId)) continue
        for (const src of next.statSlots[index]?.sources ?? []) {
            if (isMeanSource(src)) continue
            const input = next.inputs[src.inputIndex]
            if (input && !next.sourceSubclasses?.includes(input.itemId))
                return getItemStatKeys(input.itemId)[src.statIndex] ?? ''
        }
    }
    return ''
}

function keyForStatSlot(
    recipe: Recipe,
    slot: {sources: {inputIndex: number; statIndex: number}[]}
): string {
    const src = slot.sources.find((s) => !isMeanSource(s))
    if (!src) return ''
    return keyForRecipeInputStat(recipe, src.inputIndex, src.statIndex)
}

function keyForRecipeInputStat(recipe: Recipe, inputIndex: number, statIndex: number): string {
    const input = recipe.inputs[inputIndex]
    if (!input) return ''
    // Every input names an item by id; its stats follow that item's own layout
    // (resource stat definitions for resources, statSlots for crafted items).
    const innerKeys = getItemStatKeys(input.itemId)
    return innerKeys[statIndex] ?? ''
}

export function traceResourceStatKeys(itemId: number, statIndex: number): string[] {
    const item = getItem(itemId)
    if (item.type === 'resource') {
        const key = item.category ? getStatDefinitions(item.category)[statIndex]?.key : undefined
        return key ? [key] : []
    }
    const recipe = getRecipe(itemId)
    const slot = recipe?.statSlots[statIndex]
    if (!recipe || !slot) return []
    const keys = slot.sources.flatMap((src) => {
        if (isMeanSource(src)) return []
        const input = recipe.inputs[src.inputIndex]
        return input ? traceResourceStatKeys(input.itemId, src.statIndex) : []
    })
    return [...new Set(keys)]
}

export interface ItemStatSlot {
    index: number
    key: string
    label: string
    abbreviation: string
    sources: StatDefinition[]
}

export function getItemStatSlots(itemId: number): ItemStatSlot[] {
    return getItemStatKeys(itemId).flatMap((key, index) => {
        if (!key) return []
        const sources = traceResourceStatKeys(itemId, index).flatMap((sourceKey) => {
            const found = findStatDefinition(sourceKey)
            return found ? [found.definition] : []
        })
        if (sources.length === 0) {
            const own = findStatDefinition(key)?.definition
            return own
                ? [{index, key, label: own.label, abbreviation: own.abbreviation, sources: [own]}]
                : []
        }
        return [
            {
                index,
                key,
                label: sources.map((s) => s.label).join(' + '),
                abbreviation: sources.map((s) => s.abbreviation).join('+'),
                sources,
            },
        ]
    })
}

function statRecordFromResources(
    itemId: number,
    resources: Record<string, number>
): Record<string, number> {
    const item = getItem(itemId)
    if (item.type === 'resource') {
        if (!item.category) return {}
        return Object.fromEntries(
            getStatDefinitions(item.category).map((d) => [d.key, resources[d.key] ?? 0])
        )
    }
    const keys = getItemStatKeys(itemId)
    const values = computeStatsFromResources(itemId, resources)
    return Object.fromEntries(
        keys.flatMap((key, i) => (key && values[i] !== undefined ? [[key, values[i]]] : []))
    )
}

export function computeStatsFromResources(
    itemId: number,
    resources: Record<string, number>
): number[] {
    const recipe = getRecipe(itemId)
    if (!recipe) return []
    const stacks: Record<number, StackInput[]> = {}
    for (const input of recipe.inputs) {
        stacks[input.itemId] = [
            {quantity: 1, stats: statRecordFromResources(input.itemId, resources)},
        ]
    }
    return computeEntityStats(itemId, stacks).map((s) => s.value)
}

export function usedInputStatKeys(outputItemId: number): string[][] {
    const recipe = getRecipe(outputItemId)
    if (!recipe) return []
    const usedIdx = recipe.inputs.map(() => new Set<number>())
    for (const slot of recipe.statSlots) {
        for (const src of slot.sources) {
            if (!isMeanSource(src)) usedIdx[src.inputIndex]?.add(src.statIndex)
        }
    }
    return recipe.inputs.map((input, i) => {
        const keys = getItemStatKeys(input.itemId)
        return [...usedIdx[i]]
            .sort((a, b) => a - b)
            .map((idx) => keys[idx] ?? '')
            .filter(Boolean)
    })
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

    const keys = getItemStatKeys(componentId)
    return recipe.statSlots.map((slot, i) => {
        const src = slot.sources[0]
        const key = keys[i] ?? ''
        if (src && isMeanSource(src)) return {key, value: STAT_MEAN}
        const input = src ? recipe.inputs[src.inputIndex] : undefined
        const inputItem = input ? getItem(input.itemId) : undefined
        if (!inputItem || inputItem.type !== 'resource' || !inputItem.category) {
            return {key, value: Math.max(1, Math.min(999, 0))}
        }
        const matching = categoryStacks.find((cs) => cs.category === inputItem.category)
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

    const slotKeys = getItemStatKeys(itemId)
    return recipe.statSlots.map((slot, i) => {
        const slotKey = slotKeys[i] ?? ''
        if (slot.sources.length === 0) return {key: slotKey, value: 1}
        let sum = 0
        let count = 0
        for (const src of slot.sources) {
            if (isMeanSource(src)) {
                sum += STAT_MEAN
                count++
                continue
            }
            const key = keyForRecipeInputStat(recipe, src.inputIndex, src.statIndex)
            const input = recipe.inputs[src.inputIndex]
            if (!input) continue
            sum += blendedByComponent[input.itemId]?.[key] ?? 0
            count++
        }
        const value = count > 0 ? Math.floor(sum / count) : 0
        return {key: slotKey, value: Math.max(1, Math.min(999, value))}
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
            return 11200
        default:
            return 0
    }
}

function decodeStackStats(itemId: number, stats: UInt64): Record<string, number> {
    if (itemId >= 10000) {
        return decodeCraftedItemStats(itemId, BigInt(stats.toString()))
    }
    const s = BigInt(stats.toString())
    return Object.fromEntries(
        Array.from({length: STAT_WORD_SLOTS}, (_, i) => [`stat${i + 1}`, decodeStat(s, i)])
    )
}

export function computeInputMass(itemId: number): number {
    const recipe = getRecipe(itemId)
    if (!recipe) throw new Error(`computeInputMass: no recipe found for itemId=${itemId}`)

    let total = 0
    for (const input of recipe.inputs) {
        total += getItem(input.itemId).mass * input.quantity
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
            decodedByCategory[slot.category] ??= []
            const list = decodedByCategory[slot.category]!
            for (const s of slot.stacks) {
                list.push({
                    quantity: s.quantity,
                    stats: decodeRawStackToCategoryStats(s.stats, slot.category),
                })
            }
        } else {
            decodedByItem[slot.itemId] ??= []
            const list = decodedByItem[slot.itemId]
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

    const sourceValue = (src: {inputIndex: number; statIndex: number}): number => {
        if (isMeanSource(src)) return STAT_MEAN
        const key = keyForRecipeInputStat(recipe, src.inputIndex, src.statIndex)
        const input = recipe.inputs[src.inputIndex]
        if (!input) return 0
        const inputItem = getItem(input.itemId)
        if (inputItem.type === 'resource' && inputItem.category) {
            return blendStacks(decodedByCategory[inputItem.category] ?? [], key)
        }
        return blendedByItem[input.itemId]?.[key] ?? 0
    }

    const out: number[] = []
    for (const slot of recipe.statSlots) {
        if (slot.sources.length === 0) {
            out.push(0)
            continue
        }
        const sum = slot.sources.reduce((acc, src) => acc + sourceValue(src), 0)
        out.push(Math.max(1, Math.min(999, Math.floor(sum / slot.sources.length))))
    }
    return UInt64.from(encodeStats(out))
}

/**
 * Mirrors the contract's gather-time transform. Takes a deposit's entropy
 * seed (bigint from deriveStratum), derives stats via weibull hashing, and
 * returns a UInt64 whose bit-packed form matches what the contract writes
 * to cargo_item.stats on gather.
 *
 * Use this whenever off-chain code simulates a gather (webapp, player
 * scanners that project cargo outcomes) and needs a value that matches
 * what on-chain cargo would carry.
 */
export function encodeGatheredCargoStats(depositSeed: bigint): UInt64 {
    const raw = deriveResourceStats(depositSeed)
    return UInt64.from(
        encodeStats([raw.stat1, raw.stat2, raw.stat3, STAT_MEAN, STAT_MEAN, STAT_MEAN])
    )
}
