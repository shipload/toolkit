import type {ResourceCategory} from '../types'

export const ITEM_HULL_PLATES = 10001
export const ITEM_CARGO_LINING = 10002
export const ITEM_CONTAINER_PACKED = 10003

export interface RecipeInput {
	category?: ResourceCategory
	itemId?: number
	quantity: number
}

export interface ComponentStat {
	key: string
	source: ResourceCategory
}

export interface ComponentDefinition {
	id: number
	name: string
	description: string
	color: string
	mass: number
	stats: ComponentStat[]
	recipe: RecipeInput[]
	usedIn: {type: 'entity'; name: string}[]
}

export interface EntityRecipe {
	id: string
	name: string
	description: string
	color: string
	packedItemId: number
	recipe: RecipeInput[]
	stats: {key: string; sourceComponentId: number; sourceStatKey: string}[]
}

export interface CraftableItem {
	type: 'component' | 'entity'
	id: number | string
	name: string
	description: string
	color: string
}

export const components: ComponentDefinition[] = [
	{
		id: ITEM_HULL_PLATES,
		name: 'Hull Plates',
		description: 'Structural plating formed from metal. Used in hulls, containers, and frames.',
		color: '#7B8D9E',
		mass: 50000,
		stats: [
			{key: 'strength', source: 'metal'},
			{key: 'density', source: 'metal'},
		],
		recipe: [{category: 'metal', quantity: 40}],
		usedIn: [{type: 'entity', name: 'Container'}],
	},
	{
		id: ITEM_CARGO_LINING,
		name: 'Cargo Lining',
		description:
			'Precision-formed composite lining for cargo storage. Combines precious metal shaping with organic sealing.',
		color: '#D4A843',
		mass: 30000,
		stats: [
			{key: 'ductility', source: 'precious'},
			{key: 'purity', source: 'organic'},
		],
		recipe: [
			{category: 'precious', quantity: 10},
			{category: 'organic', quantity: 20},
		],
		usedIn: [{type: 'entity', name: 'Container'}],
	},
]

export const entityRecipes: EntityRecipe[] = [
	{
		id: 'container',
		name: 'Container',
		description: 'Passive floating cargo storage in space. Towed by ships.',
		color: '#7B8D9E',
		packedItemId: ITEM_CONTAINER_PACKED,
		recipe: [
			{itemId: ITEM_HULL_PLATES, quantity: 6},
			{itemId: ITEM_CARGO_LINING, quantity: 2},
		],
		stats: [
			{key: 'strength', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'strength'},
			{key: 'density', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'density'},
			{key: 'ductility', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'ductility'},
			{key: 'purity', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'purity'},
		],
	},
]

export function getComponentById(id: number): ComponentDefinition | undefined {
	return components.find((c) => c.id === id)
}

export function getEntityRecipe(id: string): EntityRecipe | undefined {
	return entityRecipes.find((r) => r.id === id)
}

export function getEntityRecipeByItemId(itemId: number): EntityRecipe | undefined {
	return entityRecipes.find((r) => r.packedItemId === itemId)
}

export function getAllCraftableItems(): CraftableItem[] {
	const items: CraftableItem[] = []
	for (const comp of components) {
		items.push({type: 'component', id: comp.id, name: comp.name, description: comp.description, color: comp.color})
	}
	for (const entity of entityRecipes) {
		items.push({type: 'entity', id: entity.id, name: entity.name, description: entity.description, color: entity.color})
	}
	return items
}

export function getComponentsForCategory(category: ResourceCategory): ComponentDefinition[] {
	return components.filter((c) => c.recipe.some((r) => r.category === category))
}

export function getComponentsForStat(statKey: string): ComponentDefinition[] {
	return components.filter((c) => c.stats.some((s) => s.key === statKey))
}
