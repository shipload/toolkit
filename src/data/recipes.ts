import {MODULE_ENGINE, MODULE_GENERATOR, ITEM_ENGINE_T1, ITEM_GENERATOR_T1} from '../capabilities/modules'
import type {ResourceCategory} from '../types'

export {ITEM_ENGINE_T1, ITEM_GENERATOR_T1}

export const ITEM_HULL_PLATES = 10001
export const ITEM_CARGO_LINING = 10002
export const ITEM_CONTAINER_PACKED = 10003
export const ITEM_THRUSTER_CORE = 10004
export const ITEM_POWER_CELL = 10005
export const ITEM_SHIP_T1_PACKED = 10008

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
	usedIn: {type: 'entity' | 'module'; name: string}[]
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
	type: 'component' | 'entity' | 'module'
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
		usedIn: [{type: 'entity', name: 'Container'}, {type: 'entity', name: 'Ship T1'}],
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
		usedIn: [{type: 'entity', name: 'Container'}, {type: 'entity', name: 'Ship T1'}],
	},
	{
		id: ITEM_THRUSTER_CORE,
		name: 'Thruster Core',
		description: 'High-energy propulsion component formed from volatile gases.',
		color: '#E86344',
		mass: 50000,
		stats: [
			{key: 'volatility', source: 'gas'},
			{key: 'thermal', source: 'gas'},
		],
		recipe: [{category: 'gas' as ResourceCategory, quantity: 30}],
		usedIn: [{type: 'module', name: 'Engine Module T1'}],
	},
	{
		id: ITEM_POWER_CELL,
		name: 'Power Cell',
		description: 'Crystalline energy storage matrix formed from resonant minerals.',
		color: '#7B5AE8',
		mass: 30000,
		stats: [
			{key: 'resonance', source: 'mineral'},
			{key: 'clarity', source: 'mineral'},
		],
		recipe: [{category: 'mineral' as ResourceCategory, quantity: 30}],
		usedIn: [{type: 'module', name: 'Generator Module T1'}],
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
	{
		id: 'ship-t1',
		name: 'Ship T1',
		description: 'General-purpose vessel with 5 module slots.',
		color: '#4AE898',
		packedItemId: ITEM_SHIP_T1_PACKED,
		recipe: [
			{itemId: ITEM_HULL_PLATES, quantity: 12},
			{itemId: ITEM_CARGO_LINING, quantity: 4},
		],
		stats: [
			{key: 'strength', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'strength'},
			{key: 'density', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'density'},
			{key: 'ductility', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'ductility'},
			{key: 'purity', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'purity'},
		],
	},
]

export interface ModuleRecipe {
	id: string
	name: string
	description: string
	color: string
	itemId: number
	moduleType: number
	recipe: RecipeInput[]
	stats: {key: string; sourceComponentId: number; sourceStatKey: string}[]
}

export const moduleRecipes: ModuleRecipe[] = [
	{
		id: 'engine-t1',
		name: 'Engine Module T1',
		description: 'Basic propulsion system. Converts volatile gases into thrust.',
		color: '#E86344',
		itemId: ITEM_ENGINE_T1,
		moduleType: MODULE_ENGINE,
		recipe: [{itemId: ITEM_THRUSTER_CORE, quantity: 6}],
		stats: [
			{key: 'volatility', sourceComponentId: ITEM_THRUSTER_CORE, sourceStatKey: 'volatility'},
			{key: 'thermal', sourceComponentId: ITEM_THRUSTER_CORE, sourceStatKey: 'thermal'},
		],
	},
	{
		id: 'generator-t1',
		name: 'Generator Module T1',
		description: 'Basic energy system. Stores and recharges energy from resonant minerals.',
		color: '#7B5AE8',
		itemId: ITEM_GENERATOR_T1,
		moduleType: MODULE_GENERATOR,
		recipe: [{itemId: ITEM_POWER_CELL, quantity: 5}],
		stats: [
			{key: 'resonance', sourceComponentId: ITEM_POWER_CELL, sourceStatKey: 'resonance'},
			{key: 'clarity', sourceComponentId: ITEM_POWER_CELL, sourceStatKey: 'clarity'},
		],
	},
]

export function getModuleRecipe(id: string): ModuleRecipe | undefined {
	return moduleRecipes.find((r) => r.id === id)
}

export function getModuleRecipeByItemId(itemId: number): ModuleRecipe | undefined {
	return moduleRecipes.find((r) => r.itemId === itemId)
}

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
	for (const mod of moduleRecipes) {
		items.push({type: 'module', id: mod.id, name: mod.name, description: mod.description, color: mod.color})
	}
	return items
}

export function getComponentsForCategory(category: ResourceCategory): ComponentDefinition[] {
	return components.filter((c) => c.recipe.some((r) => r.category === category))
}

export function getComponentsForStat(statKey: string): ComponentDefinition[] {
	return components.filter((c) => c.stats.some((s) => s.key === statKey))
}
