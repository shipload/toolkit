import type {ResourceCategory} from '../types'
import {
	components,
	entityRecipes,
	getComponentById,
	getEntityRecipe,
} from '../data/recipes'

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

export function decodeStats(seed: bigint, count: number): number[] {
	const stats: number[] = []
	for (let i = 0; i < count; i++) {
		stats.push(Number((seed >> BigInt(i * 10)) & 0x3ffn))
	}
	return stats
}

export function decodeCraftedItemStats(itemId: number, seed: bigint): Record<string, number> {
	const comp = getComponentById(itemId)
	if (comp) {
		const values = decodeStats(seed, comp.stats.length)
		const result: Record<string, number> = {}
		for (let i = 0; i < comp.stats.length; i++) {
			result[comp.stats[i].key] = values[i]
		}
		return result
	}

	const entityRecipe = entityRecipes.find((r) => r.packedItemId === itemId)
	if (entityRecipe) {
		const values = decodeStats(seed, entityRecipe.stats.length)
		const result: Record<string, number> = {}
		for (let i = 0; i < entityRecipe.stats.length; i++) {
			result[entityRecipe.stats[i].key] = values[i]
		}
		return result
	}

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
	return Math.round(weightedSum / totalQty)
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
	const recipe = getEntityRecipe(entityRecipeId)
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
