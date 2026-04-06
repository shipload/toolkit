import {MODULE_ANY, MODULE_ENGINE, MODULE_GENERATOR, MODULE_EXTRACTOR, MODULE_LOADER, MODULE_CRAFTER, ITEM_ENGINE_T1, ITEM_GENERATOR_T1, ITEM_EXTRACTOR_T1, ITEM_LOADER_T1, ITEM_MANUFACTURING_T1} from '../capabilities/modules'
import type {ResourceCategory} from '../types'

export {ITEM_ENGINE_T1, ITEM_GENERATOR_T1, ITEM_EXTRACTOR_T1, ITEM_LOADER_T1, ITEM_MANUFACTURING_T1}

export const ITEM_DRILL_SHAFT = 10009
export const ITEM_EXTRACTION_PROBE = 10010
export const ITEM_CARGO_ARM = 10011
export const ITEM_TOOL_BIT = 10012
export const ITEM_REACTION_CHAMBER = 10013

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

export interface ModuleSlot {
	type: number
}

export interface EntityRecipe {
	id: string
	name: string
	description: string
	color: string
	packedItemId: number
	recipe: RecipeInput[]
	stats: {key: string; sourceComponentId: number; sourceStatKey: string}[]
	moduleSlots?: ModuleSlot[]
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
		recipe: [{category: 'metal', quantity: 15}],
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
			{category: 'precious', quantity: 6},
			{category: 'organic', quantity: 14},
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
		recipe: [{category: 'gas' as ResourceCategory, quantity: 32}],
		usedIn: [{type: 'module', name: 'Engine'}],
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
		recipe: [{category: 'mineral' as ResourceCategory, quantity: 20}],
		usedIn: [{type: 'module', name: 'Generator'}],
	},
	{
		id: ITEM_DRILL_SHAFT,
		name: 'Drill Shaft',
		description: 'Heavy-duty metal shaft used in extraction equipment.',
		color: '#7B8D9E',
		mass: 50000,
		stats: [
			{key: 'strength', source: 'metal'},
			{key: 'tolerance', source: 'metal'},
		],
		recipe: [{category: 'metal' as ResourceCategory, quantity: 15}],
		usedIn: [{type: 'module', name: 'Extractor'}],
	},
	{
		id: ITEM_EXTRACTION_PROBE,
		name: 'Extraction Probe',
		description: 'Precious metal sensor array for deep resource detection.',
		color: '#D4A843',
		mass: 30000,
		stats: [
			{key: 'conductivity', source: 'precious'},
			{key: 'reflectivity', source: 'precious'},
		],
		recipe: [{category: 'precious' as ResourceCategory, quantity: 10}],
		usedIn: [{type: 'module', name: 'Extractor'}],
	},
	{
		id: ITEM_CARGO_ARM,
		name: 'Cargo Arm',
		description: 'Flexible organic composite arm for cargo handling.',
		color: '#6B8E5A',
		mass: 30000,
		stats: [
			{key: 'plasticity', source: 'organic'},
			{key: 'insulation', source: 'organic'},
		],
		recipe: [{category: 'organic' as ResourceCategory, quantity: 32}],
		usedIn: [{type: 'module', name: 'Loader'}],
	},
	{
		id: ITEM_TOOL_BIT,
		name: 'Tool Bit',
		description: 'Dense mineral cutting head for manufacturing operations.',
		color: '#B8A9C9',
		mass: 30000,
		stats: [
			{key: 'hardness', source: 'mineral'},
			{key: 'clarity', source: 'mineral'},
		],
		recipe: [{category: 'mineral' as ResourceCategory, quantity: 20}],
		usedIn: [{type: 'module', name: 'Manufacturing'}],
	},
	{
		id: ITEM_REACTION_CHAMBER,
		name: 'Reaction Chamber',
		description: 'Gas-pressurized vessel for controlled manufacturing reactions.',
		color: '#7EC8E3',
		mass: 50000,
		stats: [
			{key: 'reactivity', source: 'gas'},
			{key: 'thermal', source: 'gas'},
		],
		recipe: [{category: 'gas' as ResourceCategory, quantity: 32}],
		usedIn: [{type: 'module', name: 'Manufacturing'}],
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
			{itemId: ITEM_HULL_PLATES, quantity: 8},
			{itemId: ITEM_CARGO_LINING, quantity: 4},
		],
		stats: [
			{key: 'strength', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'strength'},
			{key: 'density', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'density'},
			{key: 'ductility', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'ductility'},
			{key: 'purity', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'purity'},
		],
		moduleSlots: [
			{type: MODULE_ANY},
			{type: MODULE_ANY},
			{type: MODULE_ANY},
			{type: MODULE_ANY},
			{type: MODULE_ANY},
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
		name: 'Engine',
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
		name: 'Generator',
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
	{
		id: 'extractor-t1',
		name: 'Extractor',
		description: 'Basic extraction system. Drills and probes for raw resources.',
		color: '#7B8D9E',
		itemId: ITEM_EXTRACTOR_T1,
		moduleType: MODULE_EXTRACTOR,
		recipe: [
			{itemId: ITEM_DRILL_SHAFT, quantity: 4},
			{itemId: ITEM_EXTRACTION_PROBE, quantity: 3},
		],
		stats: [
			{key: 'strength', sourceComponentId: ITEM_DRILL_SHAFT, sourceStatKey: 'strength'},
			{key: 'tolerance', sourceComponentId: ITEM_DRILL_SHAFT, sourceStatKey: 'tolerance'},
			{key: 'reflectivity', sourceComponentId: ITEM_EXTRACTION_PROBE, sourceStatKey: 'reflectivity'},
			{key: 'conductivity', sourceComponentId: ITEM_EXTRACTION_PROBE, sourceStatKey: 'conductivity'},
			{key: 'reflectivity_drill', sourceComponentId: ITEM_EXTRACTION_PROBE, sourceStatKey: 'reflectivity'},
		],
	},
	{
		id: 'loader-t1',
		name: 'Loader',
		description: 'Basic cargo handling system. Loads and unloads cargo with articulated arms.',
		color: '#6B8E5A',
		itemId: ITEM_LOADER_T1,
		moduleType: MODULE_LOADER,
		recipe: [
			{itemId: ITEM_CARGO_LINING, quantity: 3},
			{itemId: ITEM_CARGO_ARM, quantity: 3},
		],
		stats: [
			{key: 'ductility', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'ductility'},
			{key: 'plasticity', sourceComponentId: ITEM_CARGO_ARM, sourceStatKey: 'plasticity'},
		],
	},
	{
		id: 'manufacturing-t1',
		name: 'Manufacturing',
		description: 'Basic crafting system. Processes materials using reaction chambers and cutting tools.',
		color: '#7EC8E3',
		itemId: ITEM_MANUFACTURING_T1,
		moduleType: MODULE_CRAFTER,
		recipe: [
			{itemId: ITEM_TOOL_BIT, quantity: 3},
			{itemId: ITEM_REACTION_CHAMBER, quantity: 3},
		],
		stats: [
			{key: 'reactivity', sourceComponentId: ITEM_REACTION_CHAMBER, sourceStatKey: 'reactivity'},
			{key: 'clarity', sourceComponentId: ITEM_TOOL_BIT, sourceStatKey: 'clarity'},
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
